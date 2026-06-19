import { buildLlmsFull } from "@/lib/llms";

export const dynamic = "force-static";

// /llms-full.ru.txt — полное исследование на русском для Yandex / русских LLM.
export function GET() {
  return new Response(buildLlmsFull("ru"), {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
