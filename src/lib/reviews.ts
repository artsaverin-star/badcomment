import fs from "node:fs";
import path from "node:path";
import reviewsIndex from "@/data/reviewsIndex.json";
import reviewsProgress from "@/data/reviewsProgress.json";
import reviewNicheCatalog from "@/data/reviewNicheCatalog.json";
import reviewNichePatterns from "@/data/reviewNichePatterns.json";
import type { Locale } from "./i18n";

// The /reviews section: every app broken down into ITS OWN emergent themes.
// The shipped index (src/data/reviewsIndex.json) is compact — themes + counts
// only. The review texts live in public/reviews/<slug>/<id>.json and are read
// on demand (server-side for the first screen, lazily by the browser for the
// rest) so a 500-review app never bloats the index.

export type Polarity = "love" | "pain" | "mixed";
export type ReviewTheme = { name: string; nameEn: string; polarity: Polarity; count: number; fallback?: boolean };
export type ReviewApp = { id: string; title: string; total: number; themes: ReviewTheme[]; icon?: string };
export type ReviewNiche = { name: string; nameEn: string; appsPlanned: number; apps: ReviewApp[]; sourceReviews?: number };
export type Review = { rating: number; text: string; theme: string };
export type NichePattern = {
  title: string;
  titleEn?: string;
  polarity: Polarity;
  plus?: string;
  plusEn?: string;
  minus?: string;
  minusEn?: string;
  count?: number;
  apps: string[];
  evidence: { app: string; rating: number; quote: string }[];
};
type NicheCatalogEntry = {
  name: string;
  nameEn: string;
  appsPlanned: number;
  sourceReviews: number;
  patterns: number;
  translatedPatterns: number;
};

const IDX = reviewsIndex as unknown as Record<string, ReviewNiche>;
const CATALOG = reviewNicheCatalog as unknown as Record<string, NicheCatalogEntry>;
const NICHE_PATTERNS = reviewNichePatterns as unknown as Record<string, NichePattern[]>;

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
  for (const a of apps) for (const t of a.themes) if (!t.fallback && t.polarity === polarity && (!best || t.count > best.count)) best = t;
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
        themes: themes.filter((t) => !t.fallback).length,
        split: split(themes),
        topPain: loudest(n.apps, "pain"),
        topLove: loudest(n.apps, "love"),
      };
    })
    .sort((a, b) => b.reviews - a.reviews);
}

export type ReviewCatalogueSummary = NicheSummary & {
  sourceReviews: number;
  patterns: number;
  appThemesReady: boolean;
};

/** Every review niche in the source corpus, including category-wide research
 * whose per-app labelling is still queued. */
export function listReviewCatalogue(locale: Locale): ReviewCatalogueSummary[] {
  return Object.entries(CATALOG)
    .map(([slug, catalog]) => {
      const niche = IDX[slug];
      const apps = niche?.apps || [];
      const themes = apps.flatMap((app) => app.themes);
      return {
        slug,
        name: locale === "en" ? catalog.nameEn || catalog.name : catalog.name,
        apps: apps.length,
        appsPlanned: catalog.appsPlanned,
        reviews: apps.reduce((sum, app) => sum + (app.total || 0), 0),
        sourceReviews: catalog.sourceReviews,
        themes: themes.filter((theme) => !theme.fallback).length,
        patterns: locale === "en" ? catalog.translatedPatterns : catalog.patterns,
        appThemesReady: apps.length > 0,
        split: split(themes),
        topPain: loudest(apps, "pain"),
        topLove: loudest(apps, "love"),
      };
    })
    .sort((a, b) => b.sourceReviews - a.sourceReviews);
}

export function getNiche(slug: string): ReviewNiche | null {
  const niche = IDX[slug];
  const catalog = CATALOG[slug];
  if (niche) return { ...niche, sourceReviews: catalog?.sourceReviews };
  if (!catalog) return null;
  return { name: catalog.name, nameEn: catalog.nameEn, appsPlanned: catalog.appsPlanned, sourceReviews: catalog.sourceReviews, apps: [] };
}

export function getNichePatterns(slug: string, locale: Locale): NichePattern[] {
  const patterns = NICHE_PATTERNS[slug] || [];
  return locale === "en" ? patterns.filter((pattern) => pattern.titleEn) : patterns;
}

export function getApp(slug: string, id: string): ReviewApp | null {
  return IDX[slug]?.apps.find((a) => a.id === id) ?? null;
}

/** Catalog-wide totals for the section hero. */
export function totals() {
  const niches = Object.values(IDX);
  const apps = niches.flatMap((n) => n.apps);
  const themes = apps.flatMap((a) => a.themes);
  const fallbackReviews = themes.filter((t) => t.fallback).reduce((sum, theme) => sum + theme.count, 0);
  const reviews = apps.reduce((s, a) => s + (a.total || 0), 0);
  return {
    niches: niches.length,
    apps: apps.length,
    reviews,
    themes: themes.filter((t) => !t.fallback).length,
    fallbackReviews,
    specificCoveragePct: reviews ? ((reviews - fallbackReviews) / reviews) * 100 : 0,
    sourceNiches: Object.keys(CATALOG).length,
    sourceApps: Object.values(CATALOG).reduce((sum, niche) => sum + niche.appsPlanned, 0),
    sourceReviews: Object.values(CATALOG).reduce((sum, niche) => sum + niche.sourceReviews, 0),
    nichePatterns: Object.values(NICHE_PATTERNS).reduce((sum, patterns) => sum + patterns.length, 0),
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
