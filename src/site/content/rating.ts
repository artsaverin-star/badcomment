// Server-only loaders for the generated rating content in content/v2/<L>/rating/** (web-only
// section «Рейтинг»; writer: scripts/v2/import-rating.ts; types: ./rating-types). The only
// consumer is src/site/sitedata/rating.ts — pages read the rating through it.
//
// - Files are read with fs and cached in a small in-process LRU, like ./index (never import
//   content JSON statically: it would bundle every locale).
// - SYNCHRONOUS on purpose: the rating adapter keeps the synchronous API the review archive and
//   the pages already use (hasRatingNiche, ratingAppSlug, ratingNicheName inside
//   sitedata/reviews.ts). Each file is read once per process (≈ 150 files, 19 MB on disk).
// - PUBLIC: the whole rating is free (owner, 2026-09-25, spec 11 D2) — quotes and task details
//   included. No viewer check belongs here or in the pages; do not add a gate back.
// - In development a changed file (re-run of the importer) is picked up without a restart.
// - A missing file reads as null (dev before the rating import).

import "server-only";

import fs from "node:fs";
import path from "node:path";

import type { RatingDataLocale, RatingIndexFile, RatingNicheFile, RatingOverlayFile, RatingOverlayLocale } from "./rating-types";
import { CONTENT_ROOT } from "./root";

export type {
  RatingAppFile,
  RatingDataLocale,
  RatingIndexEntry,
  RatingIndexFile,
  RatingNicheFile,
  RatingOverlayFile,
  RatingOverlayLocale,
  RatingQuoteFile,
  RatingScenarioFile,
} from "./rating-types";

// 2 data locales × (72 niches + index) + 3 overlays = 149 files; the cap only guards against growth.
const MAX_ENTRIES = 200;
const WATCH_MTIME = process.env.NODE_ENV !== "production";
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CacheEntry {
  value: unknown;
  mtimeMs: number;
}

const cache = new Map<string, CacheEntry>();

function loadSync(rel: string): unknown | null {
  const file = path.join(CONTENT_ROOT, rel);
  let entry = cache.get(rel);
  if (entry && WATCH_MTIME) {
    let mtimeMs: number | null = null;
    try {
      mtimeMs = fs.statSync(file).mtimeMs;
    } catch {
      /* removed */
    }
    if (mtimeMs !== entry.mtimeMs) {
      cache.delete(rel);
      entry = undefined;
    }
  }
  if (entry) {
    // LRU: move to the most recent position.
    cache.delete(rel);
    cache.set(rel, entry);
    return entry.value;
  }
  let raw: string;
  let mtimeMs = 0;
  try {
    raw = fs.readFileSync(file, "utf8");
    if (WATCH_MTIME) mtimeMs = fs.statSync(file).mtimeMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const value = JSON.parse(raw) as unknown;
  cache.set(rel, { value, mtimeMs });
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return value;
}

/** All niches of the bundle for a data locale (ru | en), or null before the rating import. */
export function getRatingIndex(dl: RatingDataLocale): RatingIndexFile | null {
  if (dl !== "ru" && dl !== "en") return null;
  return loadSync(`${dl}/rating/index.json`) as RatingIndexFile | null;
}

/**
 * One niche for a data locale, or null for unknown slugs. Everything in it is PUBLIC (spec 11 D2);
 * still, hand client components only what they render (the files are large).
 */
export function getRatingNicheFile(dl: RatingDataLocale, slug: string): RatingNicheFile | null {
  if ((dl !== "ru" && dl !== "en") || !SAFE_SLUG.test(slug) || slug === "index") return null;
  return loadSync(`${dl}/rating/${slug}.json`) as RatingNicheFile | null;
}

/** de/fr/ja: own topic names and quote translations over the English data. */
export function getRatingOverlay(l: RatingOverlayLocale): RatingOverlayFile | null {
  if (l !== "de" && l !== "fr" && l !== "ja") return null;
  return loadSync(`${l}/rating/overlay.json`) as RatingOverlayFile | null;
}
