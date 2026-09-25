import { ratingSitemapXml } from "@/site/sitedata/rating-sitemap";

export const dynamic = "force-static";

// /sitemap-rating-ru.xml — the rating's Russian app pages and indexable task pages, with hreflang
// and image entries (spec 11 §6.5; src/site/sitedata/rating-sitemap.ts). Listed in robots.txt.
// A dotted folder like feed.xml, so the locale proxy skips it.
export function GET() {
  return new Response(ratingSitemapXml("ru"), {
    headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
