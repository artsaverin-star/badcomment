// «Отзывы» on the new site (docs/site-v2/DECISIONS.md «Web-only sections»): a read-only view of
// the old review archive (src/lib/reviews.ts): categories → apps → every review of an app with
// its rating and topics. Review texts are App Store originals (English); topic names speak
// ru/en — de/fr/ja read the English names (dataLocale). Category names are the rating's
// (ratingNicheName: the app's topic names, de/fr/ja own names for the launch topics), so a niche
// is called the same on rating and review pages; render them with lang={nameLang}. `titleName`
// keeps the archive's previous name for <title>s and meta (redesign spec §8 «Reviews», §10 Q13).
//
//   reviewTotals()                 corpus size for the section heads and the methodology
//   listReviewNiches(L)            every category of the source corpus, biggest first
//   getReviewNiche(L, niche)       one category: its apps (public catalogue fields only)
//   getReviewApp(L, niche, id)     one app: counts and topics (labels in the page's language)
//   firstReviews(niche, id, n)     the first screen of review texts — GATE FIRST (viewer.canReadReviews)
//
// Paid text never leaves the server without access: the pages check viewer.canReadReviews()
// before calling firstReviews(), and the rest of the list comes from GET /api/reviews/<niche>/<id>,
// which applies the same rule (src/lib/reviewAccess.ts).

import "server-only";

import { RATING_BY_SLUG } from "@/data/peoplesRating";
import {
  getApp,
  getNiche,
  listReviewCatalogue,
  listSourceApps,
  progress,
  readReviews,
  totals,
  type Review,
} from "@/lib/reviews";
import { FREE_REVIEW_CATEGORY } from "@/lib/reviewAccess";
import { compareNames } from "../content/text";
import { toOldLocale, type Locale, type OldLocale } from "../i18n/locales";
import { ratingNicheName } from "./rating";

const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The archive's open sample category (src/lib/reviewAccess.ts): everyone reads it in full. */
export const FREE_REVIEW_NICHE = FREE_REVIEW_CATEGORY;
const SAFE_ID = /^[0-9]{1,20}$/;
const RATING = RATING_BY_SLUG as unknown as Record<string, { apps?: { id: string; icon?: string | null }[] }>;

/** The language of topic names (and review metadata) for a page locale: ru stays ru, others read English. */
export function reviewDataLocale(l: Locale): OldLocale {
  return toOldLocale(l);
}

/** A category's display name: the rating's name when the niche is rated, else the archive's. */
function displayName(l: Locale, slug: string, archiveName: string): { name: string; nameLang: Locale } {
  return ratingNicheName(l, slug) ?? { name: archiveName, nameLang: reviewDataLocale(l) };
}

export type ReviewTotals = {
  niches: number;
  apps: number;
  reviews: number;
  labelledReviews: number;
  themeAssignments: number;
  specificReviews: number;
  specificCoveragePct: number;
  /** The deeper per-app topic layer (29 niches so far). */
  deepApps: number;
  deepAppsPlanned: number;
  deepReviewsPct: number;
  updatedAt: string;
};

let totalsCache: ReviewTotals | null = null;

export function reviewTotals(): ReviewTotals {
  if (totalsCache) return totalsCache;
  const t = totals();
  totalsCache = {
    niches: t.sourceNiches,
    apps: t.sourceApps,
    reviews: t.sourceReviews,
    labelledReviews: t.labelledReviews,
    themeAssignments: t.themeAssignments,
    specificReviews: t.sourceSpecificReviews,
    specificCoveragePct: t.sourceSpecificCoveragePct,
    deepApps: progress.appsDone,
    deepAppsPlanned: progress.appsPlanned,
    deepReviewsPct: t.sourceReviews ? (t.reviews / t.sourceReviews) * 100 : 0,
    updatedAt: progress.updatedAt,
  };
  return totalsCache;
}

// ---------------------------------------------------------------------------------------------
// Icons: the archive keeps artwork only for its deeply labelled apps; the rating of the same
// niche has it for nearly every app (same App Store ids).
// ---------------------------------------------------------------------------------------------

const iconCache = new Map<string, Map<string, string>>();

function iconsOf(niche: string): Map<string, string> {
  const hit = iconCache.get(niche);
  if (hit) return hit;
  const icons = new Map<string, string>();
  for (const app of RATING[niche]?.apps ?? []) if (app.icon) icons.set(app.id, app.icon);
  for (const app of getNiche(niche)?.apps ?? []) if (app.icon) icons.set(app.id, app.icon);
  iconCache.set(niche, icons);
  return icons;
}

// ---------------------------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------------------------

export type ReviewNicheRow = {
  slug: string;
  /** Display name (H1s, rows) and its language. */
  name: string;
  nameLang: Locale;
  /** The archive's own name, for <title>s and meta descriptions (unchanged for SEO). */
  titleName: string;
  apps: number;
  reviews: number;
};

const nicheListCache = new Map<Locale, ReviewNicheRow[]>();

