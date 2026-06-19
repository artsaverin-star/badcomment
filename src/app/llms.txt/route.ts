import { buildLlmsIndex } from "@/lib/llms";

export const dynamic = "force-static";

// /llms.txt — concise Markdown map of the site for LLMs (emerging standard).
export function GET() {
  return new Response(buildLlmsIndex(), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
