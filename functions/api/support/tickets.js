import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  readJson,
  requiredString,
  requireRole,
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
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    if (branchId) {
      await requireBranchAccess(context, db, branchId, ["owner", "admin", "support", "staff"]);
    } else {
      requireRole(context, ["owner", "support"]);
    }
    const status = cleanString(url.searchParams.get("status"), 20);

    const result = await db.prepare(
      `SELECT * FROM support_tickets
      WHERE (? IS NULL OR branch_id = ?)
        AND (? IS NULL OR status = ?)
      ORDER BY
        CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
        created_at DESC
      LIMIT 100`
    ).bind(branchId, branchId, status, status).all();

    return json(context, {
      ok: true,
      supportTickets: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = cleanString(body.branchId, 128);
    const actor = branchId
      ? await requireBranchAccess(context, db, branchId, ["owner", "admin", "support", "staff"])
      : requireRole(context, ["owner", "support"]);
    const ticketId = cleanString(body.id, 128) || createId("ticket");

    await db.prepare(
      `INSERT INTO support_tickets (
        id, branch_id, requester_staff_id, support_plan, subject,
        description_text, priority, status, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ticketId,
      branchId,
      cleanString(body.requesterStaffId, 128) || actor.id,
      cleanString(body.supportPlan, 20) || "standard",
      requiredString(body.subject, "subject", 180),
      cleanString(body.descriptionText, 4000),
      cleanString(body.priority, 20) || "normal",
      cleanString(body.status, 20) || "open",
      optionalJson(body.metadata)
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "support_ticket.create",
      resourceType: "support_ticket",
      resourceId: ticketId,
      phiScope: "none",
      metadata: {
        supportPlan: body.supportPlan || "standard",
        priority: body.priority || "normal"
      }
    });

    return json(context, {
      ok: true,
      supportTicket: {
        id: ticketId,
        branchId,
        status: cleanString(body.status, 20) || "open"
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
