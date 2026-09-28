import { buildLlmsIndex } from "@/site/sitedata/llms";

export const dynamic = "force-static";

// /llms.txt — a Markdown map of the site for language models (llmstxt.org; src/site/sitedata/llms.ts).
export async function GET() {
  return new Response(await buildLlmsIndex(), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
