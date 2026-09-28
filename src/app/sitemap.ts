import type { MetadataRoute } from "next";
import reviewsIndex from "@/data/reviewsIndex.json";
import { getManifest } from "@/site/content";
import { LOCALES } from "@/site/i18n/locales";
import { FREE_IDEAS, LAUNCH_CATEGORIES } from "@/site/manifest.generated";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { ratingHubEntries } from "@/site/sitedata/rating-sitemap";

const BASE = "https://inapp.pro";

// /sitemap.xml — dot-suffixed, so the locale proxy skips it.
//   • Site pages: every indexable page in all 5 locales, one entry per locale, each with the
//     full hreflang set (+ x-default → en). Locked ideas are noindex → only the free ones.
//   • The review archive: its data speaks ru/en only — the /ru URL with ru/en alternates.
//   • The rating (ru/en data): /rating and its 71 niche pages, one entry per ru AND en page
//     (src/site/sitedata/rating-sitemap.ts); its app and task pages are in
//     /sitemap-rating-{ru,en}.xml (spec 11 §6.5), listed in robots.txt.
//   • «Пульс» (docs/site-v2/PULSE.md): the feed and every need page, in all 5 locales.
// The retired old site's URLs are not listed: they answer 301 (src/site/routing/decide.ts).
//
// <lastmod> is honest (Bing and Google ignore a sitemap whose dates always say "now"): the app
// content's build time for pages made from it, the «Пульс» data's generation time, the rating
// files' own dates; pages without a known date (legal, MCP) carry none.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [manifest, pulse] = await Promise.all([getManifest(), getPulseDemand()]);
  const content = new Date(manifest.contentBuiltAt);
  const pulseDate = pulse.generatedAt ? new Date(pulse.generatedAt) : undefined;

  // Site pages: same path in every locale (the pages' own canonical/hreflang use the same shape).
  const url = (l: string, p: string) => `${BASE}/${l}${p}`;
  const pages: { p: string; priority: number; lastModified?: Date }[] = [
    { p: "/segment", priority: 0.95, lastModified: content },
    ...LAUNCH_CATEGORIES.map((s) => ({ p: `/segment/${s}`, priority: 0.9, lastModified: content })),
    { p: "/ideas", priority: 0.95, lastModified: content },
    ...FREE_IDEAS.map((id) => ({ p: `/ideas/${id}`, priority: 0.8, lastModified: content })),
    { p: "/pulse", priority: 0.9, lastModified: pulseDate },
    ...pulse.needs.map((need) => ({ p: `/pulse/${need.id}`, priority: 0.7, lastModified: pulseDate })),
    // Web-only pages translated into all five languages.
    { p: "/mcp", priority: 0.8 },
    { p: "/reviews/methodology", priority: 0.5 },
    { p: "/contacts", priority: 0.4 },
    { p: "/offer", priority: 0.3 },
    { p: "/privacy", priority: 0.3 },
  ];
  const siteEntries: MetadataRoute.Sitemap = pages.flatMap(({ p, priority, lastModified }) => {
    const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [l, url(l, p)]));
    languages["x-default"] = url("en", p);
    return LOCALES.map((l) => ({
      url: url(l, p),
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
  // The website's payment offer is a Russian-only document (other locales are noindex copies).
  siteEntries.push({ url: `${BASE}/ru/offer/payment`, changeFrequency: "monthly", priority: 0.2 });

  // The review archive (ru/en data): the hub, its niches and every app's reviews by theme —
  // primary source text, exactly what search engines and LLMs cite. The ru page is listed with
  // its ru/en alternates (their canonicals agree).
  const reviewNiches = Object.entries(reviewsIndex as Record<string, { apps: { id: string }[] }>);
  const reviewPaths: { p: string; priority: number }[] = [
    { p: "/reviews", priority: 0.9 },
    ...reviewNiches.map(([s]) => ({ p: `/reviews/${s}`, priority: 0.8 })),
    ...reviewNiches.flatMap(([s, n]) => n.apps.map((a) => ({ p: `/reviews/${s}/${a.id}`, priority: 0.6 }))),
  ];
  const reviewEntries: MetadataRoute.Sitemap = reviewPaths.map(({ p, priority }) => ({
    url: url("ru", p),
    changeFrequency: "monthly",
    priority,
    alternates: { languages: { ru: url("ru", p), en: url("en", p), "x-default": url("en", p) } },
  }));

  // One entry per URL (first wins: site entries carry the full hreflang set).
  const seen = new Set<string>();
  return [...siteEntries, ...ratingHubEntries(), ...reviewEntries].filter((e) => !seen.has(e.url) && !!seen.add(e.url));
}
