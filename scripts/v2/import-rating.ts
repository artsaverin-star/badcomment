/**
 * The rating step of the app content import (site-v2 redesign spec §8 «Data plan»):
 * content/v2/{ru,en}/rating/{index,<slug>}.json and content/v2/{de,fr,ja}/rating/overlay.json.
 *
 * Run it through the main importer — it provides the app pack access and the editorial
 * overrides (StudioEditorial port):
 *
 *   npx tsx scripts/v2/import-app-content.ts --only=rating            # rating only: writes content/v2/<L>/rating/** and nothing else
 *   npx tsx scripts/v2/import-app-content.ts --only=rating --check    # validate only
 *
 * Sources:
 *   numbers, titles, raw app order, en texts,   src/data/peoplesRating (the web's rating)
 *   icons, screenshots, reviews read (nrev)
 *   ru texts                                    rich.ru `rating` after prepared() overrides
 *   scenarios                                   rich.ru / rich.en `audience.segments`
 *   quotes                                      rich.ru findings evidence (every locale) +
 *                                               quote-translations.<L>
 *   topic names                                 text.ru (ru), content/v2/<L>/catalog.json
 *                                               (the 35 launch topics), else nameEn; an optional
 *                                               `name` in rating-seo.json overrides either
 *   SEO head terms and intros (ru, en)          scripts/v2/data/rating-seo.json (spec 11 §6.2, §6.3;
 *                                               astrology, the one niche without a rating page,
 *                                               keeps the peoplesRating seoName / nameEn)
 *   usable niches                               src/data/reviewSourceIndex.json (a review corpus)
 *
 * Every text is final after this step (ClarityRatingData.readable, capFirst, trust wording,
 * Russian typography); the web reader applies no text processing of its own. Media are stored as
 * compact Apple CDN paths (rating-types.ts); short names are unique across the whole rating.
 * A niche file keeps its `updatedAt` while its content is unchanged (the sitemap lastmod).
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { RATING_BY_SLUG } from "../../src/data/peoplesRating";
import { neutralizeTrustLanguage } from "../../src/lib/trustCopy";
import { tg } from "../../src/lib/typo";
import type {
  RatingAppFile,
  RatingIndexEntry,
  RatingIndexFile,
  RatingLeaderFile,
  RatingNicheFile,
  RatingOverlayFile,
  RatingOverlayLocale,
  RatingQuoteFile,
  RatingScenarioFile,
} from "../../src/site/content/rating-types";
import type { CatalogFile, LocaleCode } from "../../src/site/content/types";
import { normalizedTitle } from "../../src/site/features/rating/matches";
import { shortTitles } from "../../src/site/features/rating/text";

/** The name part of a store title (spec 11 §8.2); exported for scripts/v2/test-rating.ts. */
export { shortTitle, shortTitles } from "../../src/site/features/rating/text";

// ---------------------------------------------------------------------------
// Context from import-app-content.ts
// ---------------------------------------------------------------------------

export interface RatingImportContext {
  /** The web repo root. */
  repo: string;
  /** content/v2 */
  out: string;
  /** Parsed JSON of a file in the app's Resources (cached by the caller). */
  readJson<T>(rel: string): T;
  resExists(rel: string): boolean;
  /** sha256 of a file in the app's Resources. */
  resSha(rel: string): string;
  /** StudioEditorial.preparedData. */
  prepared(value: unknown, where: string): unknown;
  /** StudioEditorial.text (exact whole-string replacement). */
  editorialText(s: string, where: string): string;
  /** An accepted override entry with status "withheld" has this original. */
  isWithheld(original: string): boolean;
  /** QuoteReading pack for a locale (own chain only), or null. */
  quoteTranslations(locale: LocaleCode): Record<string, string> | null;
  error(msg: string): void;
  warn(msg: string): void;
  /** A fixed-count check (an error unless ALLOW_COUNT_CHANGE=1). */
  countCheck(msg: string): void;
}

