import { NextResponse } from "next/server";
import { authServerMetadata, requestOrigin, CORS_HEADERS } from "@/lib/mcp/oauth";

// OAuth authorization-server metadata (RFC 8414). Served here and rewritten
// from /.well-known/oauth-authorization-server in next.config.ts (app-router
// folders can't start with a dot).

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(authServerMetadata(requestOrigin(req)), { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
