import { NextResponse } from "next/server";
import { userFromAuthHeader } from "@/lib/mcp/apiKey";
import { TOOLS, callTool, SERVER_INSTRUCTIONS } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// The inApp MCP server: the same review research the site sells, handed to an
// agent while it is writing the app. Hand-rolled JSON-RPC over Streamable HTTP
// (POST only, plain application/json responses) — no SDK, because the wire
// format for a tools-only server is a dozen lines and the prod box is small.
//
// Spec: modelcontextprotocol.io, revisions 2025-03-26 .. 2025-11-25. GET and
// DELETE answer 405, which the transport spec explicitly allows for servers that
// offer no SSE stream and no sessions.

const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const FALLBACK = "2025-06-18";
const VERSION = "1.0.0";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

const ok = (id: Rpc["id"], result: unknown) => NextResponse.json({ jsonrpc: "2.0", id, result });
const err = (id: Rpc["id"], code: number, message: string) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } });

// DNS-rebinding guard. Native MCP clients send no Origin at all; a browser one
// must come from our own site.
const ALLOWED_ORIGINS = ["https://inapp.pro", "http://localhost:3000"];

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: "forbidden origin" }, { status: 403 });
  }

  let msg: Rpc;
  try {
    msg = (await req.json()) as Rpc;
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }

  // Notifications and client-side responses carry no id and expect no body.
  if (msg.id === undefined || msg.id === null) return new Response(null, { status: 202 });

  const { id, method, params } = msg;

  if (method === "initialize") {
    const asked = typeof params?.protocolVersion === "string" ? (params.protocolVersion as string) : "";
    return ok(id, {
      protocolVersion: SUPPORTED.includes(asked) ? asked : FALLBACK,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "inapp", title: "inApp — market research from real reviews", version: VERSION },
      instructions: SERVER_INSTRUCTIONS,
    });
  }

  if (method === "ping") return ok(id, {});

  if (method === "tools/list") return ok(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = typeof params?.name === "string" ? params.name : "";
    const args = (params?.arguments as Record<string, unknown>) || {};
    if (!TOOLS.some((t) => t.name === name)) return err(id, -32602, `Unknown tool: ${name}`);
    const auth = req.headers.get("authorization");
    const user = await userFromAuthHeader(auth);
    try {
      const text = await callTool(name, args, { user, keyPresent: !!auth?.trim() });
      return ok(id, { content: [{ type: "text", text }] });
    } catch (e) {
      // Tool failures belong in the result so the model can see and correct them.
      const message = e instanceof Error ? e.message : "tool failed";
      return ok(id, { content: [{ type: "text", text: message }], isError: true });
    }
  }

  return err(id, -32601, "Method not found");
}

export async function GET() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "method not allowed" }, { status: 405 });
}
