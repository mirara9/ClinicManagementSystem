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
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "pharmacist", "staff"]);
    const status = cleanString(url.searchParams.get("status"), 20);

    const result = await db.prepare(
      `SELECT * FROM medicine_label_jobs
      WHERE branch_id = ? AND (? IS NULL OR status = ?)
      ORDER BY created_at DESC
      LIMIT 100`
    ).bind(branchId, status, status).all();

    return json(context, {
      ok: true,
      labelJobs: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "pharmacist", "staff"]);
    const labelJobId = cleanString(body.id, 128) || createId("label");
    const status = cleanString(body.status, 20) || "queued";

    await db.prepare(
      `INSERT INTO medicine_label_jobs (
        id, branch_id, dispense_id, patient_id, status, label_payload_json,
        printer_name, printed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      labelJobId,
      branchId,
      cleanString(body.dispenseId, 128),
      cleanString(body.patientId, 128),
      status,
      optionalJson(body.labelPayload),
      cleanString(body.printerName, 120),
      status === "printed" ? (cleanString(body.printedAt, 40) || new Date().toISOString()) : null
    ).run();

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: status === "printed" ? "medicine_label.print" : "medicine_label.queue",
      resourceType: "medicine_label_job",
      resourceId: labelJobId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        status,
        dispenseId: body.dispenseId
      }
    });

    return json(context, {
      ok: true,
      labelJob: {
        id: labelJobId,
        branchId,
        status
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
