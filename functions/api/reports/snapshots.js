import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    if (branchId) {
      await requireBranchAccess(context, db, branchId, ["owner", "admin", "billing", "staff"]);
    } else {
      requireRole(context, ["owner"]);
    }
    const reportType = cleanString(url.searchParams.get("reportType"), 40);

    const result = await db.prepare(
      `SELECT * FROM report_snapshots
      WHERE (? IS NULL OR branch_id = ?)
        AND (? IS NULL OR report_type = ?)
      ORDER BY created_at DESC
      LIMIT 100`
    ).bind(branchId, branchId, reportType, reportType).all();

    return json(context, {
      ok: true,
      reportSnapshots: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = cleanString(body.branchId, 128);
    const actor = branchId
      ? await requireBranchAccess(context, db, branchId, ["owner", "admin", "billing", "staff"])
      : requireRole(context, ["owner"]);
    const reportType = cleanString(body.reportType, 40) || "clinic_daily";
    const periodStart = requiredString(body.periodStart, "periodStart", 40);
    const periodEnd = requiredString(body.periodEnd, "periodEnd", 40);
    const summary = await buildSummary(db, branchId, periodStart, periodEnd);
    const snapshotId = cleanString(body.id, 128) || createId("report");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.prepare(
      `INSERT INTO report_snapshots (
        id, branch_id, report_type, period_start, period_end,
        generated_by_hash, summary_json, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'generated')`
    ).bind(
      snapshotId,
      branchId,
      reportType,
      periodStart,
      periodEnd,
      await hashValue(actor.id, pepper),
      JSON.stringify(summary)
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "report.snapshot.generate",
      resourceType: "report_snapshot",
      resourceId: snapshotId,
      phiScope: "referenced",
      metadata: {
        reportType,
        periodStart,
        periodEnd
      }
    });

    return json(context, {
      ok: true,
      reportSnapshot: {
        id: snapshotId,
        branchId,
        reportType,
        periodStart,
        periodEnd,
        summary
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}

async function buildSummary(db, branchId, periodStart, periodEnd) {
  const binds = branchId ? [branchId, periodStart, periodEnd] : [periodStart, periodEnd];
  const branchClause = branchId ? "branch_id = ? AND " : "";
  const invoice = await first(db,
    `SELECT
      COUNT(*) AS invoice_count,
      COALESCE(SUM(total_cents), 0) AS revenue_cents,
      COALESCE(SUM(balance_cents), 0) AS balance_cents
    FROM invoices
    WHERE ${branchClause}created_at BETWEEN ? AND ?`,
    binds);
  const visits = await first(db,
    `SELECT COUNT(*) AS visit_count FROM patient_visit_records
    WHERE ${branchClause}opened_at BETWEEN ? AND ?`,
    binds);
  const payments = await first(db,
    `SELECT COALESCE(SUM(amount_cents), 0) AS collected_cents FROM payments
    WHERE ${branchClause}created_at BETWEEN ? AND ? AND status = 'paid'`,
    binds);

  return {
    invoiceCount: invoice.invoice_count || 0,
    revenueCents: invoice.revenue_cents || 0,
    balanceCents: invoice.balance_cents || 0,
    visitCount: visits.visit_count || 0,
    collectedCents: payments.collected_cents || 0
  };
}

async function first(db, query, binds) {
  return db.prepare(query).bind(...binds).first();
}
