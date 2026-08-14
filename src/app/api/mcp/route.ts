import { NextResponse } from "next/server";
import { authenticateMcpRequest, MCP_SCOPE } from "@/lib/mcp/authTokens";
import { mcpResource, requestOrigin } from "@/lib/mcp/oauth";
import { TOOLS, callTool, McpToolError, SERVER_INSTRUCTIONS } from "@/lib/mcp/tools";
import { recordMcpCall } from "@/lib/mcp/telemetry";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
const FALLBACK = "2025-06-18";
const VERSION = "2.0.0";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };

function allowedOrigins() {
  return new Set([
    "https://inapp.pro",
    "http://localhost:3000",
    "https://chatgpt.com",
    "https://claude.ai",
    "https://vscode.dev",
    "https://cursor.com",
    ...(process.env.MCP_ALLOWED_ORIGINS || "").split(",").map((value) => value.trim()).filter(Boolean),
  ]);
}

function cors(req: Request): HeadersInit | null {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return null;
  return {
    ...(origin ? { "access-control-allow-origin": origin } : {}),
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization, mcp-protocol-version, mcp-session-id",
    "access-control-expose-headers": "www-authenticate, mcp-session-id",
    vary: "Origin",
  };
}

const ok = (id: Rpc["id"], result: unknown, headers?: HeadersInit) => NextResponse.json({ jsonrpc: "2.0", id, result }, { headers });
const error = (id: Rpc["id"], code: number, message: string, headers?: HeadersInit, status = 200) =>
  NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status, headers });

function textSummary(name: string, data: Record<string, unknown>, locale: string) {
  const ru = locale === "ru";
  const shown = typeof data.shown === "number" ? data.shown : null;
  const total = typeof data.total === "number" ? data.total : null;
  if (name === "account_status") return data.fullAccess ? (ru ? "MCP подключён, полный доступ активен." : "MCP is connected and full access is active.") : (ru ? "MCP подключён. Доступны каталог и демо-ниша; полный архив закрыт." : "MCP is connected. The catalog and sample niche are available; full research is locked.");
  if (shown != null && total != null) return ru ? `${name}: показано ${shown} из ${total}. Полные данные приложены в structuredContent.` : `${name}: showing ${shown} of ${total}. Full data is attached in structuredContent.`;
  return ru ? `${name}: готово. Полные данные приложены в structuredContent.` : `${name}: complete. Full data is attached in structuredContent.`;
}

function contentFor(protocol: string, name: string, data: Record<string, unknown>, locale: string) {
  // Older clients do not reliably surface structuredContent to the model.
  if (protocol === "2024-11-05" || protocol === "2025-03-26") return JSON.stringify(data, null, 1);
  return textSummary(name, data, locale);
}

export async function POST(req: Request) {
  const corsHeaders = cors(req);
  if (!corsHeaders) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });

  const origin = requestOrigin(req);
  const resource = mcpResource(origin);
  const auth = req.headers.get("authorization");
  const identity = await authenticateMcpRequest(auth, resource);
  if (!identity) {
    return NextResponse.json(
      { error: auth?.trim() ? "invalid_token" : "authorization_required" },
      {
        status: 401,
        headers: {
          ...corsHeaders,
          "www-authenticate": `Bearer error="${auth?.trim() ? "invalid_token" : "invalid_request"}", scope="${MCP_SCOPE}", resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  let message: Rpc;
  try {
    message = (await req.json()) as Rpc;
  } catch {
    return error(null, -32700, "Parse error", corsHeaders, 400);
  }
  if (!message || message.jsonrpc !== "2.0" || typeof message.method !== "string") return error(message?.id ?? null, -32600, "Invalid Request", corsHeaders, 400);

  if (message.id === undefined || message.id === null) return new Response(null, { status: 202, headers: corsHeaders });
  const { id, method, params } = message;

  if (method === "initialize") {
    const requested = typeof params?.protocolVersion === "string" ? params.protocolVersion : "";
    return ok(
      id,
      {
        protocolVersion: SUPPORTED.includes(requested) ? requested : FALLBACK,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "inapp", title: "inApp — product research from real reviews", version: VERSION },
        instructions: SERVER_INSTRUCTIONS,
      },
      corsHeaders,
    );
  }

  const protocol = req.headers.get("mcp-protocol-version") || "2025-03-26";
  if (!SUPPORTED.includes(protocol)) return error(id, -32600, `Unsupported MCP-Protocol-Version: ${protocol}`, corsHeaders, 400);
  if (method === "ping") return ok(id, {}, corsHeaders);
  if (method === "tools/list") return ok(id, { tools: TOOLS }, corsHeaders);

  if (method === "tools/call") {
    const started = performance.now();
    const name = typeof params?.name === "string" ? params.name : "";
    const args = params?.arguments;
    if (!TOOLS.some((tool) => tool.name === name)) return error(id, -32602, `Unknown tool: ${name}`, corsHeaders);
    try {
      const data = await callTool(name, (args && typeof args === "object" && !Array.isArray(args) ? args : {}) as Record<string, unknown>, {
        user: identity.user,
        connection: identity.connection,
      });
      const responseBytes = Buffer.byteLength(JSON.stringify(data));
      await recordMcpCall({ userId: identity.user.id, connectionId: identity.connection.id, clientName: identity.connection.clientName, tool: name, status: "ok", durationMs: performance.now() - started, responseBytes });
      return ok(id, { content: [{ type: "text", text: contentFor(protocol, name, data, identity.connection.locale) }], structuredContent: data }, corsHeaders);
    } catch (cause) {
      const toolError = cause instanceof McpToolError ? cause : new McpToolError("tool_failed", cause instanceof Error ? cause.message : "Tool failed.");
      const status = toolError.code === "payment_required" ? "denied" : "error";
      await recordMcpCall({ userId: identity.user.id, connectionId: identity.connection.id, clientName: identity.connection.clientName, tool: name, status, errorCode: toolError.code, durationMs: performance.now() - started });
      // Error payloads intentionally omit structuredContent: it would not
      // satisfy the successful tool outputSchema and strict clients reject it.
      return ok(id, { content: [{ type: "text", text: toolError.message }], isError: true }, corsHeaders);
    }
  }

  return error(id, -32601, "Method not found", corsHeaders);
}

export async function GET(req: Request) {
  const corsHeaders = cors(req);
  if (!corsHeaders) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
}

export async function DELETE(req: Request) {
  const corsHeaders = cors(req);
  if (!corsHeaders) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  return NextResponse.json({ error: "method_not_allowed" }, { status: 405, headers: corsHeaders });
}

export async function OPTIONS(req: Request) {
  const corsHeaders = cors(req);
  if (!corsHeaders) return NextResponse.json({ error: "forbidden_origin" }, { status: 403 });
  return new Response(null, { status: 204, headers: corsHeaders });
}