export interface RatingImportResult {
  /** Paths relative to content/v2, every one under <L>/rating/. */
  files: { rel: string; content: string }[];
  /** Human-readable summary lines. */
  report: string[];
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

type RawText = { verdict?: string | null; loved?: string | null; weak?: string | null; whoFor?: string | null };
type RawApp = RawText & {
  id: string;
  title: string;
  storeAvg?: number | null;
  ratings?: number | null;
  realScore?: number | null;
  /** https://is1-ssl.mzstatic.com/image/thumb/<path>/512x512bb.jpg */
  icon?: string | null;
  /** https://is1-ssl.mzstatic.com/image/thumb/<path>/240x0w.jpg (or .png), store order. */
  shots?: string[];
  /** Reviews read for the app. */
  nrev?: number;
  en?: RawText;
};
type RawSet = {
  slug: string;
  name: string;
  nameEn?: string;
  seoName?: string;
  apps?: RawApp[];
  totalReviews?: number;
  count?: number;
};

interface SrcEvidence {
  app: string;
  rating: number;
  quote: string;
  translation?: string | null;
}
interface SrcSegment {
  name?: string | null;
  job?: string | null;
  gap?: string | null;
  servedBy?: string[] | null;
}
interface SrcRatingApp extends RawText {
  id: string;
  title: string;
  storeAvg?: number | null;
  ratings?: number | null;
  realScore?: number | null;
  icon?: string | null;
  shots?: string[] | null;
}

/**
 * scripts/v2/data/rating-seo.json: one entry per niche with a rating page. `name` (optional)
 * replaces the displayed topic name of a data locale — for the non-launch topics whose English
 * name is the raw peoplesRating nameEn («Food delivery apps», "AI Species Identifier
 * (Plant/Bug/Animal)"); de/fr/ja pages show the English name of those.
 */
type SeoEntry = {
  seoName: { ru: string; en: string };
  intro: { ru: string; en: string };
  name?: { ru?: string; en?: string };
};
interface SrcDossier {
  findings?: { id: string; evidence: SrcEvidence[] }[] | null;
  audience?: { segments?: SrcSegment[] | null } | null;
  rating?: { count?: number; totalReviews?: number; apps?: SrcRatingApp[] } | null;
}
interface SrcRich {
  dossiers: Record<string, SrcDossier>;
}

const TEXT_FIELDS = ["verdict", "loved", "weak", "whoFor"] as const;
type TextField = (typeof TEXT_FIELDS)[number];

const DATA_LOCALES = ["ru", "en"] as const;
const OVERLAY_LOCALES: RatingOverlayLocale[] = ["de", "fr", "ja"];

/** Spec §8 / spec 11 §8.2 counts (ALLOW_COUNT_CHANGE=1 turns a difference into a warning). */
const EXPECTED = {
  niches: 72,
  apps: 4443,
  ruScenarios: 317,
  enScenarioNiches: 35,
  enScenarios: 157,
  appsWithQuotes: 1842,
  appsWithIcon: 4443,
  appsWithShots: 4149,
  shots: 29656,
};

/** StudioEditorial.needsReview's placeholder (ru source; the en pack's translation is added below). */
const PENDING_RU = "Редакционный вывод уточняется.";

/**
 * Russian text left in English verdicts of weight-tracker (peoplesRating `en`, spec §8): these
 * are dropped (null). Any other Cyrillic in an English text field fails the validation.
 */
const CYRILLIC_EN_VERDICTS = new Set([
  "6499510249", "413313086", "578546778", "1001285466", "6511248415",
  "1515595647", "550932668", "552341639", "1576161548", "666822519",
]);

const CYRILLIC = /[Ѐ-ӿ]/;
const SOURCE_DESCRIPTION =
  "web peoplesRating (numbers, en texts, media) + scripts/v2/data/rating-seo.json + app rich.ru/rich.en/text.ru/quote-translations";

/** Trust wording that must never reach the rating's SEO texts (spec 11 §6.3, D14). */
export const TRUST_WORDING = /накрут|накручен|скам|фейк|juic|fake|scam|inflat/i;

/** SEO overrides, relative to the repo root. */
export const RATING_SEO_FILE = "scripts/v2/data/rating-seo.json";

/** Spec 11 §6.2, §6.3 limits (check-content repeats them). */
const SEO_NAME_MAX = 40;
/** A topic name override (rating-seo.json `name`). */
const NAME_MAX = 50;
const INTRO_MIN = 60;
const INTRO_MAX = 180;
const MAX_SHOTS = 10;

// Apple CDN URLs → compact paths (spec 11 §3.1, §8.2): only these two shapes are accepted.
const MZ_ICON = /^https:\/\/is1-ssl\.mzstatic\.com\/image\/thumb\/(.+)\/512x512bb\.jpg$/;
const MZ_SHOT = /^https:\/\/is1-ssl\.mzstatic\.com\/image\/thumb\/(.+)\/240x0w\.(?:jpg|png)$/;
/** The only characters today's paths use are / - _ . @; png/jpg/jpeg in any case. */
export const MZ_PATH = /^[A-Za-z0-9][A-Za-z0-9._@/-]*\.(?:png|jpe?g)$/i;

/** The compact path of an icon or screenshot URL, or null when it has another shape. */
export function compactMedia(url: string, kind: "icon" | "shot"): string | null {
  const m = (kind === "icon" ? MZ_ICON : MZ_SHOT).exec(url);
  return m && MZ_PATH.test(m[1]) ? m[1] : null;
}

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const serialize = (data: unknown) => JSON.stringify(data, null, 1) + "\n";
const nonBlank = (s: string | null | undefined): s is string => typeof s === "string" && s.trim() !== "";

/** Source texts sometimes start lowercase; brand casings (iPhone, macOS, eBay) stay intact. */
function capFirst(s: string): string {
  return !s || /^(mac|watch|tv|i|e)[A-Z]/.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

/** ClarityRatingData.app(named:in:): the exact title first, else a unique normalized match. */
function appNamed<T extends { title: string }>(title: string, apps: readonly T[]): T | null {
  const exact = apps.find((a) => a.title === title);
  if (exact) return exact;
  const key = normalizedTitle(title);
  const candidates = apps.filter((a) => normalizedTitle(a.title) === key);
  return candidates.length === 1 ? candidates[0] : null;
}

/**
 * Niches with a review corpus (sitedata/rating.ts `usable`: 71 of 72, astrology has none). Only
 * they have rating pages, so only they need SEO texts.
 */
function reviewCorpusSlugs(ctx: RatingImportContext): Set<string> {
  const file = path.join(ctx.repo, "src/data/reviewSourceIndex.json");
  const index = JSON.parse(fs.readFileSync(file, "utf8")) as { niches?: Record<string, unknown[]> };
  return new Set(Object.entries(index.niches ?? {}).filter(([, apps]) => Array.isArray(apps) && apps.length > 0).map(([slug]) => slug));
}

/** scripts/v2/data/rating-seo.json, validated: one complete entry per usable niche, nothing else. */
function readSeo(ctx: RatingImportContext, slugs: readonly string[], usable: ReadonlySet<string>): Record<string, SeoEntry> {
  const file = path.join(ctx.repo, RATING_SEO_FILE);
  if (!fs.existsSync(file)) {
    ctx.error(`rating: ${RATING_SEO_FILE} missing`);
    return {};
  }
  const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Partial<SeoEntry>>;
  const known = new Set(slugs);
  const out: Record<string, SeoEntry> = {};
  for (const [slug, entry] of Object.entries(raw)) {
    if (!known.has(slug)) {
      ctx.error(`rating: ${RATING_SEO_FILE} has an entry for unknown niche ${slug}`);
      continue;
    }
    const { seoName, intro, name: names } = entry;
    if (!nonBlank(seoName?.ru) || !nonBlank(seoName?.en) || !nonBlank(intro?.ru) || !nonBlank(intro?.en)) {
      ctx.error(`rating: ${RATING_SEO_FILE} ${slug} needs seoName.ru/en and intro.ru/en`);
      continue;
    }
    for (const [L, name] of [["ru", seoName.ru], ["en", seoName.en]] as const) {
      if (name.trim() !== name || name.length > SEO_NAME_MAX || TRUST_WORDING.test(name))
        ctx.error(`rating: ${RATING_SEO_FILE} ${slug} seoName.${L} «${name}» is untrimmed, over ${SEO_NAME_MAX} chars or has trust wording`);
    }
    // "Best … apps": the en head term never carries the word itself ("apps apps").
    if (/\bapps?$/i.test(seoName.en)) ctx.error(`rating: ${RATING_SEO_FILE} ${slug} seoName.en «${seoName.en}» ends in app(s)`);
    for (const [L, name] of Object.entries(names ?? {}))
      if (!(L === "ru" || L === "en") || !nonBlank(name) || name.trim() !== name || name.length > NAME_MAX || (L === "en" && CYRILLIC.test(name)))
        ctx.error(`rating: ${RATING_SEO_FILE} ${slug} name.${L} «${String(name)}» is not a trimmed ${L} name of at most ${NAME_MAX} chars`);
    out[slug] = {
      seoName: { ru: seoName.ru, en: seoName.en },
      intro: { ru: intro.ru.trim(), en: intro.en.trim() },
      ...(names ? { name: { ...(names.ru ? { ru: names.ru } : {}), ...(names.en ? { en: names.en } : {}) } } : {}),
    };
  }
  for (const slug of slugs) if (usable.has(slug) && !out[slug]) ctx.error(`rating: ${RATING_SEO_FILE} has no entry for ${slug} (every niche with a rating page needs one)`);
  return out;
}

/**
 * The file with the `updatedAt` of its current copy on disk when nothing else changed (the
 * sitemap lastmod moves only on a real content change); else today (UTC).
 */
function withUpdatedAt(ctx: RatingImportContext, today: string, file: RatingNicheFile): RatingNicheFile {
  const existing = path.join(ctx.out, file.locale, "rating", `${file.category}.json`);
  if (!fs.existsSync(existing)) return { ...file, updatedAt: today };
  let old: Partial<RatingNicheFile>;
  try {
    old = JSON.parse(fs.readFileSync(existing, "utf8")) as Partial<RatingNicheFile>;
  } catch {
    return { ...file, updatedAt: today };
  }
  const strip = (f: Partial<RatingNicheFile>) => {
    const copy: Partial<RatingNicheFile> = { ...f };
    delete copy.updatedAt;
    return copy;
  };
  const kept = typeof old.updatedAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(old.updatedAt) && isDeepStrictEqual(strip(old), strip(file));
  return { ...file, updatedAt: kept ? old.updatedAt! : today };
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

export function buildRatingContent(ctx: RatingImportContext): RatingImportResult {
  const sets = RATING_BY_SLUG as unknown as Record<string, RawSet>;
  const slugs = Object.keys(sets).sort();
  const usable = reviewCorpusSlugs(ctx);
  const seo = readSeo(ctx, slugs, usable);
  const today = new Date().toISOString().slice(0, 10);

  // Short names over ALL apps of the rating (by id; an app in several niches has one title).
  const titlesById = new Map<string, string>();
  for (const slug of slugs)
    for (const app of sets[slug].apps ?? []) {
      const known = titlesById.get(app.id);
      if (known === undefined) titlesById.set(app.id, app.title);
      else if (known !== app.title) ctx.warn(`rating/${slug}: app ${app.id} is titled «${app.title}» here, «${known}» elsewhere`);
    }
  const shortOf = shortTitles(titlesById);

  const richRu = ctx.readJson<SrcRich>("rich.ru.json");
  const richEn = ctx.readJson<SrcRich>("rich.en.json");
  const textRu = ctx.readJson<{ categories: Record<string, string> }>("text.ru.json");
  const ruCategoryNames = ctx.prepared(textRu.categories, "text.ru") as Record<string, string>;
  const uiEn = ctx.resExists("ui.en.json") ? ctx.readJson<{ strings?: Record<string, string> }>("ui.en.json") : null;
  const pending = new Set([PENDING_RU, uiEn?.strings?.[PENDING_RU]].filter(nonBlank));

  const quotePacks = new Map<LocaleCode, Record<string, string> | null>();
  for (const L of ["ru", ...OVERLAY_LOCALES] as LocaleCode[]) {
    const pack = ctx.quoteTranslations(L);
    if (!pack) ctx.warn(`rating: no quote-translations pack for ${L}; its quotes stay original`);
    quotePacks.set(L, pack);
  }

  /** Launch-topic names of the site's own catalogue (the names the topic pages show). */
  const catalogNames = new Map<LocaleCode, Map<string, string>>();
  const catalogSha: Record<string, string> = {};
  for (const L of ["en", ...OVERLAY_LOCALES] as LocaleCode[]) {
    const file = path.join(ctx.out, L, "catalog.json");
    if (!fs.existsSync(file)) {
      ctx.error(`rating: content/v2/${L}/catalog.json missing (run the full import first)`);
      catalogNames.set(L, new Map());
      continue;
    }
    const raw = fs.readFileSync(file, "utf8");
    catalogSha[`content/v2/${L}/catalog.json`] = sha256(raw);
    const catalog = JSON.parse(raw) as CatalogFile;
    catalogNames.set(L, new Map(catalog.categories.map((c) => [c.slug, c.name])));
  }

  /** ClarityRatingData.readable: hide blank and withheld texts, then StudioEditorial.text. */
  const readable = (s: string | null | undefined, where: string): string | null => {
    if (!nonBlank(s)) return null;
    if (ctx.isWithheld(s) || pending.has(s) || pending.has(s.trim())) return null;
    const text = ctx.editorialText(s, where).trim();
    return text && !pending.has(text) ? text : null;
  };
  const ruProse = (s: string | null | undefined, where: string) => {
    const text = readable(s, where);
    return text === null ? null : tg(neutralizeTrustLanguage(capFirst(text), "ru"));
  };
  const enProse = (s: string | null | undefined) => {
    const text = readable(s, "rating.en");
    return text === null ? null : neutralizeTrustLanguage(capFirst(text), "en");
  };

  const stats = {
    niches: 0,
    apps: 0,
    appsWithIcon: 0,
    appsWithShots: 0,
    shots: 0,
    mediaDiffersFromRich: 0,
    ruScenarios: 0,
    ruReadableScenarios: 0,
    enScenarioNiches: 0,
    enScenarios: 0,
    enReadableScenarios: 0,
    appsWithQuotes: 0,
    quotes: 0,
    ruHidden: 0,
    ruChangedByOverrides: 0,
    enHiddenLikeRu: 0,
    enCyrillicDropped: 0,
    quotesRu: { pack: 0, evidence: 0, original: 0 },
    overlayQuotes: {} as Record<string, number>,
    overlayApps: {} as Record<string, number>,
    scenarioOrderMismatch: 0,
  };

  const nicheFiles: Record<(typeof DATA_LOCALES)[number], RatingNicheFile[]> = { ru: [], en: [] };
  const overlays = new Map<RatingOverlayLocale, RatingOverlayFile>(
    OVERLAY_LOCALES.map((L) => [L, { version: 1, locale: L, names: {}, quotes: {} }]),
  );

  for (const slug of slugs) {
    const set = sets[slug];
    const apps = set.apps ?? [];
    const rawDossier = richRu.dossiers[slug];
    if (set.slug !== slug) ctx.error(`rating/${slug}: peoplesRating set says slug ${set.slug}`);
    if (!rawDossier) {
      ctx.error(`rating/${slug}: no rich.ru dossier`);
      continue;
    }
    if (!rawDossier.rating?.apps?.length) {
      ctx.error(`rating/${slug}: rich.ru dossier has no rating`);
      continue;
    }
    // StudioEditorial.preparedData over the parts the rating reads (the walk is per subtree, so
    // this equals preparing the whole pack; evidence stays verbatim either way).
    const dossier = ctx.prepared({ rating: rawDossier.rating, audience: rawDossier.audience ?? null }, "rich.ru") as SrcDossier;
    const ruApps = dossier.rating?.apps ?? [];
    const rawRuApps = rawDossier.rating.apps;

    // --- validation: numbers equal peoplesRating, ids unique ---------------------------------
    const ids = new Set<string>();
    for (const app of apps) {
      if (ids.has(app.id)) ctx.error(`rating/${slug}: duplicate app id ${app.id}`);
      ids.add(app.id);
      if (!/^\d+$/.test(app.id)) ctx.warn(`rating/${slug}: app id ${app.id} is not numeric (no App Store link)`);
    }
    if (ruApps.length !== apps.length) ctx.error(`rating/${slug}: rich.ru has ${ruApps.length} rated apps, peoplesRating ${apps.length}`);
    apps.forEach((app, i) => {
      const src = rawRuApps[i];
      if (!src) return;
      for (const key of ["id", "title", "storeAvg", "ratings", "realScore"] as const) {
        if ((src[key] ?? null) !== (app[key] ?? null))
          ctx.error(`rating/${slug}#${i}: ${key} differs (rich.ru ${JSON.stringify(src[key])}, peoplesRating ${JSON.stringify(app[key])})`);
      }
    });
    const count = set.count ?? apps.length;
    const totalReviews = set.totalReviews ?? 0;
    if ((rawDossier.rating.count ?? null) !== count) ctx.error(`rating/${slug}: count differs (rich.ru ${rawDossier.rating.count}, peoplesRating ${count})`);
    if ((rawDossier.rating.totalReviews ?? null) !== totalReviews)
      ctx.error(`rating/${slug}: totalReviews differs (rich.ru ${rawDossier.rating.totalReviews}, peoplesRating ${totalReviews})`);
    if (count !== apps.length) ctx.warn(`rating/${slug}: count ${count} ≠ ${apps.length} apps`);
    // The rank (spec 11 D3) is the raw index + 1: the raw order must be realScore descending.
    apps.forEach((app, i) => {
      const prev = apps[i - 1];
      if (prev && (app.realScore ?? -1) > (prev.realScore ?? -1)) ctx.error(`rating/${slug}#${i}: apps are not sorted by realScore descending`);
    });

    // --- media (spec 11 §8.2): compact CDN paths, identical in ru and en ------------------------
    const media = new Map<string, Pick<RatingAppFile, "short" | "icon" | "shots" | "reviewsRead">>();
    apps.forEach((app, i) => {
      let icon: string | null = null;
      if (nonBlank(app.icon)) {
        icon = compactMedia(app.icon, "icon");
        if (icon === null) ctx.error(`rating/${slug}: app ${app.id} has an icon URL of an unknown shape: ${app.icon}`);
      }
      const shots: string[] = [];
      for (const url of app.shots ?? []) {
        const shot = typeof url === "string" ? compactMedia(url, "shot") : null;
        if (shot === null) ctx.error(`rating/${slug}: app ${app.id} has a screenshot URL of an unknown shape: ${String(url)}`);
        else if (!shots.includes(shot)) shots.push(shot);
      }
      if (shots.length > MAX_SHOTS) shots.length = MAX_SHOTS;
      // Optional cross-check: the app bundle carries the same media (the web's data wins).
      const rich = rawRuApps[i];
      if (rich?.id === app.id && ((rich.icon ?? null) !== (app.icon ?? null) || JSON.stringify(rich.shots ?? []) !== JSON.stringify(app.shots ?? []))) {
        stats.mediaDiffersFromRich++;
        ctx.warn(`rating/${slug}: app ${app.id} has other media in rich.ru than in peoplesRating (peoplesRating is used)`);
      }
      const short = shortOf.get(app.id) ?? app.title;
      if (icon) stats.appsWithIcon++;
      if (shots.length) stats.appsWithShots++;
      stats.shots += shots.length;
      media.set(app.id, { short, icon, shots, reviewsRead: typeof app.nrev === "number" ? app.nrev : null });
    });

    // --- quotes (ClarityRatingData.quotes over rich.ru evidence, for every locale) -------------
    const evidence = (rawDossier.findings ?? []).flatMap((f) => f.evidence ?? []);
    const evidenceKeys = evidence.map((e) => normalizedTitle(e.app ?? ""));
    const quotesOf = new Map<string, SrcEvidence[]>();
    for (const app of apps) {
      const key = normalizedTitle(app.title);
      const seen = new Set<string>();
      const list: SrcEvidence[] = [];
      evidence.forEach((e, i) => {
        if (evidenceKeys[i] !== key || seen.has(e.quote)) return;
        seen.add(e.quote);
        list.push(e);
      });
      quotesOf.set(app.id, list);
      if (list.length) {
        stats.appsWithQuotes++;
        stats.quotes += list.length;
      }
    }
    const ruQuote = (e: SrcEvidence): RatingQuoteFile => {
      const own = quotePacks.get("ru")?.[e.quote];
      if (nonBlank(own)) {
        stats.quotesRu.pack++;
        return { text: own, lang: "ru" };
      }
      if (nonBlank(e.translation)) {
        stats.quotesRu.evidence++;
        return { text: e.translation, lang: "ru" };
      }
      stats.quotesRu.original++;
      return { text: e.quote, lang: "en" };
    };

    // --- apps ------------------------------------------------------------------------------------
    const ruHiddenFields = new Map<string, Set<TextField>>();
    const ruAppFiles: RatingAppFile[] = apps.map((app, i) => {
      const prep = ruApps[i] ?? ({} as SrcRatingApp);
      const raw = rawRuApps[i] ?? ({} as SrcRatingApp);
      const hidden = new Set<TextField>();
      const text = {} as Record<TextField, string | null>;
      for (const f of TEXT_FIELDS) {
        text[f] = ruProse(prep[f], "rating.ru");
        if (nonBlank(raw[f]) && prep[f] !== raw[f]) stats.ruChangedByOverrides++;
        if (nonBlank(raw[f]) && text[f] === null) {
          hidden.add(f);
          stats.ruHidden++;
        }
      }
      ruHiddenFields.set(app.id, hidden);
      const m = media.get(app.id)!;
      return {
        id: app.id,
        title: app.title,
        short: m.short,
        icon: m.icon,
        shots: m.shots,
        realScore: typeof app.realScore === "number" ? app.realScore : null,
        storeAvg: typeof app.storeAvg === "number" ? app.storeAvg : null,
        ratings: app.ratings ?? 0,
        reviewsRead: m.reviewsRead,
        ...text,
        quotes: (quotesOf.get(app.id) ?? []).map(ruQuote),
      };
    });

    const enAppFiles: RatingAppFile[] = apps.map((app) => {
      const text = {} as Record<TextField, string | null>;
      for (const f of TEXT_FIELDS) {
        // A text the Russian editors withheld stays hidden in its translation too.
        if (ruHiddenFields.get(app.id)?.has(f) && nonBlank(app.en?.[f])) {
          stats.enHiddenLikeRu++;
          text[f] = null;
          continue;
        }
        let value = enProse(app.en?.[f]);
        if (value !== null && f === "verdict" && CYRILLIC_EN_VERDICTS.has(app.id) && CYRILLIC.test(value)) {
          stats.enCyrillicDropped++;
          value = null;
        }
        text[f] = value;
      }
      const m = media.get(app.id)!;
      return {
        id: app.id,
        title: app.title,
        short: m.short,
        icon: m.icon,
        shots: m.shots,
        realScore: typeof app.realScore === "number" ? app.realScore : null,
        storeAvg: typeof app.storeAvg === "number" ? app.storeAvg : null,
        ratings: app.ratings ?? 0,
        reviewsRead: m.reviewsRead,
        ...text,
        quotes: (quotesOf.get(app.id) ?? []).map((e): RatingQuoteFile => ({ text: e.quote, lang: "en" })),
      };
    });

    for (const L of OVERLAY_LOCALES) {
      const pack = quotePacks.get(L);
      const overlay = overlays.get(L)!;
      for (const app of apps) {
        const list = quotesOf.get(app.id) ?? [];
        let own = 0;
        const quotes = list.map((e): RatingQuoteFile => {
          const t = pack?.[e.quote];
          if (nonBlank(t)) {
            own++;
            return { text: t, lang: L };
          }
          return { text: e.quote, lang: "en" };
        });
        if (own) {
          overlay.quotes[`${slug}:${app.id}`] = quotes;
          stats.overlayQuotes[L] = (stats.overlayQuotes[L] ?? 0) + own;
          stats.overlayApps[L] = (stats.overlayApps[L] ?? 0) + 1;
        }
      }
    }

    // --- scenarios (audience segments; ClarityRatingData.scenarioApps) -------------------------
    const scenariosOf = (segments: SrcSegment[], prose: (s: string | null | undefined) => string | null): RatingScenarioFile[] =>
      segments.map((seg, i) => {
        const seen = new Set<string>();
        const appIds: string[] = [];
        const unmatched: string[] = [];
        for (const title of seg.servedBy ?? []) {
          const app = appNamed(title, apps);
          if (!app) unmatched.push(title);
          else if (!seen.has(app.id)) {
            seen.add(app.id);
            appIds.push(app.id);
          }
        }
        return { n: i + 1, name: prose(seg.name), job: prose(seg.job), gap: prose(seg.gap), appIds, unmatched };
      });
    const ruScenarios = scenariosOf(dossier.audience?.segments ?? [], (s) => {
      const text = readable(s, "rating.scenario");
      return text === null ? null : tg(text);
    });
    const enSegments = richEn.dossiers[slug]?.audience?.segments ?? [];
    const enScenarios = scenariosOf(enSegments, (s) => readable(s, "rating.scenario.en"));
    stats.ruScenarios += ruScenarios.length;
    stats.ruReadableScenarios += ruScenarios.filter((s) => s.job).length;
    if (enSegments.length) stats.enScenarioNiches++;
    stats.enScenarios += enScenarios.length;
    stats.enReadableScenarios += enScenarios.filter((s) => s.job).length;
    if (enScenarios.length) {
      if (enScenarios.length !== ruScenarios.length)
        ctx.warn(`rating/${slug}: ${ruScenarios.length} ru scenarios, ${enScenarios.length} en (the ru ↔ en task pages will not line up)`);
      enScenarios.forEach((s, i) => {
        const ru = ruScenarios[i];
        if (ru && JSON.stringify(ru.appIds) !== JSON.stringify(s.appIds)) {
          stats.scenarioOrderMismatch++;
          ctx.warn(`rating/${slug}: en scenario ${s.n} lists other apps than ru (unmatched en names: ${s.unmatched.join(", ") || "none"})`);
        }
      });
    }

    // --- names ---------------------------------------------------------------------------------------
    // ru: the app's category name, short words bound to the next one like every ru text here
    // («Концентрация и⍽продуктивность» never wraps before «продуктивность» with «и» left behind).
    const seoNames = seo[slug]?.name;
    const ruCategoryName = ruCategoryNames[slug];
    if (!nonBlank(ruCategoryName)) ctx.warn(`rating/${slug}: no text.ru category name; using peoplesRating name`);
    const ruName = tg(seoNames?.ru ?? (nonBlank(ruCategoryName) ? ruCategoryName : set.name));
    const enName = seoNames?.en ?? catalogNames.get("en")?.get(slug) ?? set.nameEn ?? set.name;
    for (const L of OVERLAY_LOCALES) {
      const own = catalogNames.get(L)?.get(slug);
      if (own) overlays.get(L)!.names[slug] = { name: own, nameLang: L };
    }

    // --- SEO head terms and intros (spec 11 §6.2, §6.3) --------------------------------------------
    const entry = seo[slug];
    const ruIntro = entry ? tg(neutralizeTrustLanguage(entry.intro.ru, "ru")) : null;
    const enIntro = entry ? neutralizeTrustLanguage(entry.intro.en, "en") : null;
    for (const [L, intro] of [["ru", ruIntro], ["en", enIntro]] as const)
      if (intro !== null && (TRUST_WORDING.test(intro) || intro.length < INTRO_MIN || intro.length > INTRO_MAX))
        ctx.error(`rating/${L}/${slug}: the intro is ${intro.length} chars or has trust wording: «${intro}»`);

    nicheFiles.ru.push(
      withUpdatedAt(ctx, today, {
        version: 1,
        locale: "ru",
        category: slug,
        name: ruName,
        nameLang: "ru",
        seoName: entry?.seoName.ru ?? set.seoName ?? set.name.toLowerCase(),
        titleName: set.name,
        intro: ruIntro,
        count,
        totalReviews,
        updatedAt: today,
        apps: ruAppFiles,
        scenarios: ruScenarios,
      }),
    );
    nicheFiles.en.push(
      withUpdatedAt(ctx, today, {
        version: 1,
        locale: "en",
        category: slug,
        name: enName,
        nameLang: "en",
        seoName: entry?.seoName.en ?? set.nameEn ?? set.name,
        titleName: set.nameEn || set.name,
        intro: enIntro,
        count,
        totalReviews,
        updatedAt: today,
        apps: enAppFiles,
        scenarios: enScenarios,
      }),
    );
    stats.niches++;
    stats.apps += apps.length;
  }

  // --- validation ------------------------------------------------------------------------------------
  for (const [L, files] of Object.entries(nicheFiles)) {
    for (const file of files) {
      const ids = new Set(file.apps.map((a) => a.id));
      for (const s of file.scenarios)
        for (const id of s.appIds) if (!ids.has(id)) ctx.error(`rating/${L}/${file.category}: scenario ${s.n} names unknown app ${id}`);
      if (L !== "en") continue;
      const texts: [string, string | null][] = [
        ["name", file.name],
        ["titleName", file.titleName],
        ["seoName", file.seoName],
        ["intro", file.intro],
        ...file.apps.flatMap((a) => TEXT_FIELDS.map((f): [string, string | null] => [`${a.id}.${f}`, a[f]])),
        ...file.scenarios.flatMap((s): [string, string | null][] => [
          [`scenario ${s.n} name`, s.name],
          [`scenario ${s.n} job`, s.job],
          [`scenario ${s.n} gap`, s.gap],
        ]),
      ];
      for (const [where, text] of texts) if (text && CYRILLIC.test(text)) ctx.error(`rating/en/${file.category}: Cyrillic in ${where}: «${text.slice(0, 80)}»`);
    }
  }
  for (const [L, overlay] of overlays)
    for (const [slug, n] of Object.entries(overlay.names)) if (CYRILLIC.test(n.name)) ctx.error(`rating/${L}/overlay: Cyrillic in the name of ${slug}`);
  const ruTitles = JSON.stringify(nicheFiles.ru.map((f) => f.apps.map((a) => [a.id, a.title])));
  const enTitles = JSON.stringify(nicheFiles.en.map((f) => f.apps.map((a) => [a.id, a.title])));
  if (ruTitles !== enTitles) ctx.error("rating: ru and en files list different apps (the URL slug index must not depend on the locale)");

  const expect = (label: string, actual: number, expected: number) => {
    if (actual !== expected) ctx.countCheck(`rating: ${actual} ${label} (expected ${expected})`);
  };
  expect("niches", stats.niches, EXPECTED.niches);
  expect("rated apps", stats.apps, EXPECTED.apps);
  expect("ru scenarios", stats.ruScenarios, EXPECTED.ruScenarios);
  expect("en niches with scenarios", stats.enScenarioNiches, EXPECTED.enScenarioNiches);
  expect("en scenarios", stats.enScenarios, EXPECTED.enScenarios);
  expect("apps with quotes", stats.appsWithQuotes, EXPECTED.appsWithQuotes);
  expect("apps with an icon", stats.appsWithIcon, EXPECTED.appsWithIcon);
  expect("apps with screenshots", stats.appsWithShots, EXPECTED.appsWithShots);
  expect("screenshots", stats.shots, EXPECTED.shots);

  // --- files ------------------------------------------------------------------------------------------
  const sourceSha: Record<string, string> = {};
  const inputs = [
    "rich.ru.json",
    "rich.en.json",
    "text.ru.json",
    "ui.en.json",
    "editorial-overrides.ru.json",
    "research-idea-corrections.ru.json",
    ...["ru", ...OVERLAY_LOCALES].map((L) => `quote-translations.${L}.json`),
  ];
  for (const rel of inputs) if (ctx.resExists(rel)) sourceSha[rel] = ctx.resSha(rel);
  const ratingDir = path.join(ctx.repo, "src/data/peoplesRating");
  sourceSha["src/data/peoplesRating"] = sha256(
    fs
      .readdirSync(ratingDir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => `${f}\n${sha256(fs.readFileSync(path.join(ratingDir, f)))}`)
      .join("\n"),
  );
  Object.assign(sourceSha, catalogSha);
  sourceSha[RATING_SEO_FILE] = sha256(fs.readFileSync(path.join(ctx.repo, RATING_SEO_FILE)));

  const files: RatingImportResult["files"] = [];
  for (const L of DATA_LOCALES) {
    const list = nicheFiles[L];
    const niches: RatingIndexEntry[] = list.map((f) => ({
      slug: f.category,
      name: f.name,
      nameLang: f.nameLang,
      count: f.count,
      totalReviews: f.totalReviews,
      intro: f.intro,
      updatedAt: f.updatedAt,
      leaders: f.apps.slice(0, 4).map((a): RatingLeaderFile => ({ id: a.id, title: a.title, short: a.short, icon: a.icon, realScore: a.realScore })),
    }));
    const apps = list.flatMap((f) => f.apps);
    const index: RatingIndexFile = {
      version: 1,
      locale: L,
      source: { description: SOURCE_DESCRIPTION, sha256: sourceSha },
      generatedAt: list.reduce((max, f) => (f.updatedAt > max ? f.updatedAt : max), ""),
      stats: {
        niches: list.length,
        apps: apps.length,
        scenarios: list.reduce((n, f) => n + f.scenarios.length, 0),
        readableScenarios: list.reduce((n, f) => n + f.scenarios.filter((s) => s.job).length, 0),
        appsWithQuotes: stats.appsWithQuotes,
        quotes: stats.quotes,
        appsWithIcon: apps.filter((a) => a.icon !== null).length,
        appsWithShots: apps.filter((a) => a.shots.length > 0).length,
        shots: apps.reduce((n, a) => n + a.shots.length, 0),
      },
      niches,
    };
    files.push({ rel: `${L}/rating/index.json`, content: serialize(index) });
    for (const f of list) files.push({ rel: `${L}/rating/${f.category}.json`, content: serialize(f) });
  }
  for (const [L, overlay] of overlays) files.push({ rel: `${L}/rating/overlay.json`, content: serialize(overlay) });

  const updated = DATA_LOCALES.map((L) => `${L} ${nicheFiles[L].filter((f) => f.updatedAt === today).length}`).join(", ");
  const shortNames = [...shortOf].filter(([id, short]) => short !== titlesById.get(id)).length;
  const report = [
    `rating: ${stats.niches} niches, ${stats.apps} apps; ${stats.appsWithQuotes} apps with ${stats.quotes} quotes`,
    `  media: ${stats.appsWithIcon} apps with an icon, ${stats.appsWithShots} with screenshots (${stats.shots} shots), ${stats.mediaDiffersFromRich} differ from rich.ru; ${shortNames} of ${titlesById.size} apps have a short name; niche files changed today (${today}): ${updated}`,
    `  ru: ${stats.ruChangedByOverrides} texts changed by editorial overrides, ${stats.ruHidden} hidden (withheld / not readable); scenarios ${stats.ruScenarios} (${stats.ruReadableScenarios} readable); quotes: ${stats.quotesRu.pack} quote-translations.ru, ${stats.quotesRu.evidence} evidence translation, ${stats.quotesRu.original} original`,
    `  en: ${stats.enHiddenLikeRu} texts hidden because the ru text is withheld, ${stats.enCyrillicDropped} Cyrillic verdicts dropped; scenarios ${stats.enScenarios} in ${stats.enScenarioNiches} niches (${stats.enReadableScenarios} readable)`,
    `  overlays: ${OVERLAY_LOCALES.map((L) => `${L} ${Object.keys(overlays.get(L)!.names).length} names, ${stats.overlayQuotes[L] ?? 0} quotes in ${stats.overlayApps[L] ?? 0} apps`).join("; ")}`,
    `  payload: ${(files.reduce((n, f) => n + Buffer.byteLength(f.content), 0) / 1024 / 1024).toFixed(1)} MB in ${files.length} files`,
  ];
  return { files, report };
}
