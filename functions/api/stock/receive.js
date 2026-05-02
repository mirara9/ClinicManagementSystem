import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  json,
  parseBoolean,
  parseNumber,
  readJson,
  requiredString,
  requireRole,
  runEndpoint
} from "../../_lib/http.js";
import { hashValue, safeMetadata, writeAuditEvent } from "../../_lib/audit.js";

const METHODS = "POST, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const actor = requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const body = await readJson(context);
    const branchId = requiredString(body.branchId, "branchId", 128);
    const itemInput = body.item || {};
    const lotInput = body.lot || {};
    const sku = requiredString(itemInput.sku || body.sku, "item.sku", 80).toUpperCase();
    const itemName = requiredString(itemInput.name || body.name, "item.name", 180);
    const quantity = parseNumber(body.quantity || lotInput.quantity, "quantity", { positive: true });
    const unit = cleanString(itemInput.unit || body.unit, 40) || "unit";
    const lotNumber = requiredString(lotInput.lotNumber || body.lotNumber, "lot.lotNumber", 120);
    const receivedAt = cleanString(body.receivedAt, 40) || new Date().toISOString();
    const existingItem = await db.prepare(
      "SELECT id FROM stock_items WHERE branch_id = ? AND sku = ?"
    ).bind(branchId, sku).first();
    const itemId = existingItem ? existingItem.id : createId("item");
    const lotId = createId("lot");
    const movementId = createId("move");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const requiresBatchTracking = itemInput.requiresBatchTracking === undefined
      ? null
      : parseBoolean(itemInput.requiresBatchTracking) ? 1 : 0;
    const controlledItem = itemInput.isControlledItem === undefined
      ? null
      : parseBoolean(itemInput.isControlledItem) ? 1 : 0;
    const reorderLevel = itemInput.reorderLevel === undefined
      ? 0
      : parseNumber(itemInput.reorderLevel, "item.reorderLevel");

    await db.batch([
      existingItem
        ? db.prepare(
          `UPDATE stock_items SET
            barcode = COALESCE(?, barcode),
            name = ?,
            category = ?,
            unit = ?,
            requires_batch_tracking = COALESCE(?, requires_batch_tracking),
            is_controlled_item = COALESCE(?, is_controlled_item),
            reorder_level = ?
          WHERE id = ?`
        ).bind(
          cleanString(itemInput.barcode, 120),
          itemName,
          cleanString(itemInput.category, 80) || "medicine",
          unit,
          requiresBatchTracking,
          controlledItem,
          reorderLevel,
          itemId
        )
        : db.prepare(
          `INSERT INTO stock_items (
            id, branch_id, sku, barcode, name, category, unit,
            requires_batch_tracking, is_controlled_item, reorder_level, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
        ).bind(
          itemId,
          branchId,
          sku,
          cleanString(itemInput.barcode, 120),
          itemName,
          cleanString(itemInput.category, 80) || "medicine",
          unit,
          requiresBatchTracking === null ? 1 : requiresBatchTracking,
          controlledItem === null ? 0 : controlledItem,
          reorderLevel
        ),
      db.prepare(
        `INSERT INTO stock_lots (
          id, branch_id, stock_item_id, lot_number, supplier_name, received_at,
          expires_on, quantity_on_hand, unit_cost_cents, currency, storage_location, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`
      ).bind(
        lotId,
        branchId,
        itemId,
        lotNumber,
        cleanString(lotInput.supplierName || body.supplierName, 180),
        receivedAt,
        cleanString(lotInput.expiresOn || body.expiresOn, 40),
        quantity,
        Number.isFinite(Number(lotInput.unitCostCents)) ? Number(lotInput.unitCostCents) : null,
        cleanString(lotInput.currency, 3) || "MYR",
        cleanString(lotInput.storageLocation || body.storageLocation, 160)
      ),
      db.prepare(
        `INSERT INTO stock_movements (
          id, branch_id, stock_item_id, stock_lot_id, movement_type,
          quantity_delta, unit, reference_type, reference_id, reason_code,
          performed_by_hash, metadata_json
        ) VALUES (?, ?, ?, ?, 'receive', ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        movementId,
        branchId,
        itemId,
        lotId,
        quantity,
        unit,
        cleanString(body.referenceType, 80) || "purchase_order",
        cleanString(body.referenceId, 128),
        cleanString(body.reasonCode, 80) || "stock_received",
        await hashValue(actor.id, pepper),
        JSON.stringify(safeMetadata({
          supplierName: lotInput.supplierName || body.supplierName,
          invoiceRef: body.invoiceRef,
          controlledItem: controlledItem === 1
        }))
      )
    ]);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      action: "stock.receive",
      resourceType: "stock_lot",
      resourceId: lotId,
      phiScope: "none",
      metadata: {
        sku,
        quantity,
        unit,
        lotNumber
      }
    });

    return json(context, {
      ok: true,
      stock: {
        itemId,
        lotId,
        movementId,
        sku,
        quantity,
        unit
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
