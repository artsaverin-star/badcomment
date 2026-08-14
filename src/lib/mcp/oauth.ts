import crypto from "node:crypto";
import { MCP_SCOPE } from "./authTokens";

// Dynamic client registration stays stateless, but its signed payload now
// carries the human-facing client name as well as the exact redirect URIs. The
// consent screen can therefore tell the user who receives access and where the
// browser will return.

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "dev-insecure-secret";
  throw new Error("SESSION_SECRET is required for MCP OAuth");
}

const hmac = (aud: string, data: string) =>
  crypto.createHmac("sha256", `${secret()}:${aud}`).update(data).digest("base64url").slice(0, 32);

function sign(aud: string, payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${hmac(aud, body)}`;
}

function verify<T>(aud: string, blob: string): T | null {
  const [body, signature] = (blob || "").split(".");
  if (!body || !signature) return null;
  const expected = hmac(aud, body);
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

type ClientRegistration = { r: string[]; n: string; iat: number };

export function redirectUriAllowed(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.username || url.password || url.hash) return false;
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export function cleanClientName(value: unknown): string {
  const name = typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : "";
  return name.slice(0, 120) || "MCP client";
}

export function mintClientId(redirectUris: string[], clientName: string): string {
  return sign("mcp-client", { r: redirectUris, n: cleanClientName(clientName), iat: Date.now() } satisfies ClientRegistration);
}

export function clientRegistration(clientId: string): { redirectUris: string[]; clientName: string } | null {
  const registration = verify<ClientRegistration>("mcp-client", clientId);
  if (!registration || !Array.isArray(registration.r) || !registration.r.every((uri) => typeof uri === "string" && redirectUriAllowed(uri))) return null;
  return { redirectUris: registration.r, clientName: cleanClientName(registration.n) };
}

export function requestOrigin(req: Request): string {
  const configured = process.env.SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || new URL(req.url).protocol.replace(":", "") || "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export const mcpResource = (origin: string) => new URL("/api/mcp", `${origin}/`).toString();

/** Older clients may omit resource; new clients must send this exact audience. */
export function normalizeResource(value: string, origin: string): string | null {
  const expected = mcpResource(origin);
  if (!value) return expected;
  try {
    return new URL(value).toString() === expected ? expected : null;
  } catch {
    return null;
  }
}

export function authServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    revocation_endpoint: `${origin}/api/mcp/oauth/revoke`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [MCP_SCOPE],
  };
}

export function protectedResourceMetadata(origin: string) {
  return {
    resource: mcpResource(origin),
    resource_name: "inApp review research",
    authorization_servers: [origin],
    bearer_methods_supported: ["header"],
    scopes_supported: [MCP_SCOPE],
  };
}

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
};
