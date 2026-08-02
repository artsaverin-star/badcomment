import crypto from "node:crypto";

// OAuth for the MCP server, the way Mobbin does it: the user adds the server
// with one plain command, the client hits 401, discovers these endpoints,
// opens the browser, the user signs in and taps "allow" — and the client walks
// away with the same personal HMAC key we already mint. Everything here is
// stateless (signed blobs instead of DB rows), which fits the small prod box:
// rotating SESSION_SECRET revokes all of it at once, exactly like sessions.

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";

const hmac = (aud: string, data: string) =>
  crypto.createHmac("sha256", `${SECRET}:${aud}`).update(data).digest("base64url").slice(0, 32);

function sign(aud: string, payload: object): string {
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${b}.${hmac(aud, b)}`;
}

function verify<T>(aud: string, blob: string): T | null {
  const [b, h] = (blob || "").split(".");
  if (!b || !h) return null;
  const h2 = hmac(aud, b);
  if (h.length !== h2.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(h2))) return null;
  try {
    return JSON.parse(Buffer.from(b, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

// ── Dynamic client registration (RFC 7591), stateless ──────────────────────
// The client_id IS the registration: a signed list of redirect URIs.

type ClientReg = { r: string[] };

export function redirectUriAllowed(uri: string): boolean {
  try {
    const u = new URL(uri);
    if (u.protocol === "https:") return true;
    // Loopback redirects are how CLI clients (Claude Code etc.) receive the code.
    return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]" || u.hostname === "::1");
  } catch {
    return false;
  }
}

export function mintClientId(redirectUris: string[]): string {
  return sign("mcp-client", { r: redirectUris });
}

export function clientRedirectUris(clientId: string): string[] | null {
  const reg = verify<ClientReg>("mcp-client", clientId);
  return reg && Array.isArray(reg.r) ? reg.r : null;
}

// ── Authorization codes ─────────────────────────────────────────────────────

type Code = { u: string; c: string; r: string; ch: string; exp: number };

const CODE_TTL_MS = 10 * 60 * 1000;

export function mintCode(userId: string, clientId: string, redirectUri: string, challenge: string): string {
  return sign("mcp-code", {
    u: userId,
    // The full client_id is long; a keyed digest is enough to pin the code to it.
    c: hmac("mcp-code-client", clientId),
    r: redirectUri,
    ch: challenge,
    exp: Date.now() + CODE_TTL_MS,
  } satisfies Code);
}

export function redeemCode(code: string, clientId: string, redirectUri: string, verifier: string): string | null {
  const c = verify<Code>("mcp-code", code);
  if (!c) return null;
  if (c.exp < Date.now()) return null;
  if (c.c !== hmac("mcp-code-client", clientId)) return null;
  if (c.r !== redirectUri) return null;
  const s256 = crypto.createHash("sha256").update(verifier).digest("base64url");
  if (s256 !== c.ch) return null;
  return c.u;
}

// ── Endpoint URLs, derived from the request so dev and prod both work ──────

export function requestOrigin(req: Request): string {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  return process.env.SITE_URL || (host ? `${proto}://${host}` : new URL(req.url).origin);
}

export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
  };
}

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
};
