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
} from "../_lib/http.js";
import { writeAuditEvent } from "../_lib/audit.js";

const METHODS = "GET, POST, OPTIONS";

const BASELINE_EVIDENCE = [
  ["PDPA.PRIVACY_NOTICE", "policy", "Published privacy notice"],
  ["PDPA.DPO_ASSESSMENT", "assessment", "DPO threshold assessment"],
  ["PDPA.BREACH_72H", "procedure", "72-hour breach response workflow"],
  ["MMC.EMR_AUDIT", "control", "Medical record correction and audit control"],
  ["CKAPS.REGISTRATION", "registration", "Private clinic registration evidence"],
  ["PHARMACY.STOCK_CONTROL", "procedure", "Medicine stock receiving, storage, and disposal control"]
];

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  return runEndpoint(context, METHODS, async () => {
    requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const branchCount = await db.prepare("SELECT COUNT(*) AS count FROM branches").first();
    const evidenceCount = await db.prepare("SELECT COUNT(*) AS count FROM compliance_evidence").first();

    return json(context, {
      ok: true,
      bootstrap: {
        branches: branchCount.count,
        complianceEvidence: evidenceCount.count
      }
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin"]);
    const db = getDb(context);
    const body = await readJson(context);
    const branchInput = body.branch || {};
    const branchId = cleanString(branchInput.id, 128) || "branch_main";
    const code = requiredString(branchInput.code || "HQ", "branch.code", 40).toUpperCase();
    const name = requiredString(branchInput.name || "UsrahMedic Main Branch", "branch.name", 160);
    const timezone = cleanString(branchInput.timezone, 80) || "Asia/Kuala_Lumpur";

    const statements = [
      db.prepare(
        `INSERT INTO branches (
          id, code, name, registration_number, phone, email, address_json, timezone, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
        ON CONFLICT(id) DO UPDATE SET
          code = excluded.code,
          name = excluded.name,
          registration_number = excluded.registration_number,
          phone = excluded.phone,
          email = excluded.email,
          address_json = excluded.address_json,
          timezone = excluded.timezone,
          status = 'active'`
      ).bind(
        branchId,
        code,
        name,
        cleanString(branchInput.registrationNumber, 80),
        cleanString(branchInput.phone, 80),
        cleanString(branchInput.email, 120),
        optionalJson(branchInput.address),
        timezone
      )
    ];

    for (const [requirementCode, evidenceType, title] of BASELINE_EVIDENCE) {
      statements.push(
        db.prepare(
          `INSERT OR IGNORE INTO compliance_evidence (
            id, branch_id, requirement_code, evidence_type, title, status, metadata_json
          ) VALUES (?, ?, ?, ?, ?, 'planned', ?)`
        ).bind(
          createId("evidence"),
          branchId,
          requirementCode,
          evidenceType,
          title,
          JSON.stringify({ seededBy: "bootstrap", ownerActionRequired: true })
        )
      );
    }

    await db.batch(statements);
    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      action: "bootstrap.upsert",
      resourceType: "branch",
      resourceId: branchId,
      phiScope: "none",
      metadata: {
        branchCode: code,
        baselineEvidenceCount: BASELINE_EVIDENCE.length
      }
    });

    return json(context, {
      ok: true,
      branch: {
        id: branchId,
        code,
        name,
        timezone
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
