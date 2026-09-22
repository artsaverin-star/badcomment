// Shared types for the generated app content in `content/v2/**`.
//
// This file is the contract between `scripts/v2/import-app-content.ts` (the
// writer) and the loaders in `src/site/content/index.ts` (the reader).
// Spec: docs/site-v2/spec/04-content-data-model.md §7.3. Fields marked
// "addition" are not in the spec interface but are written by the importer.
//
// Client-safe: types and tiny constants only, no imports.

export type LocaleCode = "ru" | "en" | "de" | "fr" | "ja";

/** Locales of the new site in picker/display order (Русский, English, Deutsch, Français, 日本語). */
export const LOCALE_CODES: readonly LocaleCode[] = ["ru", "en", "de", "fr", "ja"];

export function isLocaleCode(value: unknown): value is LocaleCode {
  return typeof value === "string" && (LOCALE_CODES as readonly string[]).includes(value);
}

/**
 * A raster image exported to `public/media/<src>-<width>.webp`.
 * Use `mediaSrc(art, w)` / `mediaSrcSet(art)` from `./media` to build URLs.
 */
export interface Art {
  /** Path under /media without width and extension, e.g. "research/ResearchLaunch_calendars-tasks_cover", "ideas/interior-design-1". */
  src: string;
  /** Localized alt text as the app's reader announces it. "" = decorative (idea covers). Catalog cards should render alt="" (the app hides them). */
  alt: string;
  /** Available widths, ascending (ideas/research: 480, 800, 1200; welcome: 400, 800). */
  widths: number[];
  /** Addition: intrinsic pixel size of the largest variant (use for width/height attributes to avoid layout shift). */
  width: number;
  height: number;
}

export interface Manifest {
  version: 1;
  /** ISO timestamp of the import run that last changed the content (stable when a re-run changes nothing). */
  contentBuiltAt: string;
  /** studio.json builtAt, e.g. "2026-09-05" → «Сборник от %1$@» (format per locale on the web). */
  collectionDate: string;
  source: {
    path: string;
    gitCommit?: string;
    /** sha256 per source file (JSON packs + font), relative to `path`. */
    sha256: Record<string, string>;
    /** Addition: which pack file each content type resolved to per locale (spec 04 §4.2 chains). */
    resolved: Record<LocaleCode, Record<string, string | null>>;
  };
  /** Display order: ["ru","en","de","fr","ja"]. */
  locales: LocaleCode[];
  localeNames: Record<LocaleCode, string>;
  defaultLocale: LocaleCode;
  /** 35 category slugs, LaunchEdition (= catalogue) order. */
  launch: string[];
  /** Addition: 293 idea slugs, grouped by category (launch order) and numeric suffix. */
  ideas: string[];
  free: { category: string; ideas: string[] };
  /** Archive-wide constants (Models/ResearchProduct.swift): 1 451 072 / 4 623 / 72. */
  corpus: { reviews: number; apps: number; niches: number };
  /** Addition: locale-independent artwork (welcome/paywall/privacy illustrations), keyed by app asset name. */
  art: Record<string, Art>;
  /** Addition: app icon PNGs by pixel size, e.g. {"180": "/media/app-icon-180.png", "512": "/media/app-icon-512.png"}. */
  appIcon: Record<string, string>;
  /** Addition: counts per locale, as validated by the importer. */
  stats: Record<LocaleCode, ContentStats>;
  /** Addition: sha256 over all generated content files except the manifest. */
  contentHash: string;
}

export interface ContentStats {
  categories: number;
  ideas: number;
  sections: number;
  observations: number;
  directions: number;
  placements: number;
  quotes: number;
  ideaQuotes: number;
  quotesWithoutOwnTranslation: number;
}

export interface CatalogCategory {
  slug: string;
  name: string;
  summary: string;
  cover: Art;
  free: boolean;
  corpus: { reviews: number; apps: number };
  ideaCount: number;
}

/** A catalogue idea. PUBLIC-SAFE: no title/description (card copy lives in cards.json, gated). */
export interface CatalogIdea {
  slug: string;
  category: string;
  rank: number;
  free: boolean;
  cover: Art;
}

/** PUBLIC-SAFE. */
export interface CatalogFile {
  version: 1;
  locale: LocaleCode;
  /** 35, catalogue order. */
  categories: CatalogCategory[];
  /** 293, sorted by (rank, slug). Free users see FREE ideas first (use `orderIdeas` from ./search). */
  ideas: CatalogIdea[];
}

/** SERVER-ONLY: strip paid entries for viewers without Plus before sending anything to the client. */
export interface CardsFile {
  version: 1;
  locale: LocaleCode;
  ideas: Record<string, { title: string; description: string }>;
}

