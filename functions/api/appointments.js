import {
  cleanString,
  createId,
  getActor,
  getDb,
  handleOptions,
  HttpError,
  json,
  optionalJson,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../_lib/http.js";
import { writeAuditEvent } from "../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    const status = cleanString(url.searchParams.get("status"), 20);
    const from = cleanString(url.searchParams.get("from"), 40) || "0000-01-01T00:00:00.000Z";
    const to = cleanString(url.searchParams.get("to"), 40) || "9999-12-31T23:59:59.999Z";

    const result = status
      ? await db.prepare(
        `SELECT
          a.*,
          p.full_name AS patient_full_name,
          p.phone_e164 AS patient_phone_e164
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.branch_id = ? AND a.status = ? AND a.scheduled_start BETWEEN ? AND ?
        ORDER BY a.scheduled_start`
      ).bind(branchId, status, from, to).all()
      : await db.prepare(
        `SELECT
          a.*,
          p.full_name AS patient_full_name,
          p.phone_e164 AS patient_phone_e164
        FROM appointments a
        JOIN patients p ON p.id = a.patient_id
        WHERE a.branch_id = ? AND a.scheduled_start BETWEEN ? AND ?
        ORDER BY a.scheduled_start`
      ).bind(branchId, from, to).all();

    return json(context, {
      ok: true,
      appointments: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = getActor(context);
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const patient = body.patient || {};
    const appointment = body.appointment || body;
    const patientId = cleanString(patient.id, 128) || createId("patient");
    const fullName = requiredString(patient.fullName, "patient.fullName", 180);
    const consentPdpaAt = cleanString(patient.consentPdpaAt, 40);
    const privacyNoticeVersion = cleanString(patient.privacyNoticeVersion, 80);

    if (!consentPdpaAt || !privacyNoticeVersion) {
      throw new HttpError(400, "VALIDATION_ERROR", "Patient PDPA consent timestamp and privacy notice version are required.");
    }

    const appointmentId = createId("appt");
    const serviceCode = cleanString(appointment.serviceCode, 80) || "general-consultation";
    const serviceLabel = cleanString(appointment.serviceLabel, 160) || "General consultation";
    const scheduledStart = requiredString(appointment.scheduledStart, "appointment.scheduledStart", 40);
    const scheduledEnd = cleanString(appointment.scheduledEnd, 40);
    const source = cleanString(appointment.source, 20) || "web";
    const bookedByType = ["owner", "admin", "staff"].includes(actor.role) ? actor.role : "patient";
    const deposit = body.deposit || appointment.deposit || {};
    const depositRequired = deposit.required !== false;
    const depositAmountCents = Number.parseInt(deposit.amountCents ?? "1000", 10);
    const depositCurrency = cleanString(deposit.currency, 3) || "MYR";
    const depositPaymentMethod = cleanString(deposit.method || deposit.paymentMethod, 20) || "fpx";
    const depositId = depositRequired ? createId("deposit") : undefined;

    if (!["web", "counter", "phone", "whatsapp", "import"].includes(source)) {
      throw new HttpError(400, "VALIDATION_ERROR", "appointment.source is not supported.");
    }

    if (depositRequired && (!Number.isFinite(depositAmountCents) || depositAmountCents <= 0)) {
      throw new HttpError(400, "VALIDATION_ERROR", "deposit.amountCents must be a positive integer.");
    }

    if (depositRequired && depositCurrency !== "MYR") {
      throw new HttpError(400, "VALIDATION_ERROR", "Only MYR deposits are supported.");
    }

    if (depositRequired && !["fpx", "card", "ewallet", "counter"].includes(depositPaymentMethod)) {
      throw new HttpError(400, "VALIDATION_ERROR", "deposit.method is not supported.");
    }

    const writes = [
      db.prepare(
        `INSERT INTO patients (
          id, branch_id, external_ref, full_name, preferred_name, national_id_last4,
          date_of_birth, sex, phone_e164, email, address_json, emergency_contact_json,
          consent_pdpa_at, consent_marketing_at, privacy_notice_version, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ON CONFLICT(id) DO UPDATE SET
          branch_id = excluded.branch_id,
          external_ref = excluded.external_ref,
          full_name = excluded.full_name,
          preferred_name = excluded.preferred_name,
          phone_e164 = excluded.phone_e164,
          email = excluded.email,
          address_json = excluded.address_json,
          emergency_contact_json = excluded.emergency_contact_json,
          consent_pdpa_at = excluded.consent_pdpa_at,
          consent_marketing_at = excluded.consent_marketing_at,
          privacy_notice_version = excluded.privacy_notice_version`
      ).bind(
        patientId,
        branchId,
        cleanString(patient.externalRef, 80),
        fullName,
        cleanString(patient.preferredName, 120),
        cleanString(patient.nationalIdLast4, 4),
        cleanString(patient.dateOfBirth, 20),
        cleanString(patient.sex, 20) || "unknown",
        cleanString(patient.phoneE164, 40),
        cleanString(patient.email, 160),
        optionalJson(patient.address),
        optionalJson(patient.emergencyContact),
        consentPdpaAt,
        cleanString(patient.consentMarketingAt, 40),
        privacyNoticeVersion
      ),
      db.prepare(
        `INSERT INTO appointments (
          id, branch_id, patient_id, booked_by_type, source, service_code,
          service_label, scheduled_start, scheduled_end, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested')`
      ).bind(
        appointmentId,
        branchId,
        patientId,
        bookedByType,
        source,
        serviceCode,
        serviceLabel,
        scheduledStart,
        scheduledEnd
      )
    ];

    if (depositRequired) {
      writes.push(
        db.prepare(
          `INSERT INTO appointment_deposits (
            id, appointment_id, branch_id, amount_cents, currency, status, payment_method, provider_reference
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`
        ).bind(
          depositId,
          appointmentId,
          branchId,
          depositAmountCents,
          depositCurrency,
          depositPaymentMethod,
          cleanString(deposit.providerReference, 160)
        )
      );
    }

    await db.batch(writes);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id || patientId,
      action: "appointment.request",
      resourceType: "appointment",
      resourceId: appointmentId,
      phiScope: "changed",
      metadata: {
        source,
        serviceCode,
        bookedByType,
        depositRequired,
        depositAmountCents: depositRequired ? depositAmountCents : undefined
      }
    });

    return json(context, {
      ok: true,
      appointment: {
        id: appointmentId,
        branchId,
        patientId,
        status: "requested",
        scheduledStart,
        scheduledEnd,
        serviceCode,
        serviceLabel
      },
      deposit: depositRequired
        ? {
          id: depositId,
          appointmentId,
          branchId,
          amountCents: depositAmountCents,
          currency: depositCurrency,
          status: "pending",
          paymentMethod: depositPaymentMethod
        }
        : undefined,
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
