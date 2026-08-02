import { NextResponse } from "next/server";
import { protectedResourceMetadata, requestOrigin, CORS_HEADERS } from "@/lib/mcp/oauth";

// OAuth protected-resource metadata (RFC 9728) for /api/mcp. Rewritten from
// /.well-known/oauth-protected-resource (and its path-suffixed variant) in
// next.config.ts.

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return NextResponse.json(protectedResourceMetadata(requestOrigin(req)), { headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
