import {
  cleanString,
  getDb,
  handleOptions,
  HttpError,
  json,
  parseNumber,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    const action = cleanString(url.searchParams.get("action"), 120);
    const resourceType = cleanString(url.searchParams.get("resourceType"), 80);
    const limit = Math.min(parseNumber(url.searchParams.get("limit") || 100, "limit", { positive: true }), 1000);
    const clauses = [];
    const binds = [];

    if (branchId) {
      clauses.push("branch_id = ?");
      binds.push(branchId);
    }
    if (action) {
      clauses.push("action = ?");
      binds.push(action);
    }
    if (resourceType) {
      clauses.push("resource_type = ?");
      binds.push(resourceType);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await db.prepare(
      `SELECT * FROM audit_events ${where} ORDER BY created_at DESC LIMIT ?`
    ).bind(...binds, limit).all();

    return json(context, {
      ok: true,
      auditEvents: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const body = await readJson(context);
    const action = requiredString(body.action, "action", 120);
    const resourceType = requiredString(body.resourceType, "resourceType", 80);
    const outcome = cleanString(body.outcome, 20) || "success";
    const phiScope = cleanString(body.phiScope, 20) || "none";

    if (!["success", "failure", "denied"].includes(outcome)) {
      throw new HttpError(400, "VALIDATION_ERROR", "outcome must be success, failure, or denied.");
    }
    if (!["none", "referenced", "changed", "exported"].includes(phiScope)) {
      throw new HttpError(400, "VALIDATION_ERROR", "phiScope must be none, referenced, changed, or exported.");
    }

    const auditId = await writeAuditEvent(context, db, {
      branchId: cleanString(body.branchId, 128),
      actorType: actor.role,
      actorId: actor.id,
      action,
      resourceType,
      resourceId: cleanString(body.resourceId, 180),
      outcome,
      phiScope,
      metadata: body.metadata || {}
    });

    return json(context, {
      ok: true,
      auditEvent: {
        id: auditId
      }
    }, { status: 201, methods: METHODS });
  });
}
