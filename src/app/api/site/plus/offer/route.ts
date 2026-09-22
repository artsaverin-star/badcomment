import { plusOfferData } from "@/site/features/plus/server";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";

// GET /api/site/plus/offer?lang=<ru|en|de|fr|ja> → PlusOfferData (price label, benefit lines,
// free-topic link) for the global paywall sheet. The sheet loads it only when it opens, so the
// web price never sits in the HTML/RSC payload of pages without buy UI (landing, the
// Apple-facing /offer and /contacts — DECISIONS "Legal pages"). /<L>/plus renders it itself.

export async function GET(req: Request) {
  const lang = new URL(req.url).searchParams.get("lang");
  if (!isLocale(lang)) {
    return Response.json({ error: "lang must be one of ru, en, de, fr, ja" }, { status: 400 });
  }
  const t = await getT(lang);
  return Response.json(plusOfferData(lang, t), {
    headers: { "Cache-Control": "public, max-age=300", "X-Robots-Tag": "noindex" },
  });
}
