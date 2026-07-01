import type { MetadataRoute } from "next";
import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { PEOPLES_RATING_SLUGS } from "@/lib/ultra";

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

  const paths: { p: string; priority: number }[] = [
    { p: "", priority: 1 },
    { p: "/categories", priority: 0.95 },
    { p: "/rating", priority: 0.95 },
    { p: "/ideas/top", priority: 0.8 },
    { p: "/most-wanted", priority: 0.9 },
    { p: "/cards", priority: 0.9 },
    { p: "/apps", priority: 0.6 },
    ...cats.map((s) => ({ p: `/segment/${s}`, priority: 0.85 })),
    ...PEOPLES_RATING_SLUGS.map((s) => ({ p: `/rating/${s}`, priority: 0.95 })),
    ...[...appSlugs].map((s) => ({ p: `/${s}`, priority: 0.7 })),
  ];

  const lastModified = new Date("2026-06-25");
  return paths.map(({ p, priority }) => ({
    url: `${BASE}/ru${p || "/"}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: { ru: `${BASE}/ru${p || "/"}`, en: `${BASE}/en${p || "/"}`, "x-default": `${BASE}/en${p || "/"}` } },
  }));
}
