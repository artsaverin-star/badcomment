import fs from "node:fs";
import path from "node:path";
import reviewsIndex from "@/data/reviewsIndex.json";
import reviewsProgress from "@/data/reviewsProgress.json";
import type { Locale } from "./i18n";

// The /reviews section: every app broken down into ITS OWN emergent themes.
// The shipped index (src/data/reviewsIndex.json) is compact — themes + counts
// only. The review texts live in public/reviews/<slug>/<id>.json and are read
// on demand (server-side for the first screen, lazily by the browser for the
// rest) so a 500-review app never bloats the index.

export type Polarity = "love" | "pain" | "mixed";
export type ReviewTheme = { name: string; nameEn: string; polarity: Polarity; count: number };
export type ReviewApp = { id: string; title: string; total: number; themes: ReviewTheme[]; icon?: string };
export type ReviewNiche = { name: string; nameEn: string; appsPlanned: number; apps: ReviewApp[] };
export type Review = { rating: number; text: string; theme: string };

const IDX = reviewsIndex as unknown as Record<string, ReviewNiche>;

/**
 * How far the labelling pass has got. The section ships as it goes, so every
 * surface states the real coverage instead of implying the catalog is done.
 */
export type Progress = {
  nichesDone: number;
  nichesPlanned: number;
  appsDone: number;
  appsPlanned: number;
  reviews: number;
  updatedAt: string;
};
export const progress = reviewsProgress as Progress;

export const nicheName = (n: { name: string; nameEn?: string }, locale: Locale) =>
  locale === "en" ? n.nameEn || n.name : n.name;

export const themeLabel = (t: ReviewTheme, locale: Locale) => (locale === "en" ? t.nameEn || t.name : t.name);

/** Share of the app's reviews sitting under love / pain / mixed themes. */
export function split(themes: ReviewTheme[]) {
  const s = { love: 0, pain: 0, mixed: 0 };
  for (const t of themes) s[t.polarity] = (s[t.polarity] || 0) + t.count;
  const total = s.love + s.pain + s.mixed || 1;
  return { ...s, total, lovePct: (s.love / total) * 100, painPct: (s.pain / total) * 100, mixedPct: (s.mixed / total) * 100 };
}

/** The single loudest theme of one polarity across a whole niche. */
export function loudest(apps: ReviewApp[], polarity: Polarity): ReviewTheme | null {
  let best: ReviewTheme | null = null;
  for (const a of apps) for (const t of a.themes) if (t.polarity === polarity && (!best || t.count > best.count)) best = t;
  return best;
}

export type NicheSummary = {
  slug: string;
  name: string;
  apps: number;
  appsPlanned: number;
  reviews: number;
  themes: number;
  split: ReturnType<typeof split>;
  topPain: ReviewTheme | null;
  topLove: ReviewTheme | null;
};

export function listNiches(locale: Locale): NicheSummary[] {
  return Object.entries(IDX)
    .map(([slug, n]) => {
      const themes = n.apps.flatMap((a) => a.themes);
      return {
        slug,
        name: nicheName(n, locale),
        apps: n.apps.length,
        appsPlanned: n.appsPlanned || n.apps.length,
        reviews: n.apps.reduce((s, a) => s + (a.total || 0), 0),
        themes: themes.length,
        split: split(themes),
        topPain: loudest(n.apps, "pain"),
        topLove: loudest(n.apps, "love"),
      };
    })
    .sort((a, b) => b.reviews - a.reviews);
}

export function getNiche(slug: string): ReviewNiche | null {
  return IDX[slug] ?? null;
}

export function getApp(slug: string, id: string): ReviewApp | null {
  return IDX[slug]?.apps.find((a) => a.id === id) ?? null;
}

/** Catalog-wide totals for the section hero. */
export function totals() {
  const niches = Object.values(IDX);
  const apps = niches.flatMap((n) => n.apps);
  return {
    niches: niches.length,
    apps: apps.length,
    reviews: apps.reduce((s, a) => s + (a.total || 0), 0),
    themes: apps.reduce((s, a) => s + a.themes.length, 0),
  };
}

/** Read an app's review file off disk (public/ is on the box next to the app). */
export function readReviews(slug: string, id: string): Review[] {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^[0-9]+$/.test(id)) return [];
  try {
    const p = path.join(process.cwd(), "public", "reviews", slug, `${id}.json`);
    const d = JSON.parse(fs.readFileSync(p, "utf8")) as { reviews?: Review[] };
    return Array.isArray(d.reviews) ? d.reviews : [];
  } catch {
    return [];
  }
}
