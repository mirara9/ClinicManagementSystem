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
    const actor = await requireBranchAccess(context, db, branchId, ["owner", "admin", "doctor", "pharmacist", "staff"]);
    const lines = Array.isArray(body.lines) ? body.lines : [];
    const dispenseId = cleanString(body.id, 128) || createId("dispense");
    const labelJobId = body.createLabelJob === false ? null : createId("label");
    const pepper = context.env.AUDIT_HASH_PEPPER || "";
    const statements = [
      db.prepare(
        `INSERT INTO stock_dispenses (
          id, branch_id, patient_id, visit_id, consultation_id, invoice_id,
          status, dispensed_by_hash, dispensed_at, instructions_text,
          metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, 'dispensed', ?, ?, ?, ?)`
      ).bind(
        dispenseId,
        branchId,
        cleanString(body.patientId, 128),
        cleanString(body.visitId, 128),
        cleanString(body.consultationId, 128),
        cleanString(body.invoiceId, 128),
        await hashValue(actor.id, pepper),
        cleanString(body.dispensedAt, 40) || new Date().toISOString(),
        cleanString(body.instructionsText, 2000),
        optionalJson(body.metadata)
      )
    ];

    for (const line of lines) {
      const movementId = createId("move");
      const quantity = parseNumber(line.quantity, "lines.quantity", { positive: true });
      statements.push(
        db.prepare(
          "UPDATE stock_lots SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND branch_id = ?"
        ).bind(quantity, cleanString(line.stockLotId, 128), branchId),
        db.prepare(
          `INSERT INTO stock_movements (
            id, branch_id, stock_item_id, stock_lot_id, movement_type,
            quantity_delta, unit, reference_type, reference_id, reason_code,
            performed_by_hash, metadata_json
          ) VALUES (?, ?, ?, ?, 'dispense', ?, ?, 'stock_dispense', ?, 'medicine_dispensed', ?, ?)`
        ).bind(
          movementId,
          branchId,
          requiredString(line.stockItemId, "lines.stockItemId", 128),
          cleanString(line.stockLotId, 128),
          -quantity,
          cleanString(line.unit, 40) || "unit",
          dispenseId,
          await hashValue(actor.id, pepper),
          optionalJson({ patientId: body.patientId, visitId: body.visitId })
        ),
        db.prepare(
          `INSERT INTO stock_dispense_lines (
            id, dispense_id, branch_id, stock_item_id, stock_lot_id, quantity,
            dose_text, frequency_text, duration_text, label_text,
            stock_movement_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(line.id, 128) || createId("dispense_line"),
          dispenseId,
          branchId,
          requiredString(line.stockItemId, "lines.stockItemId", 128),
          cleanString(line.stockLotId, 128),
          quantity,
          cleanString(line.doseText, 240),
          cleanString(line.frequencyText, 240),
          cleanString(line.durationText, 240),
          cleanString(line.labelText, 1000),
          movementId
        )
      );
    }

    if (labelJobId) {
      statements.push(
        db.prepare(
          `INSERT INTO medicine_label_jobs (
            id, branch_id, dispense_id, patient_id, status, label_payload_json,
            printer_name
          ) VALUES (?, ?, ?, ?, 'queued', ?, ?)`
        ).bind(
          labelJobId,
          branchId,
          dispenseId,
          cleanString(body.patientId, 128),
          optionalJson({ lines, instructionsText: body.instructionsText }),
          cleanString(body.printerName, 120)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      branchId,
      actorType: actor.role,
      actorId: actor.id,
      action: "stock.dispense",
      resourceType: "stock_dispense",
      resourceId: dispenseId,
      phiScope: body.patientId ? "referenced" : "none",
      metadata: {
        lineCount: lines.length,
        labelJobId
      }
    });

    return json(context, {
      ok: true,
      dispense: {
        id: dispenseId,
        branchId,
        lineCount: lines.length,
        labelJobId
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