/**
 * SERVER-ONLY. All strings are pre-normalized with `normalizeForSearch` (./text):
 * lower-cased, width-folded, diacritics stripped.
 */
export interface SearchFile {
  version: 1;
  locale: LocaleCode;
  /** Haystack = [name, summary, ...body]; name/summary drive the relevance tiers (spec 01 §4.3). */
  research: Record<string, { name: string; summary: string; body: string[] }>;
  /** Haystack per idea slug. Locked ideas must never match (filter by access before searching). */
  ideas: Record<string, string[]>;
}

export interface QuoteView {
  /** Display text for this locale (translation resolved at build time). Readers render only this. */
  text: string;
  rating: number;
  /** Source app name. The app never renders it in readers. */
  app: string;
}

export interface Placement {
  directionId: string;
  /** Shown as a subheading only when `ideas` is empty; always used by the export document. */
  title: string;
  body: string;
  /** Idea slugs, de-duplicated article-wide. Paid ideas render locked (art only). */
  ideas: string[];
}

export interface ResearchObservation {
  id: string;
  title: string;
  /** Authored passages (body split on "\n\n"). quotes[i] follows passages[i]; art follows index 0. */
  passages: string[];
  quotes: QuoteView[];
  art: Art | null;
  placements: Placement[];
}

export interface ResearchSection {
  id: string;
  title: string;
  intro: string;
  art: Art | null;
  observations: ResearchObservation[];
}

export interface TocEntry {
  /** DOM anchor id: introduction | audience | theme-<id> | observation-<id> | directions | ideas | conclusion. */
  id: string;
  title: string;
  depth: 0 | 1;
}

/** GATED: read only when canRead(category). */
export interface ResearchFile {
  version: 1;
  locale: LocaleCode;
  category: string;
  name: string;
  summary: string;
  /** null → omit the hero corpus sentence. */
  corpus: { reviews: number; apps: number } | null;
  lead: string;
  cover: Art;
  audiencesArt: Art | null;
  audiences: { title: string; body: string }[];
  sections: ResearchSection[];
  /** [] today. Heading «Другие возможности». */
  remainingDirections: Placement[];
  /** [] today. Heading «Другие идеи категории». */
  remainingIdeas: string[];
  conclusion: { title: string; body: string } | null;
  toc: TocEntry[];
  /** Addition: true for the free category (interior-design). */
  free: boolean;
}

export type IdeaBlockView =
  | { id: string; kind: "paragraph" | "heading"; text: string }
  | { id: string; kind: "idea"; title: string; text: string }
  | { id: string; kind: "quote"; quote: QuoteView };

/** GATED: read only when canReadIdea(slug). */
export interface IdeaFile {
  version: 1;
  locale: LocaleCode;
  slug: string;
  category: string;
  categoryName: string;
  title: string;
  description: string;
  cover: Art;
  blocks: IdeaBlockView[];
  /** Addition. */
  rank: number;
  /** Addition: true for interior-design-1…5. */
  free: boolean;
}

export interface OnboardingArticle {
  category: string;
  /** Addition. */
  observationId: string;
  label: string;
  observationTitle: string;
  excerpt: string;
  art: Art;
  quote: { excerpt: string; rating: number } | null;
}

export interface OnboardingIdea {
  slug: string;
  title: string;
  description: string;
  cover: Art;
}

/** PUBLIC (the app shows these fragments to everyone). */
export interface OnboardingFile {
  version: 1;
  locale: LocaleCode;
  /** 5, spec 04 §5.8 order. */
  articles: OnboardingArticle[];
  /** 5 free interior ideas. */
  ideas: OnboardingIdea[];
}

/** PUBLIC. Keys are the Russian source strings; ru is an identity map. */
export interface UIFile {
  version: 1;
  locale: LocaleCode;
  strings: Record<string, string>;
  /** CLDR category → form, per key ("отзыв", "приложение", "идея", …). ru "приложение" is genitive (corpus sentence only). */
  plurals: Record<string, Record<string, string>>;
}

/** One row of content/v2/_build/used-images.json (input of scripts/v2/export-images.mjs). */
export interface UsedImage {
  /** Output path under public/media without width/extension. */
  out: string;
  /** App asset catalog name. */
  asset: string;
  /** Source file relative to the Resources directory. */
  file: string;
  /** photo → WebP q78 (480/800/1200); alpha → WebP q82 alpha_q90 (400/800); icon → PNG (180/512, app-icon-<w>.png). */
  kind: "photo" | "alpha" | "icon";
  widths: number[];
  width: number;
  height: number;
  sha256: string;
}
