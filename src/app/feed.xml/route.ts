import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getSegmentSummary } from "@/lib/segmentSummary";

export const dynamic = "force-static";

// /feed.xml — RSS of every live niche breakdown. Read by feed aggregators and
// some AI crawlers; another discovery surface. Contains a dot, so the locale
// proxy skips it. English (broadest reach); links to the /en pages.

const BASE = "https://inapp.pro";

function esc(s: string): string {
  return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET() {
  const items: string[] = [];
  for (const slug of active as string[]) {
    const cat = getCategoryBySlug(slug, "en");
    if (!cat) continue;
    const thesis = getNicheThesis(slug, "en");
    const summary = getSegmentSummary(slug);
    const link = `${BASE}/en/segment/${slug}`;
    const desc = thesis?.governing || summary?.lead || `Review breakdown of ${cat.name} apps.`;
    items.push(
      `<item><title>${esc(cat.name)} — what to build, from real reviews</title>` +
        `<link>${link}</link><guid isPermaLink="true">${link}</guid>` +
        `<description>${esc(desc)}</description></item>`,
    );
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n` +
    `<title>inApp — app-niche research from real reviews</title>\n` +
    `<link>${BASE}</link>\n` +
    `<description>What users love, hate and miss across app niches — and which ideas are worth building.</description>\n` +
    `<language>en</language>\n` +
    `<atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>\n` +
    items.join("\n") +
    `\n</channel>\n</rss>\n`;

  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
