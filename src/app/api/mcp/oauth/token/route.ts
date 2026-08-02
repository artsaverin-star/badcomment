import { NextResponse } from "next/server";
import { mintApiKey } from "@/lib/mcp/apiKey";
import { redeemCode, CORS_HEADERS } from "@/lib/mcp/oauth";

// The OAuth token endpoint: swaps a valid authorization code (with its PKCE
// verifier) for the same personal HMAC key the landing page shows. The key
// does not expire, so no refresh tokens are needed.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let form: URLSearchParams;
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const j = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    form = new URLSearchParams(Object.entries(j).filter(([, v]) => typeof v === "string") as [string, string][]);
  } else {
    form = new URLSearchParams(await req.text().catch(() => ""));
  }

  const err = (error: string, status = 400) => NextResponse.json({ error }, { status, headers: CORS_HEADERS });

  if (form.get("grant_type") !== "authorization_code") return err("unsupported_grant_type");
  const code = form.get("code") || "";
  const verifier = form.get("code_verifier") || "";
  const clientId = form.get("client_id") || "";
  const redirectUri = form.get("redirect_uri") || "";
  if (!code || !verifier || !clientId || !redirectUri) return err("invalid_request");

  const userId = redeemCode(code, clientId, redirectUri, verifier);
  if (!userId) return err("invalid_grant");

  return NextResponse.json({ access_token: mintApiKey(userId), token_type: "bearer" }, { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
