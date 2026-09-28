import { buildLlmsFull } from "@/site/sitedata/llms";

export const dynamic = "force-static";

// /llms-full.ru.txt — всё открытое содержимое сайта в Markdown, по-русски (src/site/sitedata/llms.ts).
export async function GET() {
  return new Response(await buildLlmsFull("ru"), {
    headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
