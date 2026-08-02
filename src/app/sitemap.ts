import type { MetadataRoute } from "next";
import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { PEOPLES_RATING_SLUGS } from "@/lib/ultra";
import reviewsIndex from "@/data/reviewsIndex.json";

const BASE = "https://inapp.pro";

// /sitemap.xml — also dot-suffixed, so the locale proxy skips it. Lists both
// locale prefixes via hreflang alternates so RU and EN both get indexed.
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
    { p: "", priority: 1 },
    { p: "/mcp", priority: 0.8 },
    { p: "/reviews", priority: 0.9 },
    ...reviewNiches.map(([s]) => ({ p: `/reviews/${s}`, priority: 0.8 })),
    ...reviewNiches.flatMap(([s, n]) => n.apps.map((a) => ({ p: `/reviews/${s}/${a.id}`, priority: 0.6 }))),
    { p: "/build", priority: 0.9 },
    { p: "/ideas", priority: 0.95 },
    { p: "/rating", priority: 0.95 },
    { p: "/ideas/top", priority: 0.8 },
    { p: "/most-wanted", priority: 0.9 },
    { p: "/cards", priority: 0.9 },
    { p: "/apps", priority: 0.6 },
    ...cats.map((s) => ({ p: `/segment/${s}`, priority: 0.85 })),
    ...PEOPLES_RATING_SLUGS.map((s) => ({ p: `/rating/${s}`, priority: 0.95 })),
    ...[...appSlugs].map((s) => ({ p: `/${s}`, priority: 0.7 })),
  ];

  // Fresh timestamp so search engines see the site is actively maintained
  // (a fixed date reads as "abandoned"). Content force-dynamic + rebuilt weekly.
  const lastModified = new Date();
  return paths.map(({ p, priority }) => ({
    url: `${BASE}/ru${p || "/"}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: { ru: `${BASE}/ru${p || "/"}`, en: `${BASE}/en${p || "/"}`, "x-default": `${BASE}/en${p || "/"}` } },
  }));
}
