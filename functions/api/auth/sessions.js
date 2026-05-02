import {
  cleanString,
  createId,
  getClientIp,
  getDb,
  handleOptions,
  HttpError,
  json,
  optionalJson,
  parseBoolean,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const staffId = cleanString(url.searchParams.get("staffId"), 128);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);

    const result = await db.prepare(
      `SELECT
        id, staff_account_id, branch_id, mfa_verified_at, issued_at,
        expires_at, revoked_at, metadata_json
      FROM staff_sessions
      WHERE (? IS NULL OR staff_account_id = ?)
        AND (? IS NULL OR branch_id = ?)
      ORDER BY issued_at DESC
      LIMIT 100`
    ).bind(staffId, staffId, branchId, branchId).all();

    return json(context, {
      ok: true,
      sessions: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const body = await readJson(context);
    const staffId = requiredString(body.staffId, "staffId", 128);
    const rawSessionToken = requiredString(body.sessionToken, "sessionToken", 500);
    const expiresAt = requiredString(body.expiresAt, "expiresAt", 40);
    const staff = await db.prepare(
      "SELECT id, status, mfa_required FROM staff_accounts WHERE id = ?"
    ).bind(staffId).first();

    if (!staff || staff.status !== "active") {
      throw new HttpError(400, "VALIDATION_ERROR", "staffId must reference an active staff account.");
    }

    const mfaVerified = parseBoolean(body.mfaVerified);
    if (staff.mfa_required && !mfaVerified) {
      throw new HttpError(400, "MFA_REQUIRED", "MFA verification is required before creating a staff session.");
    }

    const sessionId = createId("session");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    await db.prepare(
      `INSERT INTO staff_sessions (
        id, staff_account_id, branch_id, session_token_hash, mfa_verified_at,
        expires_at, ip_hash, user_agent_hash, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sessionId,
      staffId,
      cleanString(body.branchId, 128),
      await hashValue(rawSessionToken, pepper),
      mfaVerified ? new Date().toISOString() : null,
      expiresAt,
      await hashValue(getClientIp(context), pepper),
      await hashValue(context.request.headers.get("User-Agent"), pepper),
      optionalJson(body.metadata)
    ).run();

    await db.prepare(
      "UPDATE staff_accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(staffId).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId: cleanString(body.branchId, 128),
      actorType: actor.role,
      action: "auth.session.create",
      resourceType: "staff_session",
      resourceId: sessionId,
      phiScope: "none",
      metadata: {
        staffId,
        mfaVerified
      }
    });

    return json(context, {
      ok: true,
      session: {
        id: sessionId,
        staffId,
        branchId: cleanString(body.branchId, 128),
        expiresAt,
        mfaVerified
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
