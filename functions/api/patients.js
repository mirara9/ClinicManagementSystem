import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  readJson,
  requiredString,
  runEndpoint
} from "../_lib/http.js";
import { hashValue, writeAuditEvent } from "../_lib/audit.js";
import { requireBranchAccess } from "../_lib/access.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "front_desk", "billing", "staff"]);
    const search = cleanString(url.searchParams.get("q"), 120);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);

    const result = patientId
      ? await db.prepare(
        "SELECT * FROM patients WHERE branch_id = ? AND id = ? LIMIT 1"
      ).bind(branchId, patientId).all()
      : search
        ? await db.prepare(
          `SELECT * FROM patients
          WHERE branch_id = ?
            AND status <> 'merged'
            AND (full_name LIKE ? OR phone_e164 LIKE ? OR external_ref LIKE ?)
          ORDER BY updated_at DESC
          LIMIT 50`
        ).bind(branchId, `%${search}%`, `%${search}%`, `%${search}%`).all()
        : await db.prepare(
          `SELECT * FROM patients
          WHERE branch_id = ? AND status <> 'merged'
          ORDER BY updated_at DESC
          LIMIT 100`
        ).bind(branchId).all();

    return json(context, {
      ok: true,
      patients: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "front_desk", "staff"]);
    const patientId = cleanString(body.id, 128) || createId("patient");
    const fullName = requiredString(body.fullName, "fullName", 180);
    const consentPdpaAt = cleanString(body.consentPdpaAt, 40);
    const privacyNoticeVersion = cleanString(body.privacyNoticeVersion, 80);
    const history = Array.isArray(body.medicalHistory) ? body.medicalHistory : [];
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    const statements = [
      db.prepare(
        `INSERT INTO patients (
          id, branch_id, external_ref, full_name, preferred_name, national_id_last4,
          date_of_birth, sex, phone_e164, email, address_json, emergency_contact_json,
          consent_pdpa_at, consent_marketing_at, privacy_notice_version, status,
          registered_source, primary_panel_provider_id, medical_alerts_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          branch_id = excluded.branch_id,
          external_ref = excluded.external_ref,
          full_name = excluded.full_name,
          preferred_name = excluded.preferred_name,
          national_id_last4 = excluded.national_id_last4,
          date_of_birth = excluded.date_of_birth,
          sex = excluded.sex,
          phone_e164 = excluded.phone_e164,
          email = excluded.email,
          address_json = excluded.address_json,
          emergency_contact_json = excluded.emergency_contact_json,
          consent_pdpa_at = excluded.consent_pdpa_at,
          consent_marketing_at = excluded.consent_marketing_at,
          privacy_notice_version = excluded.privacy_notice_version,
          status = excluded.status,
          registered_source = excluded.registered_source,
          primary_panel_provider_id = excluded.primary_panel_provider_id,
          medical_alerts_json = excluded.medical_alerts_json`
      ).bind(
        patientId,
        branchId,
        cleanString(body.externalRef, 80),
        fullName,
        cleanString(body.preferredName, 120),
        cleanString(body.nationalIdLast4, 4),
        cleanString(body.dateOfBirth, 20),
        cleanString(body.sex, 20) || "unknown",
        cleanString(body.phoneE164, 40),
        cleanString(body.email, 160),
        optionalJson(body.address),
        optionalJson(body.emergencyContact),
        consentPdpaAt,
        cleanString(body.consentMarketingAt, 40),
        privacyNoticeVersion,
        cleanString(body.status, 20) || "active",
        cleanString(body.registeredSource, 40) || "counter",
        cleanString(body.primaryPanelProviderId, 128),
        optionalJson(body.medicalAlerts)
      )
    ];

    for (const entry of history) {
      statements.push(
        db.prepare(
          `INSERT INTO patient_medical_history (
            id, branch_id, patient_id, entry_type, title, details_text, severity,
            onset_on, status, recorded_by_hash, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(entry.id, 128) || createId("history"),
          branchId,
          patientId,
          cleanString(entry.entryType, 40) || "condition",
          requiredString(entry.title, "medicalHistory.title", 180),
          cleanString(entry.detailsText, 1000),
          cleanString(entry.severity, 40),
          cleanString(entry.onsetOn, 40),
          cleanString(entry.status, 40) || "active",
          await hashValue(actor.id, pepper),
          optionalJson(entry.metadata)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "patient.upsert",
      resourceType: "patient",
      resourceId: patientId,
      phiScope: "changed",
      metadata: {
        registeredSource: cleanString(body.registeredSource, 40) || "counter",
        historyEntries: history.length,
        hasPdpaConsent: Boolean(consentPdpaAt && privacyNoticeVersion)
      }
    });

    return json(context, {
      ok: true,
      patient: {
        id: patientId,
        branchId,
        fullName,
        status: cleanString(body.status, 20) || "active"
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
