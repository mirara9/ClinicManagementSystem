import {
  cleanString,
  createId,
  getDb,
  handleOptions,
  HttpError,
  json,
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
    const scannedCode = requiredString(body.scannedCode || body.barcode || body.sku || body.lotNumber, "scannedCode", 160);
    const scanPurpose = cleanString(body.scanPurpose, 20) || "verify";
    const pepper = context.env.AUDIT_HASH_PEPPER || "";

    if (!["verify", "stocktake", "dispense", "dispose", "receive"].includes(scanPurpose)) {
      throw new HttpError(400, "VALIDATION_ERROR", "scanPurpose is not supported.");
    }

    const matched = await findStockMatch(db, branchId, body);
    const scanId = createId("scan");
    const result = matched ? resolveScanResult(matched) : "not_found";
    const quantityDelta = body.quantityDelta === undefined || body.quantityDelta === null
      ? 0
      : parseNumber(body.quantityDelta, "quantityDelta");
    const movementId = matched && matched.stock_lot_id && quantityDelta !== 0 ? createId("move") : null;

    const statements = [
      db.prepare(
        `INSERT INTO stock_scan_events (
          id, branch_id, stock_item_id, stock_lot_id, scanned_code, scan_purpose,
          patient_id_hash, result, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        scanId,
        branchId,
        matched ? matched.stock_item_id : null,
        matched ? matched.stock_lot_id : null,
        scannedCode,
        scanPurpose,
        await hashValue(body.patientId, pepper),
        result,
        JSON.stringify(safeMetadata({
          source: body.source,
          deviceId: body.deviceId,
          referenceType: body.referenceType,
          referenceId: body.referenceId
        }))
      )
    ];

    if (matched && matched.stock_lot_id && quantityDelta !== 0) {
      statements.push(
        db.prepare(
          "UPDATE stock_lots SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?"
        ).bind(quantityDelta, matched.stock_lot_id),
        db.prepare(
          `INSERT INTO stock_movements (
            id, branch_id, stock_item_id, stock_lot_id, movement_type,
            quantity_delta, unit, reference_type, reference_id, reason_code,
            performed_by_hash, metadata_json
          ) VALUES (?, ?, ?, ?, 'scan', ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          movementId,
          branchId,
          matched.stock_item_id,
          matched.stock_lot_id,
          quantityDelta,
          matched.unit,
          cleanString(body.referenceType, 80),
          cleanString(body.referenceId, 128),
          cleanString(body.reasonCode, 80) || scanPurpose,
          await hashValue(actor.id, pepper),
          JSON.stringify(safeMetadata({ scanId, scanPurpose }))
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      action: "stock.scan",
      resourceType: "stock_scan_event",
      resourceId: scanId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        scanPurpose,
        result,
        quantityDelta
      }
    });

    return json(context, {
      ok: true,
      scan: {
        id: scanId,
        result,
        matched: matched ? {
          itemId: matched.stock_item_id,
          lotId: matched.stock_lot_id,
          sku: matched.sku,
          name: matched.name,
          lotNumber: matched.lot_number,
          expiresOn: matched.expires_on,
          quantityOnHand: matched.quantity_on_hand === null || matched.quantity_on_hand === undefined
            ? null
            : matched.quantity_on_hand + quantityDelta
        } : null,
        movementId
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}

async function findStockMatch(db, branchId, body) {
  if (body.lotNumber) {
    return db.prepare(
      `SELECT
        i.id AS stock_item_id,
        i.sku,
        i.name,
        i.unit,
        l.id AS stock_lot_id,
        l.lot_number,
        l.expires_on,
        l.quantity_on_hand,
        l.status AS lot_status
      FROM stock_lots l
      JOIN stock_items i ON i.id = l.stock_item_id
      WHERE l.branch_id = ? AND l.lot_number = ?
      ORDER BY l.created_at DESC
      LIMIT 1`
    ).bind(branchId, cleanString(body.lotNumber, 120)).first();
  }

  if (body.barcode || body.scannedCode) {
    const code = cleanString(body.barcode || body.scannedCode, 120);
    return db.prepare(
      `SELECT
        i.id AS stock_item_id,
        i.sku,
        i.name,
        i.unit,
        l.id AS stock_lot_id,
        l.lot_number,
        l.expires_on,
        l.quantity_on_hand,
        l.status AS lot_status
      FROM stock_items i
      LEFT JOIN stock_lots l ON l.stock_item_id = i.id AND l.status = 'available'
      WHERE i.branch_id = ? AND (i.barcode = ? OR i.sku = ?)
      ORDER BY l.expires_on ASC
      LIMIT 1`
    ).bind(branchId, code, code.toUpperCase()).first();
  }

  return db.prepare(
    `SELECT
      i.id AS stock_item_id,
      i.sku,
      i.name,
      i.unit,
      l.id AS stock_lot_id,
      l.lot_number,
      l.expires_on,
      l.quantity_on_hand,
      l.status AS lot_status
    FROM stock_items i
    LEFT JOIN stock_lots l ON l.stock_item_id = i.id AND l.status = 'available'
    WHERE i.branch_id = ? AND i.sku = ?
    ORDER BY l.expires_on ASC
    LIMIT 1`
  ).bind(branchId, requiredString(body.sku, "sku", 80).toUpperCase()).first();
}

function resolveScanResult(row) {
  if (row.lot_status === "recalled") {
    return "recalled";
  }

  if (row.expires_on && row.expires_on < new Date().toISOString().slice(0, 10)) {
    return "expired";
  }

  return "matched";
}