/**
 * Every category with apps, alphabetical by the displayed name — the order of the app's
 * category lists and of the rating catalogue (localizedStandardCompare, ClarityRatings.swift:
 * 71-74; listRatingNiches), not the corpus order.
 */
export function listReviewNiches(l: Locale): ReviewNicheRow[] {
  const hit = nicheListCache.get(l);
  if (hit) return hit;
  const rows = listReviewCatalogue(reviewDataLocale(l))
    .map((n) => ({
      slug: n.slug,
      ...displayName(l, n.slug, n.name),
      titleName: n.name,
      apps: listSourceApps(n.slug).length,
      reviews: n.sourceReviews,
    }))
    .filter((n) => n.apps > 0)
    .sort((a, b) => compareNames(a.name, b.name, l) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  nicheListCache.set(l, rows);
  return rows;
}

export type ReviewAppRow = {
  id: string;
  title: string;
  icon: string | null;
  reviews: number;
  /** Topics with a concrete story (the «without a specific reason» buckets are not counted). */
  topics: number;
  /** Topic labels, for the app search on the category page. */
  topicNames: string[];
};

export type ReviewNicheView = {
  slug: string;
  /** Display name (H1s, rows) and its language. */
  name: string;
  nameLang: Locale;
  /** The archive's own name, for <title>s and meta descriptions (unchanged for SEO). */
  titleName: string;
  reviews: number;
  apps: ReviewAppRow[];
};

/** A category and its apps — public catalogue fields only (names, counts, icons). */
export function getReviewNiche(l: Locale, niche: string): ReviewNicheView | null {
  if (!SAFE_SLUG.test(niche)) return null;
  const n = getNiche(niche);
  const source = listSourceApps(niche);
  if (!n || !source.length) return null;
  const dl = reviewDataLocale(l);
  const icons = iconsOf(niche);
  const apps = source.map((app) => ({
    id: app.id,
    title: app.title,
    icon: icons.get(app.id) ?? null,
    reviews: app.total,
    topics: app.themes.filter((th) => !th.fallback && th.scope !== "fallback").length,
    topicNames: app.themes.map((th) => (dl === "ru" ? th.name : th.nameEn || th.name)),
  }));
  const archiveName = (dl === "ru" ? n.name : n.nameEn) || n.name;
  return {
    slug: niche,
    ...displayName(l, niche, archiveName),
    titleName: archiveName,
    reviews: n.sourceReviews || apps.reduce((sum, app) => sum + app.reviews, 0),
    apps,
  };
}

// ---------------------------------------------------------------------------------------------
// One app
// ---------------------------------------------------------------------------------------------

export type ReviewTopic = {
  /** The key reviews carry in `themes` (the Russian name). */
  key: string;
  label: string;
  count: number;
  polarity: "love" | "pain" | "mixed";
  /** «Без конкретной причины» buckets: listed after the concrete topics, quieter. */
  general: boolean;
};

export type ReviewAppView = {
  /** name/nameLang: display name; titleName: the archive's own name for <title>s and meta. */
  niche: { slug: string; name: string; nameLang: Locale; titleName: string };
  id: string;
  title: string;
  icon: string | null;
  reviews: number;
  topics: ReviewTopic[];
};

export function getReviewApp(l: Locale, niche: string, id: string): ReviewAppView | null {
  if (!SAFE_SLUG.test(niche) || !SAFE_ID.test(id)) return null;
  const n = getNiche(niche);
  const app = getApp(niche, id);
  if (!n || !app) return null;
  const dl = reviewDataLocale(l);
  const topics = app.themes
    .map((th) => ({
      key: th.name,
      label: dl === "ru" ? th.name : th.nameEn || th.name,
      count: th.count,
      polarity: th.polarity,
      general: Boolean(th.fallback) || th.scope === "fallback",
    }))
    .sort((a, b) => Number(a.general) - Number(b.general) || b.count - a.count);
  const archiveName = (dl === "ru" ? n.name : n.nameEn) || n.name;
  return {
    niche: { slug: niche, ...displayName(l, niche, archiveName), titleName: archiveName },
    id,
    title: app.title,
    icon: app.icon ?? iconsOf(niche).get(id) ?? null,
    reviews: app.total,
    topics,
  };
}

export type ReviewText = { rating: number; text: string; topics: string[] };

/** Rating counts 1★…5★ and the worst-first opening screen of an app's reviews (GATED). */
export function firstReviews(niche: string, id: string, n: number): { counts: number[]; first: ReviewText[]; total: number } {
  const all = SAFE_SLUG.test(niche) && SAFE_ID.test(id) ? readReviews(niche, id) : [];
  const counts = [0, 0, 0, 0, 0];
  for (const r of all) counts[Math.max(1, Math.min(5, Math.round(r.rating))) - 1]++;
  const first = [...all]
    .sort((a, b) => a.rating - b.rating)
    .slice(0, n)
    .map(toText);
  return { counts, first, total: all.length };
}

export function toText(r: Review): ReviewText {
  return {
    rating: Math.max(1, Math.min(5, Math.round(r.rating))),
    text: r.text,
    topics: r.themes?.length ? r.themes : r.theme ? [r.theme] : [],
  };
}
