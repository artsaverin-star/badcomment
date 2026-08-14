import { NextResponse } from "next/server";
import { redeemAuthorizationCode, rotateRefreshToken } from "@/lib/mcp/authTokens";
import { CORS_HEADERS, normalizeResource, requestOrigin } from "@/lib/mcp/oauth";
import { recordMcpEvent } from "@/lib/mcp/telemetry";

export const dynamic = "force-dynamic";

async function readForm(req: Request): Promise<URLSearchParams> {
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return new URLSearchParams(Object.entries(json).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  }
  return new URLSearchParams(await req.text().catch(() => ""));
}

const headers = { ...CORS_HEADERS, "cache-control": "no-store" };

export async function POST(req: Request) {
  const started = Date.now();
  const form = await readForm(req);
  const grantType = form.get("grant_type") || "";
  const resource = normalizeResource(form.get("resource") || "", requestOrigin(req));
  const fail = async (error: string, description: string, status = 400) => {
    await recordMcpEvent({ event: "oauth_token", status: "error", detail: error, durationMs: Date.now() - started });
    return NextResponse.json({ error, error_description: description }, { status, headers });
  };

  if (!resource) return fail("invalid_target", "The resource must be the inApp MCP endpoint.");

  if (grantType === "authorization_code") {
    const code = form.get("code") || "";
    const verifier = form.get("code_verifier") || "";
    const clientId = form.get("client_id") || "";
    const redirectUri = form.get("redirect_uri") || "";
    if (!code || !verifier || !clientId || !redirectUri) return fail("invalid_request", "code, code_verifier, client_id and redirect_uri are required.");

    const result = await redeemAuthorizationCode({ code, verifier, clientId, redirectUri, resource });
    if (!result) return fail("invalid_grant", "The authorization code is invalid, expired or already used.");
    await recordMcpEvent({
      event: "oauth_connected",
      userId: result.userId,
      connectionId: result.connectionId,
      clientName: result.clientName,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(result.tokens, { headers });
  }

  if (grantType === "refresh_token") {
    const refreshToken = form.get("refresh_token") || "";
    if (!refreshToken) return fail("invalid_request", "refresh_token is required.");
    const result = await rotateRefreshToken({
      refreshToken,
      clientId: form.get("client_id") || undefined,
      resource,
    });
    if (!result) return fail("invalid_grant", "The refresh token is invalid, expired or revoked.");
    await recordMcpEvent({
      event: "oauth_refreshed",
      userId: result.userId,
      connectionId: result.connectionId,
      clientName: result.clientName,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(result.tokens, { headers });
  }

  return fail("unsupported_grant_type", "Use authorization_code or refresh_token.");
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
