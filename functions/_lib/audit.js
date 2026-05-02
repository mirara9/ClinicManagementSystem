import { cleanString, createId, getActor, getClientIp } from "./http.js";

const SENSITIVE_KEY_PATTERN = /(address|birth|diagnosis|email|full_name|ic|name|nric|passport|password|patient|phone|secret|symptom|token)/i;

export async function hashValue(value, pepper = "") {
  const normalized = cleanString(value, 500);
  if (!normalized) {
    return null;
  }

  const data = new TextEncoder().encode(`${pepper}:${normalized}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function safeMetadata(input, depth = 0) {
  if (input === undefined || input === null) {
    return {};
  }

  if (depth > 2) {
    return "[truncated]";
  }

  if (Array.isArray(input)) {
    return input.slice(0, 10).map((item) => safeMetadata(item, depth + 1));
  }

  if (typeof input !== "object") {
    return cleanString(input, 300);
  }

  const output = {};
  for (const [key, value] of Object.entries(input)) {
    const safeKey = cleanString(key, 80) || "unknown";
    if (SENSITIVE_KEY_PATTERN.test(safeKey)) {
      output[safeKey] = "[redacted]";
    } else {
      output[safeKey] = safeMetadata(value, depth + 1);
    }
  }
  return output;
}

export async function writeAuditEvent(context, db, event) {
  const actor = getActor(context);
  const pepper = context.env.AUDIT_HASH_PEPPER || "";
  const requestId = context.request.headers.get("CF-Ray") || createId("req");
  const userAgent = context.request.headers.get("User-Agent");
  const metadataJson = JSON.stringify(safeMetadata(event.metadata || {})).slice(0, 4000);
  const id = event.id || createId("audit");

  await db.prepare(
    `INSERT INTO audit_events (
      id,
      request_id,
      branch_id,
      actor_type,
      actor_id_hash,
      action,
      resource_type,
      resource_id_hash,
      outcome,
      phi_scope,
      ip_hash,
      user_agent_hash,
      metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      requestId,
      cleanString(event.branchId, 128),
      cleanString(event.actorType || actor.role, 32) || "anonymous",
      await hashValue(event.actorId || actor.id, pepper),
      cleanString(event.action, 120) || "unknown",
      cleanString(event.resourceType, 80) || "unknown",
      await hashValue(event.resourceId, pepper),
      cleanString(event.outcome, 20) || "success",
      cleanString(event.phiScope, 20) || "none",
      await hashValue(getClientIp(context), pepper),
      await hashValue(userAgent, pepper),
      metadataJson
    )
    .run();

  return id;
}
