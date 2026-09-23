import { NextResponse } from "next/server";
import { authenticateBearer, type AppAuth } from "./appAuth";
import { APP_RATE_RULES, clientIp, takeToken } from "./appRateLimit";

// Plumbing shared by the /api/app/** route handlers (docs/site-v2/APP-ACCOUNTS.md): private JSON,
// bounded JSON bodies, bearer auth, rate limits.

/** Every app API response is personal: never cached anywhere. */
export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function appJson(body: unknown, status = 200, headers?: Record<string, string>): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

/** 429 when the client's bucket is empty, else null. `key` defaults to the client IP. */
export function rateLimit(req: Request, rule: keyof typeof APP_RATE_RULES, key?: string): NextResponse | null {
  const r = takeToken(rule, key ?? clientIp(req), APP_RATE_RULES[rule]);
  return r.ok ? null : appJson({ error: "rate_limited" }, 429, { "Retry-After": String(r.retryAfter) });
}

/** Parsed JSON body (≤ maxBytes), or a 400/413 response. An empty body reads as {}. */
export async function readJson(
  req: Request,
  maxBytes = 64 * 1024,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, response: appJson({ error: "body_too_large" }, 413) };
  let text: string;
  try {
    text = await req.text();
  } catch {
    return { ok: false, response: appJson({ error: "bad_request" }, 400) };
  }
  if (text.length > maxBytes) return { ok: false, response: appJson({ error: "body_too_large" }, 413) };
  if (!text.trim()) return { ok: true, body: {} };
  try {
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: appJson({ error: "bad_request" }, 400) };
  }
}

/** The bearer-authenticated app user, or a 401. */
export async function requireAppUser(req: Request): Promise<{ ok: true; auth: AppAuth } | { ok: false; response: NextResponse }> {
  const auth = await authenticateBearer(req);
  if (!auth) return { ok: false, response: appJson({ error: "unauthorized" }, 401, { "WWW-Authenticate": "Bearer" }) };
  return { ok: true, auth };
}

/** A plain object body, else null. */
export function asObject(body: unknown): Record<string, unknown> | null {
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
