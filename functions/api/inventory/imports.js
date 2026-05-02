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
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";
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

    const result = await db.prepare(
      "SELECT * FROM inventory_import_jobs WHERE branch_id = ? ORDER BY created_at DESC LIMIT 50"
    ).bind(branchId).all();

    return json(context, {
      ok: true,
      imports: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context, 262144);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "pharmacist", "staff"]);
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 500) : [];
    const jobId = cleanString(body.id, 128) || createId("import");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const statements = [
      db.prepare(
        `INSERT INTO inventory_import_jobs (
          id, branch_id, source_filename, status, row_count, error_count,
          created_by_hash, metadata_json
        ) VALUES (?, ?, ?, 'pending', ?, 0, ?, ?)`
      ).bind(
        jobId,
        branchId,
        cleanString(body.sourceFilename, 180),
        rows.length,
        await hashValue(actor.id, pepper),
        optionalJson(body.metadata)
      )
    ];

    rows.forEach((row, index) => {
      statements.push(
        db.prepare(
          `INSERT INTO inventory_import_rows (
            id, import_job_id, branch_id, row_number, sku, item_name,
            lot_number, quantity, status, raw_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          createId("import_row"),
          jobId,
          branchId,
          index + 1,
          cleanString(row.sku, 80),
          cleanString(row.itemName || row.name, 180),
          cleanString(row.lotNumber, 120),
          Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : null,
          row.sku && row.lotNumber && Number.isFinite(Number(row.quantity)) ? "valid" : "invalid",
          optionalJson(row)
        )
      );
    });

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "inventory.import.stage",
      resourceType: "inventory_import_job",
      resourceId: jobId,
      phiScope: "none",
      metadata: {
        rowCount: rows.length,
        sourceFilename: body.sourceFilename
      }
    });

    return json(context, {
      ok: true,
      import: {
        id: jobId,
        branchId,
        rowCount: rows.length,
        status: "pending"
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
