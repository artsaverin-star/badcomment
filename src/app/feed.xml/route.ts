import { SITE_URL } from "@/site/config";
import { getCatalog, getManifest } from "@/site/content";
import { h1Name } from "@/site/features/rating/seo";
import { ratingStrings } from "@/site/features/rating/strings";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { getRatingNiche, listRatingNiches } from "@/site/sitedata/rating";

export const dynamic = "force-static";

// /feed.xml — RSS of the site's category pages: the 35 research breakdowns (their public card)
// and the 71 app ratings. Read by feed aggregators and some AI crawlers; another discovery
// surface. Contains a dot, so the locale proxy skips it. English (broadest reach), /en links.

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function item(title: string, path: string, description: string, date: string): string {
  const link = `${SITE_URL}${path}`;
  return (
    `<item><title>${esc(title)}</title><link>${link}</link><guid isPermaLink="true">${link}</guid>` +
    `<description>${esc(description)}</description><pubDate>${new Date(date).toUTCString()}</pubDate></item>`
  );
}

export async function GET() {
  const [catalog, manifest] = await Promise.all([getCatalog("en"), getManifest()]);
  const s = ratingStrings.en;
  const items: string[] = catalog.categories.map((c) => item(c.name, routes.topic("en", c.slug), c.summary, manifest.contentBuiltAt));
  for (const card of listRatingNiches("en")) {
    const niche = getRatingNiche("en", card.slug);
    if (!niche) continue;
    items.push(item(format(s.nicheH1, { name: h1Name("en", niche) }), routes.ratingNiche("en", niche.slug), niche.intro ?? "", niche.updatedAt));
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
    `<title>inApp — app categories through their reviews</title>\n` +
    `<link>${SITE_URL}/en</link>\n` +
    `<description>What app users value, what breaks for them and what they still miss: research breakdowns and free app ratings built from App Store reviews.</description>\n` +
    `<language>en</language>\n` +
    `<atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    items.join("\n") +
    `\n</channel>\n</rss>\n`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
