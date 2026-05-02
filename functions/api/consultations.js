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
} from "../_lib/http.js";
import { writeAuditEvent } from "../_lib/audit.js";
import { requireBranchAccess } from "../_lib/access.js";

const METHODS = "GET, POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const url = new URL(context.request.url);
    const branchId = requiredString(url.searchParams.get("branchId"), "branchId", 128);
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "staff"]);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);
    const visitId = cleanString(url.searchParams.get("visitId"), 128);

    const result = await db.prepare(
      `SELECT
        c.*,
        p.full_name AS patient_full_name,
        s.display_name AS doctor_name
      FROM consultations c
      JOIN patients p ON p.id = c.patient_id
      LEFT JOIN staff_accounts s ON s.id = c.doctor_staff_id
      WHERE c.branch_id = ?
        AND (? IS NULL OR c.patient_id = ?)
        AND (? IS NULL OR c.visit_id = ?)
      ORDER BY c.created_at DESC
      LIMIT 100`
    ).bind(branchId, patientId, patientId, visitId, visitId).all();

    return json(context, {
      ok: true,
      consultations: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "staff"]);
    const consultationId = cleanString(body.id, 128) || createId("consult");
    const status = cleanString(body.status, 20) || "draft";
    const signedAt = status === "signed" ? (cleanString(body.signedAt, 40) || new Date().toISOString()) : null;

    await db.prepare(
      `INSERT INTO consultations (
        id, branch_id, visit_id, patient_id, doctor_staff_id, clinical_summary,
        diagnosis_text, plan_text, rich_text_json, status, signed_at,
        amended_from_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      consultationId,
      branchId,
      requiredString(body.visitId, "visitId", 128),
      requiredString(body.patientId, "patientId", 128),
      cleanString(body.doctorStaffId, 128) || actor.id,
      cleanString(body.clinicalSummary, 2000),
      cleanString(body.diagnosisText, 2000),
      cleanString(body.planText, 2000),
      optionalJson(body.richText),
      status,
      signedAt,
      cleanString(body.amendedFromId, 128)
    ).run();

    if (status === "signed") {
      await db.prepare(
        "UPDATE patient_visit_records SET status = 'billing' WHERE id = ? AND branch_id = ?"
      ).bind(requiredString(body.visitId, "visitId", 128), branchId).run();
    }

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: status === "signed" ? "consultation.sign" : "consultation.create",
      resourceType: "consultation",
      resourceId: consultationId,
      phiScope: "changed",
      metadata: {
        patientId: body.patientId,
        visitId: body.visitId,
        status
      }
    });

    return json(context, {
      ok: true,
      consultation: {
        id: consultationId,
        branchId,
        visitId: body.visitId,
        patientId: body.patientId,
        status,
        signedAt
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
