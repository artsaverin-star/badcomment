import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import reviewsIndex from "@/data/reviewsIndex.json";
import reviewsProgress from "@/data/reviewsProgress.json";
import reviewNicheCatalog from "@/data/reviewNicheCatalog.json";
import reviewNichePatterns from "@/data/reviewNichePatterns.json";
import reviewSourceIndex from "@/data/reviewSourceIndex.json";
import type { Locale } from "./i18n";

// The /reviews section: every app broken down into ITS OWN emergent themes.
// The shipped index (src/data/reviewsIndex.json) is compact — themes + counts
// only. The review texts live in public/reviews/<slug>/<id>.json and are read
// on demand (server-side for the first screen, lazily by the browser for the
// rest) so a 500-review app never bloats the index.

export type Polarity = "love" | "pain" | "mixed";
export type ThemeScope = "app" | "niche" | "universal" | "fallback";
export type LabellingScope = "app" | "corpus" | "app+corpus";
export type ReviewTheme = { name: string; nameEn: string; polarity: Polarity; count: number; fallback?: boolean; scope?: ThemeScope };
export type ReviewApp = { id: string; title: string; total: number; themes: ReviewTheme[]; specificReviews?: number; themeAssignments?: number; icon?: string; labelling?: LabellingScope };
export type ReviewSourceApp = { id: string; title: string; total: number; themes: ReviewTheme[]; specificReviews: number; themeAssignments: number; labelling: LabellingScope };
export type ReviewNiche = { name: string; nameEn: string; appsPlanned: number; apps: ReviewApp[]; sourceReviews?: number };
export type Review = { rating: number; text: string; theme?: string; themes?: string[] };
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
type ReviewSourceIndex = {
  totalApps: number;
  totalReviews: number;
  detailedApps: number;
  archivedApps: number;
  archivedReviews: number;
  repairedApps: number;
  repairedReviews: number;
  labelledReviews: number;
  specificLabelledReviews: number;
  nicheLabelledReviews: number;
  universalLabelledReviews: number;
  fallbackLabelledReviews: number;
  themeAssignments: number;
  archiveOverrides: Record<string, string[]>;
  niches: Record<string, ReviewSourceApp[]>;
};

const IDX = reviewsIndex as unknown as Record<string, ReviewNiche>;
const CATALOG = reviewNicheCatalog as unknown as Record<string, NicheCatalogEntry>;
const NICHE_PATTERNS = reviewNichePatterns as unknown as Record<string, NichePattern[]>;
const SOURCE = reviewSourceIndex as ReviewSourceIndex;

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

/** Every app whose source reviews are present, whether or not product-topic
 * labelling has been completed for it. */
export function listSourceApps(slug: string): ReviewSourceApp[] {
  return SOURCE.niches[slug] || [];
}

export function getSourceApp(slug: string, id: string): ReviewSourceApp | null {
  return SOURCE.niches[slug]?.find((app) => app.id === id) ?? null;
}

export function getApp(slug: string, id: string): ReviewApp | null {
  const detailed = IDX[slug]?.apps.find((app) => app.id === id);
  const source = getSourceApp(slug, id);
  if (source) return { ...source, icon: detailed?.icon };
  return detailed ?? null;
}

/** Catalog-wide totals for the section hero. */
export function totals() {
  const niches = Object.values(IDX);
  const apps = niches.flatMap((n) => n.apps);
  const themes = apps.flatMap((a) => a.themes);
  const fallbackReviews = themes.filter((t) => t.fallback).reduce((sum, theme) => sum + theme.count, 0);
  const specificReviews = themes.filter((t) => !t.fallback).reduce((sum, theme) => sum + theme.count, 0);
  const reviews = apps.reduce((s, a) => s + (a.total || 0), 0);
  return {
    niches: niches.length,
    apps: apps.length,
    reviews,
    themes: themes.filter((t) => !t.fallback).length,
    fallbackReviews,
    specificReviews,
    specificCoveragePct: reviews ? (specificReviews / reviews) * 100 : 0,
    sourceNiches: Object.keys(CATALOG).length,
    sourceApps: SOURCE.totalApps,
    sourceReviews: SOURCE.totalReviews,
    labelledReviews: SOURCE.labelledReviews,
    sourceSpecificReviews: SOURCE.specificLabelledReviews,
    sourceSpecificCoveragePct: SOURCE.totalReviews ? (SOURCE.specificLabelledReviews / SOURCE.totalReviews) * 100 : 0,
    nicheLabelledReviews: SOURCE.nicheLabelledReviews,
    universalLabelledReviews: SOURCE.universalLabelledReviews,
    sourceFallbackReviews: SOURCE.fallbackLabelledReviews,
    themeAssignments: SOURCE.themeAssignments,
    nichePatterns: Object.values(NICHE_PATTERNS).reduce((sum, patterns) => sum + patterns.length, 0),
  };
}

type ArchivedNiche = { apps?: { id: string; reviews: Review[] }[] };
const archiveCache = new Map<string, Map<string, Review[]>>();
const MAX_CACHED_NICHES = 4;

function readArchivedNiche(slug: string): Map<string, Review[]> {
  const cached = archiveCache.get(slug);
  if (cached) {
    archiveCache.delete(slug);
    archiveCache.set(slug, cached);
    return cached;
  }

  const result = new Map<string, Review[]>();
  try {
    const archivePath = path.join(process.cwd(), "public", "reviews-source", `${slug}.json.gz`);
    const archive = JSON.parse(gunzipSync(fs.readFileSync(archivePath)).toString("utf8")) as ArchivedNiche;
    for (const app of archive.apps || []) if (Array.isArray(app.reviews)) result.set(app.id, app.reviews);
  } catch {
    return result;
  }

  archiveCache.set(slug, result);
  while (archiveCache.size > MAX_CACHED_NICHES) archiveCache.delete(archiveCache.keys().next().value!);
  return result;
}

/** Read one app's complete, per-review-labelled text corpus. */
export function readReviews(slug: string, id: string): Review[] {
  if (!/^[a-z0-9-]+$/.test(slug) || !/^[0-9]+$/.test(id)) return [];
  const archived = readArchivedNiche(slug).get(id);
  if (archived) return archived;
  try {
    const p = path.join(process.cwd(), "public", "reviews", slug, `${id}.json`);
    const d = JSON.parse(fs.readFileSync(p, "utf8")) as { reviews?: Review[] };
    return Array.isArray(d.reviews) ? d.reviews : [];
  } catch { return []; }
}
