import { buildLlmsFull } from "@/site/sitedata/llms";

export const dynamic = "force-static";

// /llms-full.txt — everything public on the site as Markdown, English (src/site/sitedata/llms.ts).
export async function GET() {
  return new Response(await buildLlmsFull("en"), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
