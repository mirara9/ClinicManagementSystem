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
import { hashValue, writeAuditEvent } from "../_lib/audit.js";
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
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "front_desk", "billing", "staff"]);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);
    const status = cleanString(url.searchParams.get("status"), 20);

    const result = await db.prepare(
      `SELECT
        v.*,
        p.full_name AS patient_full_name,
        q.ticket_code AS queue_ticket_code
      FROM patient_visit_records v
      JOIN patients p ON p.id = v.patient_id
      LEFT JOIN queue_tickets q ON q.id = v.queue_ticket_id
      WHERE v.branch_id = ?
        AND (? IS NULL OR v.patient_id = ?)
        AND (? IS NULL OR v.status = ?)
      ORDER BY v.opened_at DESC
      LIMIT 100`
    ).bind(branchId, patientId, patientId, status, status).all();

    return json(context, {
      ok: true,
      visits: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "front_desk", "staff"]);
    const visitId = cleanString(body.id, 128) || createId("visit");
    const patientId = requiredString(body.patientId, "patientId", 128);
    const createQueueTicket = body.queueTicket && !body.queueTicketId;
    const queueTicketId = cleanString(body.queueTicketId, 128) || (createQueueTicket ? createId("queue") : null);
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const statements = [];

    if (createQueueTicket) {
      statements.push(
        db.prepare(
          `INSERT INTO queue_tickets (
            id, branch_id, appointment_id, patient_id, ticket_code, queue_name,
            priority, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')`
        ).bind(
          queueTicketId,
          branchId,
          cleanString(body.appointmentId, 128),
          patientId,
          requiredString(body.queueTicket.ticketCode, "queueTicket.ticketCode", 40),
          cleanString(body.queueTicket.queueName, 80) || "general",
          Number.isFinite(Number(body.queueTicket.priority)) ? Number(body.queueTicket.priority) : 0
        )
      );
    }

    statements.push(
      db.prepare(
        `INSERT INTO patient_visit_records (
          id, branch_id, patient_id, appointment_id, queue_ticket_id,
          visit_type, chief_complaint, triage_json, status, created_by_hash,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        visitId,
        branchId,
        patientId,
        cleanString(body.appointmentId, 128),
        queueTicketId,
        cleanString(body.visitType, 80) || "consultation",
        cleanString(body.chiefComplaint, 1000),
        optionalJson(body.triage),
        cleanString(body.status, 20) || "open",
        await hashValue(actor.id, pepper),
        optionalJson(body.metadata)
      )
    );

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "visit.open",
      resourceType: "patient_visit_record",
      resourceId: visitId,
      phiScope: "changed",
      metadata: {
        patientId,
        queueTicketCreated: createQueueTicket
      }
    });

    return json(context, {
      ok: true,
      visit: {
        id: visitId,
        branchId,
        patientId,
        queueTicketId,
        status: cleanString(body.status, 20) || "open"
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
