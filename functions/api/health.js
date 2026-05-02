import { getDb, handleOptions, json } from "../_lib/http.js";

const METHODS = "GET, OPTIONS";

export function onRequestOptions(context) {
  return handleOptions(context, METHODS);
}

export async function onRequestGet(context) {
  const checks = {
    d1: "not_configured"
  };

  try {
    const db = getDb(context);
    await db.prepare("SELECT 1 AS ok").first();
    checks.d1 = "ok";
  } catch {
    checks.d1 = "error";
  }

  return json(context, {
    ok: checks.d1 === "ok",
    service: "usrahmedic-platform",
    environment: context.env.APP_ENV || "unknown",
    time: new Date().toISOString(),
    checks
  }, {
    status: checks.d1 === "ok" ? 200 : 503,
    methods: METHODS
  });
}
