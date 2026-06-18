import type { MetadataRoute } from "next";
import active from "@/data/active-categories.json";
import appSlugs from "@/data/app-slugs.json";
import { listIdeas } from "@/lib/ideas";

const BASE = "https://inapp.pro";

// /sitemap.xml — also dot-suffixed, so the locale proxy skips it. Lists both
// locale prefixes via hreflang alternates so RU and EN both get indexed.
export default function sitemap(): MetadataRoute.Sitemap {
  const cats = active as string[];
  const ideaSlugs = listIdeas().map((i) => i.slug);
  const appKeys = Object.keys(appSlugs as Record<string, string>);

  const paths: { p: string; priority: number }[] = [
    { p: "", priority: 1 },
    { p: "/catalog", priority: 0.9 },
    { p: "/ideas", priority: 0.9 },
    ...cats.map((s) => ({ p: `/segment/${s}`, priority: 0.8 })),
    ...cats.map((s) => ({ p: `/segment/${s}/test`, priority: 0.8 })),
    ...ideaSlugs.map((s) => ({ p: `/ideas/${s}`, priority: 0.7 })),
    ...appKeys.map((s) => ({ p: `/${s}`, priority: 0.6 })),
  ];

  return paths.map(({ p, priority }) => ({
    url: `${BASE}/ru${p || "/"}`,
    changeFrequency: "weekly",
    priority,
    alternates: { languages: { ru: `${BASE}/ru${p || "/"}`, en: `${BASE}/en${p || "/"}` } },
  }));
}
