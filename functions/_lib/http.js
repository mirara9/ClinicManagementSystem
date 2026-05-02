const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const DEFAULT_ALLOWED_HEADERS = "Content-Type, Authorization, X-UsrahMedic-Role, X-UsrahMedic-Actor-Id, Idempotency-Key";

export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function createId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function getDb(context) {
  const db = context.env.USRAHMEDIC_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new HttpError(503, "D1_NOT_CONFIGURED", "USRAHMEDIC_DB binding is not configured.");
  }
  return db;
}

export function getActor(context) {
  const role = cleanString(context.request.headers.get("X-UsrahMedic-Role"), 32) || "anonymous";
  const actorId = cleanString(context.request.headers.get("X-UsrahMedic-Actor-Id"), 128);
  return {
    role: role.toLowerCase(),
    id: actorId
  };
}

export function requireRole(context, allowedRoles) {
  const actor = getActor(context);
  if (allowedRoles.includes(actor.role)) {
    return actor;
  }

  const status = actor.role === "anonymous" ? 401 : 403;
  const code = actor.role === "anonymous" ? "AUTH_REQUIRED" : "FORBIDDEN";
  throw new HttpError(status, code, "This endpoint requires an authorized UsrahMedic role.");
}

export async function readJson(context, maxBytes = 32768) {
  const length = Number(context.request.headers.get("Content-Length") || 0);
  if (length > maxBytes) {
    throw new HttpError(413, "PAYLOAD_TOO_LARGE", "Request body is too large.");
  }

  try {
    return await context.request.json();
  } catch {
    throw new HttpError(400, "INVALID_JSON", "Request body must be valid JSON.");
  }
}

export function cleanString(value, maxLength = 255) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }
  return normalized.slice(0, maxLength);
}

export function requiredString(value, fieldName, maxLength = 255) {
  const normalized = cleanString(value, maxLength);
  if (!normalized) {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} is required.`);
  }
  return normalized;
}

export function optionalJson(value) {
  if (value === undefined || value === null) {
    return "{}";
  }
  return JSON.stringify(value);
}

export function parseNumber(value, fieldName, options = {}) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} must be a number.`);
  }
  if (options.positive && numberValue <= 0) {
    throw new HttpError(400, "VALIDATION_ERROR", `${fieldName} must be greater than zero.`);
  }
  return numberValue;
}

export function parseBoolean(value) {
  return value === true || value === "true" || value === "1";
}

export async function runEndpoint(context, methods, handler) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof HttpError) {
      return json(context, {
        ok: false,
        error: {
          code: error.code,
          message: error.message
        }
      }, { status: error.status, methods });
    }

    console.error("Pages Function failed", {
      message: error && error.message ? error.message : "Unknown error"
    });

    return json(context, {
      ok: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "The request could not be completed."
      }
    }, { status: 500, methods });
  }
}

export function handleOptions(context, methods) {
  const allowedOrigin = getAllowedOrigin(context.request, context.env);
  if (context.request.headers.get("Origin") && !allowedOrigin) {
    return new Response(null, {
      status: 403,
      headers: securityHeaders(context, methods)
    });
  }

  return new Response(null, {
    status: 204,
    headers: securityHeaders(context, methods)
  });
}

export function json(context, body, init = {}) {
  const headers = securityHeaders(context, init.methods || "GET, OPTIONS");
  const extraHeaders = init.headers || {};
  for (const [key, value] of Object.entries(extraHeaders)) {
    headers.set(key, value);
  }

  return Response.json(body, {
    status: init.status || 200,
    headers
  });
}

export function securityHeaders(context, methods) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Vary": "Origin"
  });

  const allowedOrigin = getAllowedOrigin(context.request, context.env);
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
  }

  return headers;
}

export function getClientIp(context) {
  return cleanString(
    context.request.headers.get("CF-Connecting-IP") ||
      context.request.headers.get("X-Forwarded-For"),
    128
  );
}

export function getAllowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return null;
  }

  const requestOrigin = new URL(request.url).origin;
  if (origin === requestOrigin || LOCAL_ORIGIN_PATTERN.test(origin)) {
    return origin;
  }

  const configuredOrigins = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return configuredOrigins.includes(origin) ? origin : null;
}
