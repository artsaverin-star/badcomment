import { NextResponse } from "next/server";
import { mintClientId, redirectUriAllowed, CORS_HEADERS } from "@/lib/mcp/oauth";

// Dynamic client registration (RFC 7591), stateless: the returned client_id is
// a signed blob of the redirect URIs, so there is no client table to keep.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS_HEADERS });
  }

  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (uris.length === 0 || !uris.every(redirectUriAllowed)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be https or loopback http URLs" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  return NextResponse.json(
    {
      client_id: mintClientId(uris),
      redirect_uris: uris,
      client_name: typeof body.client_name === "string" ? body.client_name : undefined,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
