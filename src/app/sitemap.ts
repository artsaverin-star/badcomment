import type { MetadataRoute } from "next";
import active from "@/data/active-categories.json";

const BASE = "https://inapp.pro";

// /sitemap.xml — also dot-suffixed, so the locale proxy skips it. Lists both
// locale prefixes via hreflang alternates so RU and EN both get indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const cats = active as string[];

  // Standalone idea (/ideas/<slug>) and app (/<app>) pages are retired — they
  // redirect to the category page, so all findability funnels through the
  // in-interface category pages. Not listed here.
  const paths: { p: string; priority: number }[] = [
    { p: "", priority: 1 },
    { p: "/catalog", priority: 0.9 },
    ...cats.map((s) => ({ p: `/segment/${s}`, priority: 0.85 })),
  ];

  const lastModified = new Date("2026-06-20");
  return paths.map(({ p, priority }) => ({
    url: `${BASE}/ru${p || "/"}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: { ru: `${BASE}/ru${p || "/"}`, en: `${BASE}/en${p || "/"}`, "x-default": `${BASE}/en${p || "/"}` } },
  }));
}
