// Server-only loaders for the generated app content in content/v2 (spec 04 §7.5).
//
// - Files are read with fs at request time and cached in a small in-process LRU
//   (never import content JSON statically: it would bundle every locale).
// - GATING IS THE CALLER'S JOB: call getResearch only when canRead(category),
//   getIdea only when canReadIdea(slug); strip paid entries from getCards and
//   getSearchIndex results before anything reaches a client (spec 04 §7.6, 09 G10).
// - In development a changed file (re-run of the importer) is picked up without a restart.
//
// Client-safe helpers live in ./media (image URLs), ./text (reading rules) and ./search.

import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import { isLaunchCategory, isLaunchIdea } from "../manifest.generated";
import type {
  CardsFile,
  CatalogFile,
  IdeaFile,
  LocaleCode,
  Manifest,
  OnboardingFile,
  ResearchFile,
  SearchFile,
  UIFile,
} from "./types";
import { isLocaleCode } from "./types";

export type {
  Art,
  CardsFile,
  CatalogCategory,
  CatalogFile,
  CatalogIdea,
  ContentStats,
  IdeaBlockView,
  IdeaFile,
  LocaleCode,
  Manifest,
  OnboardingArticle,
  OnboardingFile,
  OnboardingIdea,
  Placement,
  QuoteView,
  ResearchFile,
  ResearchObservation,
  ResearchSection,
  SearchFile,
  TocEntry,
  UIFile,
} from "./types";
export { LOCALE_CODES, isLocaleCode } from "./types";

const CONTENT_ROOT = process.env.CONTENT_V2_DIR
  ? path.resolve(process.env.CONTENT_V2_DIR)
  : path.join(process.cwd(), "content", "v2");
const MAX_ENTRIES = 200;
const WATCH_MTIME = process.env.NODE_ENV !== "production";
const SAFE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface CacheEntry {
  promise: Promise<unknown>;
  /** null while the first read is in flight. */
  mtimeMs: number | null;
}

const cache = new Map<string, CacheEntry>();

class ContentMissingError extends Error {
  constructor(rel: string) {
    super(`content/v2/${rel} not found — generate it with: npx tsx scripts/v2/import-app-content.ts`);
    this.name = "ContentMissingError";
  }
}

async function load(rel: string): Promise<unknown> {
  const file = path.join(CONTENT_ROOT, rel);
  let entry = cache.get(rel);
  if (entry && WATCH_MTIME && entry.mtimeMs !== null) {
    const stat = await fs.stat(file).catch(() => null);
    if (!stat || stat.mtimeMs !== entry.mtimeMs) {
      cache.delete(rel);
      entry = undefined;
    }
  }
  if (entry) {
    // LRU: move to the most recent position.
    cache.delete(rel);
    cache.set(rel, entry);
    return entry.promise;
  }
  const created: CacheEntry = { mtimeMs: null, promise: Promise.resolve(null) };
  created.promise = (async () => {
    try {
      const [raw, stat] = await Promise.all([fs.readFile(file, "utf8"), WATCH_MTIME ? fs.stat(file) : null]);
      created.mtimeMs = stat ? stat.mtimeMs : 0;
      return JSON.parse(raw) as unknown;
    } catch (error) {
      if (cache.get(rel) === created) cache.delete(rel);
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ContentMissingError(rel);
      throw error;
    }
  })();
  cache.set(rel, created);
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
  return created.promise;
}

async function loadOptional<T>(rel: string): Promise<T | null> {
  try {
    return (await load(rel)) as T;
  } catch (error) {
    if (error instanceof ContentMissingError) return null;
    throw error;
  }
}

function assertLocale(locale: string): asserts locale is LocaleCode {
  if (!isLocaleCode(locale)) throw new TypeError(`Unknown content locale: ${JSON.stringify(locale)}`);
}

/** Locale-independent manifest: locales, launch list, free layer, corpus, welcome art, stats. */
export async function getManifest(): Promise<Manifest> {
  return (await load("manifest.json")) as Manifest;
}

/** PUBLIC-SAFE catalogue: 35 categories (name, summary, cover) + 293 ideas (slug, category, rank, free, cover). */
export async function getCatalog(locale: LocaleCode): Promise<CatalogFile> {
  assertLocale(locale);
  return (await load(`${locale}/catalog.json`)) as CatalogFile;
}

/** SERVER-ONLY card copy for all 293 ideas. Strip entries the viewer cannot read before sending. */
export async function getCards(locale: LocaleCode): Promise<CardsFile> {
  assertLocale(locale);
  return (await load(`${locale}/cards.json`)) as CardsFile;
}

/**
 * GATED full research article, or null for unknown / non-launch slugs.
 * Call only after the viewer passed canRead(category).
 */
export async function getResearch(locale: LocaleCode, slug: string): Promise<ResearchFile | null> {
  assertLocale(locale);
  if (!SAFE_SLUG.test(slug) || !isLaunchCategory(slug)) return null;
  return loadOptional<ResearchFile>(`${locale}/research/${slug}.json`);
}

/**
 * GATED full idea article, or null for unknown / non-launch ids.
 * Call only after the viewer passed canReadIdea(slug).
 */
export async function getIdea(locale: LocaleCode, id: string): Promise<IdeaFile | null> {
  assertLocale(locale);
  if (!SAFE_SLUG.test(id) || !isLaunchIdea(id)) return null;
  return loadOptional<IdeaFile>(`${locale}/ideas/${id}.json`);
}

/** SERVER-ONLY normalized search haystacks (research bodies include locked text). */
export async function getSearchIndex(locale: LocaleCode): Promise<SearchFile> {
  assertLocale(locale);
  return (await load(`${locale}/search.json`)) as SearchFile;
}

/** PUBLIC onboarding previews: 5 article excerpts + 5 free ideas. */
export async function getOnboarding(locale: LocaleCode): Promise<OnboardingFile> {
  assertLocale(locale);
  return (await load(`${locale}/onboarding.json`)) as OnboardingFile;
}

/** PUBLIC app UI strings (keys = Russian source strings) and plural forms. */
export async function getUI(locale: LocaleCode): Promise<UIFile> {
  assertLocale(locale);
  return (await load(`${locale}/ui.json`)) as UIFile;
}
