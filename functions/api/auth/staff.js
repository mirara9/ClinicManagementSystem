import {
  cleanString,
  createId,
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
import { writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";
const STAFF_ROLES = ["owner", "admin", "doctor", "nurse", "pharmacist", "front_desk", "billing", "support", "staff"];
const STAFF_STATUSES = ["invited", "active", "suspended", "offboarded"];

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = cleanString(url.searchParams.get("branchId"), 128);
    const status = cleanString(url.searchParams.get("status"), 20);

    const query = branchId
      ? `SELECT
          s.id, s.display_name, s.email, s.phone_e164, s.role, s.status,
          s.mfa_required, s.external_idp_subject, s.last_login_at,
          a.branch_id, a.role_at_branch, a.status AS assignment_status
        FROM staff_accounts s
        JOIN staff_branch_assignments a ON a.staff_account_id = s.id
        WHERE a.branch_id = ? AND (? IS NULL OR s.status = ?)
        ORDER BY s.display_name`
      : `SELECT
          s.id, s.display_name, s.email, s.phone_e164, s.role, s.status,
          s.mfa_required, s.external_idp_subject, s.last_login_at
        FROM staff_accounts s
        WHERE ? IS NULL OR s.status = ?
        ORDER BY s.display_name`;

    const result = branchId
      ? await db.prepare(query).bind(branchId, status, status).all()
      : await db.prepare(query).bind(status, status).all();

    return json(context, {
      ok: true,
      staff: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const body = await readJson(context);
    const staffId = cleanString(body.id, 128) || createId("staff");
    const displayName = requiredString(body.displayName, "displayName", 180);
    const role = cleanString(body.role, 40) || "staff";
    const status = cleanString(body.status, 20) || "invited";
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];

    if (!STAFF_ROLES.includes(role)) {
      throw new HttpError(400, "VALIDATION_ERROR", "role is not supported.");
    }

    if (!STAFF_STATUSES.includes(status)) {
      throw new HttpError(400, "VALIDATION_ERROR", "status is not supported.");
    }

    const statements = [
      db.prepare(
        `INSERT INTO staff_accounts (
          id, display_name, email, phone_e164, role, status, mfa_required,
          external_idp_subject, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          display_name = excluded.display_name,
          email = excluded.email,
          phone_e164 = excluded.phone_e164,
          role = excluded.role,
          status = excluded.status,
          mfa_required = excluded.mfa_required,
          external_idp_subject = excluded.external_idp_subject,
          metadata_json = excluded.metadata_json`
      ).bind(
        staffId,
        displayName,
        cleanString(body.email, 160),
        cleanString(body.phoneE164, 40),
        role,
        status,
        parseBoolean(body.mfaRequired ?? true) ? 1 : 0,
        cleanString(body.externalIdpSubject, 180),
        optionalJson(body.metadata)
      )
    ];

    for (const assignment of assignments) {
      const branchId = requiredString(assignment.branchId, "assignments.branchId", 128);
      const roleAtBranch = cleanString(assignment.roleAtBranch, 40) || role;

      if (!STAFF_ROLES.includes(roleAtBranch)) {
        throw new HttpError(400, "VALIDATION_ERROR", "assignments.roleAtBranch is not supported.");
      }

      statements.push(
        db.prepare(
          `INSERT INTO staff_branch_assignments (
            id, staff_account_id, branch_id, role_at_branch, status, starts_at, ends_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(staff_account_id, branch_id, role_at_branch) DO UPDATE SET
            status = excluded.status,
            starts_at = excluded.starts_at,
            ends_at = excluded.ends_at`
        ).bind(
          cleanString(assignment.id, 128) || createId("assign"),
          staffId,
          branchId,
          roleAtBranch,
          cleanString(assignment.status, 20) || "active",
          cleanString(assignment.startsAt, 40),
          cleanString(assignment.endsAt, 40)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId: assignments.length === 1 ? cleanString(assignments[0].branchId, 128) : null,
      actorType: actor.role,
      action: "staff.upsert",
      resourceType: "staff_account",
      resourceId: staffId,
      phiScope: "none",
      metadata: {
        role,
        status,
        assignmentCount: assignments.length
      }
    });

    return json(context, {
      ok: true,
      staff: {
        id: staffId,
        displayName,
        role,
        status,
        assignments: assignments.length
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
