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
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "front_desk", "billing", "staff"]);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);
    const status = cleanString(url.searchParams.get("status"), 20);

    const invoices = await db.prepare(
      `SELECT
        i.*,
        p.full_name AS patient_full_name,
        panel.name AS panel_name,
        m.status AS myinvois_status,
        m.lhdn_uuid
      FROM invoices i
      LEFT JOIN patients p ON p.id = i.patient_id
      LEFT JOIN panel_providers panel ON panel.id = i.panel_provider_id
      LEFT JOIN myinvois_submissions m ON m.invoice_id = i.id
      WHERE i.branch_id = ?
        AND (? IS NULL OR i.patient_id = ?)
        AND (? IS NULL OR i.status = ?)
      ORDER BY i.created_at DESC
      LIMIT 100`
    ).bind(branchId, patientId, patientId, status, status).all();

    return json(context, {
      ok: true,
      invoices: invoices.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "front_desk", "billing", "staff"]);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const invoiceId = cleanString(body.id, 128) || createId("invoice");
    const invoiceNumber = cleanString(body.invoiceNumber, 80) || `INV-${Date.now()}`;
    const currency = cleanString(body.currency, 3) || "MYR";
    const preparedLines = lines.map((line) => {
      const quantity = Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 1;
      const unitPriceCents = Number.isFinite(Number(line.unitPriceCents)) ? Number(line.unitPriceCents) : 0;
      const discountCents = Number.isFinite(Number(line.discountCents)) ? Number(line.discountCents) : 0;
      const taxCents = Number.isFinite(Number(line.taxCents)) ? Number(line.taxCents) : 0;
      const totalCents = Math.max(0, Math.round(quantity * unitPriceCents) - discountCents + taxCents);
      return {
        id: cleanString(line.id, 128) || createId("line"),
        serviceCode: cleanString(line.serviceCode, 80),
        description: requiredString(line.description, "lines.description", 240),
        quantity,
        unitPriceCents,
        discountCents,
        taxCents,
        totalCents,
        metadata: line.metadata
      };
    });
    const subtotalCents = preparedLines.reduce((sum, line) => sum + Math.round(line.quantity * line.unitPriceCents), 0);
    const discountCents = preparedLines.reduce((sum, line) => sum + line.discountCents, 0);
    const taxCents = preparedLines.reduce((sum, line) => sum + line.taxCents, 0);
    const totalCents = preparedLines.reduce((sum, line) => sum + line.totalCents, 0);
    const status = cleanString(body.status, 20) || "draft";

    const statements = [
      db.prepare(
        `INSERT INTO invoices (
          id, branch_id, patient_id, visit_id, panel_provider_id, invoice_number,
          status, currency, subtotal_cents, discount_cents, tax_cents,
          total_cents, balance_cents, editable_until, issued_at, due_at,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        invoiceId,
        branchId,
        cleanString(body.patientId, 128),
        cleanString(body.visitId, 128),
        cleanString(body.panelProviderId, 128),
        invoiceNumber,
        status,
        currency,
        subtotalCents,
        discountCents,
        taxCents,
        totalCents,
        totalCents,
        cleanString(body.editableUntil, 40),
        status === "issued" ? (cleanString(body.issuedAt, 40) || new Date().toISOString()) : cleanString(body.issuedAt, 40),
        cleanString(body.dueAt, 40),
        optionalJson(body.metadata)
      )
    ];

    for (const line of preparedLines) {
      statements.push(
        db.prepare(
          `INSERT INTO invoice_lines (
            id, invoice_id, branch_id, service_code, description, quantity,
            unit_price_cents, discount_cents, tax_cents, total_cents,
            metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          line.id,
          invoiceId,
          branchId,
          line.serviceCode,
          line.description,
          line.quantity,
          line.unitPriceCents,
          line.discountCents,
          line.taxCents,
          line.totalCents,
          optionalJson(line.metadata)
        )
      );
    }

    if (body.myInvois?.track !== false) {
      statements.push(
        db.prepare(
          `INSERT INTO myinvois_submissions (
            id, branch_id, invoice_id, submission_type, status, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(body.myInvois?.id, 128) || createId("myinvois"),
          branchId,
          invoiceId,
          cleanString(body.myInvois?.submissionType, 40) || "invoice",
          cleanString(body.myInvois?.status, 40) || "not_submitted",
          optionalJson(body.myInvois?.metadata)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "invoice.create",
      resourceType: "invoice",
      resourceId: invoiceId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        invoiceNumber,
        status,
        lineCount: preparedLines.length,
        totalCents
      }
    });

    return json(context, {
      ok: true,
      invoice: {
        id: invoiceId,
        branchId,
        invoiceNumber,
        status,
        totalCents,
        balanceCents: totalCents,
        currency
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
