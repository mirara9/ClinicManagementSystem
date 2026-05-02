import { cleanString, getActor, HttpError } from "./http.js";

const OWNER_ROLES = new Set(["owner"]);
const STAFF_ROLE_ALIASES = new Set(["staff", "doctor", "nurse", "pharmacist", "front_desk", "billing", "support"]);

export function canUseRole(actorRole, allowedRoles) {
  if (allowedRoles.includes(actorRole)) {
    return true;
  }

  return allowedRoles.some((role) => STAFF_ROLE_ALIASES.has(role)) && actorRole === "staff";
}

export async function requireBranchAccess(context, db, branchId, allowedRoles) {
  const actor = getActor(context);
  const normalizedBranchId = cleanString(branchId, 128);

  if (!normalizedBranchId) {
    throw new HttpError(400, "VALIDATION_ERROR", "branchId is required.");
  }

  if (OWNER_ROLES.has(actor.role) && allowedRoles.includes("owner")) {
    return actor;
  }

  if (!canUseRole(actor.role, allowedRoles)) {
    const status = actor.role === "anonymous" ? 401 : 403;
    const code = actor.role === "anonymous" ? "AUTH_REQUIRED" : "FORBIDDEN";
    throw new HttpError(status, code, "This endpoint requires an authorized UsrahMedic role.");
  }

  if (!actor.id) {
    throw new HttpError(401, "AUTH_REQUIRED", "X-UsrahMedic-Actor-Id is required for branch-scoped access.");
  }

  const assignment = await db.prepare(
    `SELECT
      s.id,
      s.role,
      a.role_at_branch
    FROM staff_accounts s
    JOIN staff_branch_assignments a ON a.staff_account_id = s.id
    WHERE s.id = ?
      AND s.status = 'active'
      AND a.branch_id = ?
      AND a.status = 'active'
      AND (a.ends_at IS NULL OR a.ends_at >= CURRENT_TIMESTAMP)
    LIMIT 1`
  ).bind(actor.id, normalizedBranchId).first();

  if (!assignment && actor.role !== "admin") {
    throw new HttpError(403, "BRANCH_ACCESS_DENIED", "Staff account is not assigned to this branch.");
  }

  if (assignment && !canUseRole(assignment.role_at_branch, allowedRoles) && !canUseRole(assignment.role, allowedRoles)) {
    throw new HttpError(403, "BRANCH_ROLE_DENIED", "Staff account role is not allowed for this branch workflow.");
  }

  return {
    ...actor,
    staffAccountId: assignment ? assignment.id : actor.id,
    branchRole: assignment ? assignment.role_at_branch : actor.role
  };
}

export function appendBranchFilter(url, fieldName = "branchId") {
  return cleanString(url.searchParams.get(fieldName), 128);
}
