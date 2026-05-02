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

    const result = await db.prepare(
      `SELECT * FROM onboarding_tasks
      WHERE ? IS NULL OR branch_id = ?
      ORDER BY
        CASE status WHEN 'blocked' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'todo' THEN 3 WHEN 'done' THEN 4 ELSE 5 END,
        due_on`
    ).bind(branchId, branchId).all();

    return json(context, {
      ok: true,
      onboardingTasks: result.results || []
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
    const taskId = cleanString(body.id, 128) || createId("onboard");
    const status = cleanString(body.status, 20) || "todo";

    await db.prepare(
      `INSERT INTO onboarding_tasks (
        id, branch_id, task_key, title, owner_role, status, due_on,
        completed_at, evidence_uri, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(branch_id, task_key) DO UPDATE SET
        title = excluded.title,
        owner_role = excluded.owner_role,
        status = excluded.status,
        due_on = excluded.due_on,
        completed_at = excluded.completed_at,
        evidence_uri = excluded.evidence_uri,
        metadata_json = excluded.metadata_json`
    ).bind(
      taskId,
      branchId,
      requiredString(body.taskKey, "taskKey", 120),
      requiredString(body.title, "title", 180),
      cleanString(body.ownerRole, 40) || "admin",
      status,
      cleanString(body.dueOn, 40),
      status === "done" ? (cleanString(body.completedAt, 40) || new Date().toISOString()) : cleanString(body.completedAt, 40),
      cleanString(body.evidenceUri, 500),
      optionalJson(body.metadata)
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "onboarding_task.upsert",
      resourceType: "onboarding_task",
      resourceId: taskId,
      phiScope: "none",
      metadata: {
        taskKey: body.taskKey,
        status
      }
    });

    return json(context, {
      ok: true,
      onboardingTask: {
        id: taskId,
        branchId,
        taskKey: body.taskKey,
        status
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
