import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  parseBoolean,
  HttpError,
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
    const db = getDb(context);
    const url = new URL(context.request.url);
    const includeInactive = parseBoolean(url.searchParams.get("includeInactive"));
    const query = includeInactive
      ? "SELECT * FROM branches ORDER BY name"
      : "SELECT * FROM branches WHERE status = 'active' ORDER BY name";
    const result = await db.prepare(query).all();

    return json(context, {
      ok: true,
      branches: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = cleanString(body.id, 128) || createId("branch");
    const code = requiredString(body.code, "code", 40).toUpperCase();
    const name = requiredString(body.name, "name", 160);
    const status = cleanString(body.status, 20) || "active";

    if (!["active", "inactive", "pending"].includes(status)) {
      throw new HttpError(400, "VALIDATION_ERROR", "status must be active, inactive, or pending.");
    }

    await db.prepare(
      `INSERT INTO branches (
        id, code, name, registration_number, phone, email, address_json, timezone, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        branchId,
        code,
        name,
        cleanString(body.registrationNumber, 80),
        cleanString(body.phone, 80),
        cleanString(body.email, 120),
        optionalJson(body.address),
        cleanString(body.timezone, 80) || "Asia/Kuala_Lumpur",
        status
      )
      .run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      action: "branch.create",
      resourceType: "branch",
      resourceId: branchId,
      phiScope: "none",
      metadata: {
        code,
        status
      }
    });

    return json(context, {
      ok: true,
      branch: {
        id: branchId,
        code,
        name,
        status
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
