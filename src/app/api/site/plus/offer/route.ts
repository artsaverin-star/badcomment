import { plusSheetPayload } from "@/site/features/plus/server";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";

// GET /api/site/plus/offer?lang=<ru|en|de|fr|ja> → PlusSheetPayload for the global paywall
// sheet: the offer (price label, free-topic link), the web-only paywall strings and the app UI
// strings the paywall renders. The sheet loads it only when it opens, so the web price, the
// payment methods and the buy labels never sit in the HTML/RSC payload of pages without buy UI
// (landing, the Apple-facing /offer and /contacts — DECISIONS "Legal pages"). /<L>/plus renders
// the same data itself.

export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang");
  if (!isLocale(lang)) {
    return Response.json({ error: "lang must be one of ru, en, de, fr, ja" }, { status: 400 });
  }
  const t = await getT(lang);
  return Response.json(plusSheetPayload(lang, t), {
    headers: { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" },
  });
}
