import type { MetadataRoute } from "next";
import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { PEOPLES_RATING_SLUGS } from "@/lib/ultra";
import reviewsIndex from "@/data/reviewsIndex.json";
import { LOCALES } from "@/site/i18n/locales";
import { FREE_IDEAS, isLaunchCategory, LAUNCH_CATEGORIES } from "@/site/manifest.generated";
import oldSite from "@/site/sitedata/old-site.snapshot.json";

const BASE = "https://inapp.pro";
const oldTopicPages: ReadonlySet<string> = new Set((oldSite as { topicPages: string[] }).topicPages);

// /sitemap.xml — also dot-suffixed, so the locale proxy skips it.
//   • NEW site (docs/site-v2): every indexable page in all 5 locales, one entry per locale, each
//     with the full hreflang set (+ x-default → en). Locked ideas are noindex → only the free
//     ones; /old/** is never listed (noindex archive).
//   • OLD pages still served in place at their original URLs (ru/en): the /ru URL with ru/en
//     hreflang alternates, as before. Old URLs now owned by the new site (home, /ideas, the 35
//     launch topics) are listed once, as new-site entries.
export default function sitemap(): MetadataRoute.Sitemap {
  const cats = active as string[];

  // Per-app teardown pages (/<app-slug>) are now real indexed landing pages that
  // funnel into the niche — list every one so search engines can reach them.
  const appSlugs = new Set<string>();
  for (const cs of cats) {
    const cat = getCategoryBySlug(cs, "en");
    if (!cat) continue;
    for (const a of cat.apps) {
      if (!a.productId || !hasInsight(a.productId)) continue;
      const s = getSlugByProductId(a.productId);
      if (s) appSlugs.add(s);
    }
  }

  // Every app's reviews-by-theme page is a real page of primary source text —
  // exactly what search engines and LLMs cite, so all of them go in.
  const reviewNiches = Object.entries(reviewsIndex as Record<string, { apps: { id: string }[] }>);

  const paths: { p: string; priority: number }[] = [
    { p: "/mcp", priority: 0.8 },
    { p: "/reviews", priority: 0.9 },
    ...reviewNiches.map(([s]) => ({ p: `/reviews/${s}`, priority: 0.8 })),
    ...reviewNiches.flatMap(([s, n]) => n.apps.map((a) => ({ p: `/reviews/${s}/${a.id}`, priority: 0.6 }))),
    { p: "/build", priority: 0.9 },
    { p: "/rating", priority: 0.95 },
    { p: "/ideas/top", priority: 0.8 },
    { p: "/most-wanted", priority: 0.9 },
    { p: "/cards", priority: 0.9 },
    { p: "/apps", priority: 0.6 },
    // Non-launch topics keep their old page in place — only those that render (e.g. astrology
    // has no review corpus and 404s; src/site/sitedata/build-old-site-snapshot.ts).
    ...cats
      .filter((s) => !isLaunchCategory(s) && oldTopicPages.has(s))
      .map((s) => ({ p: `/segment/${s}`, priority: 0.85 })),
    // The rating page also needs the topic's review corpus (same gap as the topic page above).
    ...PEOPLES_RATING_SLUGS.filter((s) => oldTopicPages.has(s)).map((s) => ({ p: `/rating/${s}`, priority: 0.95 })),
    ...[...appSlugs].map((s) => ({ p: `/${s}`, priority: 0.7 })),
  ];

  // Fresh timestamp so search engines see the site is actively maintained
  // (a fixed date reads as "abandoned"). Content force-dynamic + rebuilt weekly.
  const lastModified = new Date();
  const oldEntries: MetadataRoute.Sitemap = paths.map(({ p, priority }) => ({
    url: `${BASE}/ru${p || "/"}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: { ru: `${BASE}/ru${p || "/"}`, en: `${BASE}/en${p || "/"}`, "x-default": `${BASE}/en${p || "/"}` } },
  }));

  // New site: same path in every locale (the pages' own canonical/hreflang use the same shape).
  const newUrl = (l: string, p: string) => `${BASE}/${l}${p}`;
  const newPaths: { p: string; priority: number }[] = [
    { p: "", priority: 1 },
    { p: "/segment", priority: 0.95 },
    ...LAUNCH_CATEGORIES.map((s) => ({ p: `/segment/${s}`, priority: 0.9 })),
    { p: "/ideas", priority: 0.95 },
    ...FREE_IDEAS.map((id) => ({ p: `/ideas/${id}`, priority: 0.8 })),
    { p: "/contacts", priority: 0.4 },
    { p: "/offer", priority: 0.3 },
    { p: "/privacy", priority: 0.3 },
  ];
  const newEntries: MetadataRoute.Sitemap = newPaths.flatMap(({ p, priority }) => {
    const languages: Record<string, string> = Object.fromEntries(LOCALES.map((l) => [l, newUrl(l, p)]));
    languages["x-default"] = newUrl("en", p);
    return LOCALES.map((l) => ({
      url: newUrl(l, p),
      lastModified,
      changeFrequency: "weekly" as const,
      priority,
      alternates: { languages },
    }));
  });
  // The website's payment offer is a Russian-only document (other locales are noindex copies).
  newEntries.push({ url: `${BASE}/ru/offer/payment`, lastModified, changeFrequency: "monthly", priority: 0.2 });

  // One entry per URL (first wins: new-site entries carry the full hreflang set).
  const seen = new Set<string>();
  return [...newEntries, ...oldEntries].filter((e) => !seen.has(e.url) && !!seen.add(e.url));
}
