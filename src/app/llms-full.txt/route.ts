import { buildLlmsFull } from "@/lib/llms";

export const dynamic = "force-static";

// /llms-full.txt — the full research synthesis in Markdown, for LLM ingestion.
export function GET() {
  return new Response(buildLlmsFull("en"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
