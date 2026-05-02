import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  HttpError,
  json,
  optionalJson,
  parseNumber,
  readJson,
  requiredString,
  runEndpoint
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";

const METHODS = "POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const paymentMethod = cleanString(body.paymentMethod, 40) || "cash";
    const status = cleanString(body.status, 20) || "paid";
    const amountCents = Math.round(parseNumber(body.amountCents, "amountCents", { positive: true }));

    if (!["cash", "card", "fpx", "ewallet", "bank_transfer", "panel"].includes(paymentMethod)) {
      throw new HttpError(400, "VALIDATION_ERROR", "paymentMethod is not supported.");
    }

    const paymentId = cleanString(body.id, 128) || createId("payment");
    const invoiceId = cleanString(body.invoiceId, 128);
    const statements = [
      db.prepare(
        `INSERT INTO payments (
          id, branch_id, invoice_id, appointment_deposit_id, patient_id,
          amount_cents, currency, payment_method, status, provider_name,
          provider_reference, received_at, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        paymentId,
        branchId,
        invoiceId,
        cleanString(body.appointmentDepositId, 128),
        cleanString(body.patientId, 128),
        amountCents,
        cleanString(body.currency, 3) || "MYR",
        paymentMethod,
        status,
        cleanString(body.providerName, 80),
        cleanString(body.providerReference, 180),
        status === "paid" ? (cleanString(body.receivedAt, 40) || new Date().toISOString()) : cleanString(body.receivedAt, 40),
        optionalJson(body.metadata)
      )
    ];

    if (invoiceId && status === "paid") {
      statements.push(
        db.prepare(
          `UPDATE invoices
          SET balance_cents = MAX(0, balance_cents - ?),
            status = CASE
              WHEN MAX(0, balance_cents - ?) = 0 THEN 'paid'
              WHEN status = 'issued' THEN 'part_paid'
              ELSE status
            END
          WHERE id = ? AND branch_id = ?`
        ).bind(amountCents, amountCents, invoiceId, branchId)
      );
    }

    if (body.appointmentDepositId && status === "paid") {
      statements.push(
        db.prepare(
          "UPDATE appointment_deposits SET status = 'paid', provider_reference = COALESCE(?, provider_reference) WHERE id = ? AND branch_id = ?"
        ).bind(cleanString(body.providerReference, 180), cleanString(body.appointmentDepositId, 128), branchId)
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "payment.record",
      resourceType: "payment",
      resourceId: paymentId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        invoiceId,
        amountCents,
        status,
        paymentMethod
      }
    });

    return json(context, {
      ok: true,
      payment: {
        id: paymentId,
        branchId,
        invoiceId,
        amountCents,
        status,
        paymentMethod
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
