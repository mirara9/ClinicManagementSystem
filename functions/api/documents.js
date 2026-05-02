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
    await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "front_desk", "staff"]);
    const patientId = cleanString(url.searchParams.get("patientId"), 128);
    const documentType = cleanString(url.searchParams.get("documentType"), 40);

    const [documents, certificates] = await Promise.all([
      db.prepare(
        `SELECT * FROM clinical_documents
        WHERE branch_id = ?
          AND (? IS NULL OR patient_id = ?)
          AND (? IS NULL OR document_type = ?)
        ORDER BY created_at DESC
        LIMIT 100`
      ).bind(branchId, patientId, patientId, documentType, documentType).all(),
      db.prepare(
        `SELECT * FROM medical_certificates
        WHERE branch_id = ?
          AND (? IS NULL OR patient_id = ?)
        ORDER BY created_at DESC
        LIMIT 100`
      ).bind(branchId, patientId, patientId).all()
    ]);

    return json(context, {
      ok: true,
      documents: documents.results || [],
      medicalCertificates: certificates.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "nurse", "staff"]);
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const documentId = cleanString(body.id, 128) || createId("doc");
    const documentType = cleanString(body.documentType, 40) || "clinical_note";
    const status = cleanString(body.status, 20) || "draft";

    await db.prepare(
      `INSERT INTO clinical_documents (
        id, branch_id, patient_id, visit_id, consultation_id, document_type,
        title, rich_text_json, plain_text, status, storage_uri, content_hash,
        created_by_hash, finalized_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      documentId,
      branchId,
      cleanString(body.patientId, 128),
      cleanString(body.visitId, 128),
      cleanString(body.consultationId, 128),
      documentType,
      requiredString(body.title, "title", 180),
      optionalJson(body.richText),
      cleanString(body.plainText, 4000),
      status,
      cleanString(body.storageUri, 500),
      cleanString(body.contentHash, 128),
      await hashValue(actor.id, pepper),
      status === "final" ? (cleanString(body.finalizedAt, 40) || new Date().toISOString()) : null
    ).run();

    let medicalCertificate = null;
    if (body.medicalCertificate) {
      const certificate = body.medicalCertificate;
      const certificateId = cleanString(certificate.id, 128) || createId("mc");
      const certificateStatus = cleanString(certificate.status, 20) || "draft";
      await db.prepare(
        `INSERT INTO medical_certificates (
          id, branch_id, patient_id, visit_id, consultation_id, issued_by_staff_id,
          start_on, end_on, reason_text, restrictions_text, status, issued_at,
          document_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        certificateId,
        branchId,
        requiredString(certificate.patientId || body.patientId, "medicalCertificate.patientId", 128),
        cleanString(certificate.visitId || body.visitId, 128),
        cleanString(certificate.consultationId || body.consultationId, 128),
        cleanString(certificate.issuedByStaffId, 128) || actor.id,
        requiredString(certificate.startOn, "medicalCertificate.startOn", 40),
        requiredString(certificate.endOn, "medicalCertificate.endOn", 40),
        cleanString(certificate.reasonText, 1000),
        cleanString(certificate.restrictionsText, 1000),
        certificateStatus,
        certificateStatus === "issued" ? (cleanString(certificate.issuedAt, 40) || new Date().toISOString()) : null,
        documentId
      ).run();
      medicalCertificate = {
        id: certificateId,
        status: certificateStatus
      };
    }

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: body.medicalCertificate ? "document.mc.create" : "document.create",
      resourceType: "clinical_document",
      resourceId: documentId,
      phiScope: "changed",
      metadata: {
        documentType,
        status,
        hasMedicalCertificate: Boolean(body.medicalCertificate)
      }
    });

    return json(context, {
      ok: true,
      document: {
        id: documentId,
        branchId,
        documentType,
        status
      },
      medicalCertificate,
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
