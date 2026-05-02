import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  optionalJson,
  parseNumber,
  readJson,
  requiredString,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, writeAuditEvent } from "../../_lib/audit.js";
import { requireBranchAccess } from "../../_lib/access.js";

const METHODS = "POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "pharmacist", "staff"]);
    const adjustmentId = cleanString(body.id, 128) || createId("adjust");
    const movementId = createId("move");
    const quantityDelta = parseNumber(body.quantityDelta, "quantityDelta");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    await db.batch([
      db.prepare(
        "UPDATE stock_lots SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND branch_id = ?"
      ).bind(quantityDelta, cleanString(body.stockLotId, 128), branchId),
      db.prepare(
        `INSERT INTO stock_movements (
          id, branch_id, stock_item_id, stock_lot_id, movement_type,
          quantity_delta, unit, reference_type, reference_id, reason_code,
          performed_by_hash, metadata_json
        ) VALUES (?, ?, ?, ?, 'adjust', ?, ?, 'stock_adjustment', ?, ?, ?, ?)`
      ).bind(
        movementId,
        branchId,
        requiredString(body.stockItemId, "stockItemId", 128),
        cleanString(body.stockLotId, 128),
        quantityDelta,
        cleanString(body.unit, 40) || "unit",
        adjustmentId,
        requiredString(body.reasonCode, "reasonCode", 80),
        await hashValue(actor.id, pepper),
        optionalJson(body.metadata)
      ),
      db.prepare(
        `INSERT INTO stock_adjustments (
          id, branch_id, stock_item_id, stock_lot_id, quantity_delta,
          reason_code, approved_by_hash, evidence_json, stock_movement_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        adjustmentId,
        branchId,
        requiredString(body.stockItemId, "stockItemId", 128),
        cleanString(body.stockLotId, 128),
        quantityDelta,
        requiredString(body.reasonCode, "reasonCode", 80),
        await hashValue(body.approvedByStaffId || actor.id, pepper),
        optionalJson(body.evidence),
        movementId
      )
    ]);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "stock.adjust",
      resourceType: "stock_adjustment",
      resourceId: adjustmentId,
      phiScope: "none",
      metadata: {
        stockItemId: body.stockItemId,
        stockLotId: body.stockLotId,
        quantityDelta
      }
    });

    return json(context, {
      ok: true,
      adjustment: {
        id: adjustmentId,
        movementId,
        branchId,
        quantityDelta
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
