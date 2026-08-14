import { NextResponse } from "next/server";
import { cleanClientName, mintClientId, redirectUriAllowed, CORS_HEADERS } from "@/lib/mcp/oauth";
import { recordMcpEvent } from "@/lib/mcp/telemetry";

// Dynamic client registration (RFC 7591), stateless: the returned client_id is
// a signed blob of the redirect URIs, so there is no client table to keep.

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { redirect_uris?: unknown; client_name?: unknown; application_type?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400, headers: CORS_HEADERS });
  }

  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === "string") : [];
  if (uris.length === 0 || !uris.every(redirectUriAllowed)) {
    await recordMcpEvent({ event: "oauth_registration", status: "error", detail: "invalid_redirect_uri" });
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "redirect_uris must be https or loopback http URLs" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const clientName = cleanClientName(body.client_name);
  await recordMcpEvent({ event: "oauth_registration", clientName });

  return NextResponse.json(
    {
      client_id: mintClientId(uris, clientName),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: uris,
      client_name: clientName,
      application_type: body.application_type === "native" ? "native" : "web",
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201, headers: CORS_HEADERS },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
