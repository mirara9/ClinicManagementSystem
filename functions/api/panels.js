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
  requireRole,
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
    requireRole(context, ["owner", "admin", "staff"]);
    const db = getDb(context);
    const result = await db.prepare(
      `SELECT
        p.*,
        COUNT(r.id) AS active_price_rules
      FROM panel_providers p
      LEFT JOIN panel_price_rules r ON r.panel_provider_id = p.id AND r.status = 'active'
      GROUP BY p.id
      ORDER BY p.name`
    ).all();

    return json(context, {
      ok: true,
      panels: result.results || []
    }, { methods: METHODS });
  });
}

export async function onRequestPost(context) {
  return runEndpoint(context, METHODS, async () => {
    const db = getDb(context);
    const body = await readJson(context);
    const actor = requireRole(context, ["owner", "admin"]);
    const panelId = cleanString(body.id, 128) || createId("panel");
    const rules = Array.isArray(body.priceRules) ? body.priceRules : [];
    const statements = [
      db.prepare(
        `INSERT INTO panel_providers (
          id, name, provider_type, payer_code, contact_json, status
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          provider_type = excluded.provider_type,
          payer_code = excluded.payer_code,
          contact_json = excluded.contact_json,
          status = excluded.status`
      ).bind(
        panelId,
        requiredString(body.name, "name", 180),
        cleanString(body.providerType, 40) || "panel",
        cleanString(body.payerCode, 80),
        optionalJson(body.contact),
        cleanString(body.status, 20) || "active"
      )
    ];

    for (const rule of rules) {
      const branchId = cleanString(rule.branchId, 128);
      if (branchId) {
        await requireBranchAccess(context, db, branchId, ["owner", "admin", "billing", "staff"]);
      }

      statements.push(
        db.prepare(
          `INSERT INTO panel_price_rules (
            id, branch_id, panel_provider_id, service_code, price_cents,
            currency, effective_from, effective_to, status, metadata_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          cleanString(rule.id, 128) || createId("panel_price"),
          branchId,
          panelId,
          requiredString(rule.serviceCode, "priceRules.serviceCode", 80),
          Math.round(parseNumber(rule.priceCents, "priceRules.priceCents")),
          cleanString(rule.currency, 3) || "MYR",
          requiredString(rule.effectiveFrom, "priceRules.effectiveFrom", 40),
          cleanString(rule.effectiveTo, 40),
          cleanString(rule.status, 20) || "active",
          optionalJson(rule.metadata)
        )
      );
    }

    await db.batch(statements);

    const auditId = await writeAuditEvent(context, db, {
      actorType: actor.role,
      actorId: actor.id,
      action: "panel.upsert",
      resourceType: "panel_provider",
      resourceId: panelId,
      phiScope: "none",
      metadata: {
        priceRules: rules.length
      }
    });

    return json(context, {
      ok: true,
      panel: {
        id: panelId,
        name: body.name,
        priceRules: rules.length
      },
      auditEventId: auditId
    }, { status: 201, methods: METHODS });
  });
}
