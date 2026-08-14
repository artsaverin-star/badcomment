import { NextResponse } from "next/server";
import { revokeMcpToken } from "@/lib/mcp/authTokens";
import { CORS_HEADERS } from "@/lib/mcp/oauth";
import { recordMcpEvent } from "@/lib/mcp/telemetry";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") || "";
  let token = "";
  if (contentType.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } else {
    token = new URLSearchParams(await req.text().catch(() => "")).get("token") || "";
  }
  if (token) {
    const revoked = await revokeMcpToken(token);
    if (revoked) {
      await recordMcpEvent({
        event: "oauth_revoked",
        userId: revoked.userId,
        connectionId: revoked.connectionId,
        clientName: revoked.clientName,
      });
    }
  }
  // RFC 7009 intentionally returns 200 even for an unknown token.
  return NextResponse.json({ ok: true }, { headers: { ...CORS_HEADERS, "cache-control": "no-store" } });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
