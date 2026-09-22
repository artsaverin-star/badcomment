// Client-safe, pure text helpers that mirror the app's reading rules
// (spec 04 §5.11, spec 01 §6.7/§6.10, spec 09 §5 #24).
//
// Used by server components, client components and scripts/v2/import-app-content.ts.
// No imports except types.

import type { CatalogFile, LocaleCode, UIFile } from "./types";

// ---------------------------------------------------------------------------
// NBSP policy
// ---------------------------------------------------------------------------

export const NBSP = "\u00A0";

/**
 * The content files keep the authored NBSPs. The app replaces NBSP with a plain
 * space before rendering (ClarityReader.swift:45-62); the web mirrors that by
 * default (spec 09 §5 #24). Pass `{ nbsp: "keep" }` to keep them.
 */
export const NBSP_POLICY: "space" | "keep" = "space";

export function applyNbspPolicy(text: string, policy: "space" | "keep" = NBSP_POLICY): string {
  return policy === "space" ? text.replace(/\u00A0/g, " ") : text;
}

// ---------------------------------------------------------------------------
// Sentences and graphemes
// ---------------------------------------------------------------------------

const sentenceSegmenters = new Map<string, Intl.Segmenter>();
let graphemeSegmenter: Intl.Segmenter | null | undefined;

function sentenceSegmenter(locale: string): Intl.Segmenter | null {
  if (typeof Intl === "undefined" || typeof Intl.Segmenter !== "function") return null;
  let s = sentenceSegmenters.get(locale);
  if (!s) {
    s = new Intl.Segmenter(locale, { granularity: "sentence" });
    sentenceSegmenters.set(locale, s);
  }
  return s;
}

/** Raw sentence spans (start, end) of `text`, skipping whitespace-only segments. */
function sentenceSpans(text: string, locale: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  const seg = sentenceSegmenter(locale);
  if (seg) {
    for (const part of seg.segment(text)) {
      if (part.segment.trim() === "") continue;
      spans.push([part.index, part.index + part.segment.length]);
    }
    return spans;
  }
  // Fallback for runtimes without Intl.Segmenter: split after . ! ? … and CJK stops.
  const re = /[^.!?…。！？]*(?:[.!?…。！？]+["»”’)\]]*|$)\s*/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0] === "") {
      re.lastIndex++;
      if (re.lastIndex > text.length) break;
      continue;
    }
    if (m[0].trim() !== "") spans.push([m.index, m.index + m[0].length]);
  }
  return spans;
}

/** Sentences of `text` (trimmed), like Swift `enumerateSubstrings(.bySentences)`. */
export function sentences(text: string, locale: LocaleCode | string): string[] {
  return sentenceSpans(text, locale).map(([a, b]) => text.slice(a, b).trim());
}

/**
 * Whole sentences `[skip, skip + count)` of `text`, as one substring of the
 * source (inner whitespace kept), trimmed. Port of ClarityWelcomeExamples.excerpt.
 */
export function excerpt(text: string, locale: LocaleCode | string, skip = 0, count = 1): string {
  if (count <= 0) return "";
  const spans = sentenceSpans(text, locale);
  const from = Math.max(0, skip);
  const picked = spans.slice(from, from + count);
  if (picked.length === 0) return "";
  return text.slice(picked[0][0], picked[picked.length - 1][1]).trim();
}

/** Length in user-perceived characters (Swift `String.count`). */
export function graphemeLength(text: string): number {
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter =
      typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
        : null;
  }
  if (!graphemeSegmenter) return Array.from(text).length;
  let n = 0;
  for (const part of graphemeSegmenter.segment(text)) {
    void part;
    n++;
  }
  return n;
}

// ---------------------------------------------------------------------------
// Paragraphs (reflow)
// ---------------------------------------------------------------------------

/** Paragraphs longer than this many characters are re-chunked… */
export const REFLOW_THRESHOLD = 430;
/** …into chunks of at most this many characters (a single long sentence may exceed it). */
export const REFLOW_CHUNK = 360;

/** Authored passages: split on "\n\n", trim, drop empties (ResearchEditorial.Observation.paragraphs). */
export function splitPassages(body: string): string[] {
  return body
    .split("\n\n")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Display paragraphs of an article text block. Port of ClarityReading.paragraphs:
 * (editorial overrides are pre-applied in content/v2), NBSP policy, split on
 * "\n\n", trim, drop empties, and re-chunk paragraphs longer than 430 characters
 * at sentence boundaries into chunks of ≤ 360 characters (no sentence dropped).
 * Do NOT use it for quotes (quotes are shown verbatim).
 */
export function paragraphs(
  text: string,
  locale: LocaleCode | string,
  options: { nbsp?: "space" | "keep" } = {},
): string[] {
  const source = applyNbspPolicy(text, options.nbsp ?? NBSP_POLICY);
  const out: string[] = [];
  for (const raw of source.split("\n\n")) {
    const paragraph = raw.trim();
    if (!paragraph) continue;
    // UTF-16 length is an upper bound of the grapheme count: skip the segmenter for short text.
    if (paragraph.length <= REFLOW_THRESHOLD || graphemeLength(paragraph) <= REFLOW_THRESHOLD) {
      out.push(paragraph);
      continue;
    }
    const chunks: string[] = [];
    let current = "";
    let currentLength = 0;
    for (const sentence of sentences(paragraph, locale)) {
      if (!sentence) continue;
      const length = graphemeLength(sentence);
      if (current && currentLength + length > REFLOW_CHUNK) {
        chunks.push(current);
        current = "";
        currentLength = 0;
      }
      if (current) {
        current += " " + sentence;
        currentLength += 1 + length;
      } else {
        current = sentence;
        currentLength = length;
      }
    }
    if (current) chunks.push(current);
    out.push(...(chunks.length ? chunks : [paragraph]));
  }
  return out;
}

/** First sentence of `text` after the NBSP policy (ClarityReading.firstSentence). */
export function firstSentence(text: string, locale: LocaleCode | string): string {
  const clean = applyNbspPolicy(text).trim();
  return sentences(clean, locale)[0] ?? clean;
}

// ---------------------------------------------------------------------------
// UI strings, numbers, plurals
// ---------------------------------------------------------------------------

/** Substitute positional tokens `%1$@`, `%2$@`, … (translators may reorder them). */
export function formatTemplate(template: string, ...args: Array<string | number>): string {
  return template.replace(/%(\d+)\$@/g, (token, n: string) => {
    const value = args[Number(n) - 1];
    return value === undefined ? token : String(value);
  });
}

/** `L(source, …args)`: translation for the UI file's locale, else the Russian source string. */
export function translate(ui: UIFile, source: string, ...args: Array<string | number>): string {
  const value = ui.strings[source] ?? source;
  return args.length ? formatTemplate(value, ...args) : value;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

/** Integer formatting per locale: ru "18 442", en "18,442", de "18.442", fr "18 442", ja "18,442". */
export function formatNumber(n: number, locale: LocaleCode | string): string {
  let f = numberFormats.get(locale);
  if (!f) {
    f = new Intl.NumberFormat(locale);
    numberFormats.set(locale, f);
  }
  return f.format(n);
}

/** CLDR plural category (one / few / many / other …) for `n` in `locale`. */
export function pluralCategory(n: number, locale: LocaleCode | string): string {
  return new Intl.PluralRules(locale).select(n);
}

/**
 * Word form for `n` from `ui.plurals[key]` (Plural.word): the CLDR category,
 * else `other`, else `fallback`.
 */
export function pluralWord(ui: UIFile, key: string, n: number, fallback: string): string {
  const forms = ui.plurals[key];
  if (!forms || Object.keys(forms).length === 0) return fallback;
  return forms[pluralCategory(n, ui.locale)] ?? forms.other ?? fallback;
}

function russianReviews(ui: UIFile, n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return translate(ui, "отзыв");
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return translate(ui, "отзыва");
  return translate(ui, "отзывов");
}

/**
 * «Мы изучили 18 442 отзыва о работе 61 приложения.» / "We studied 18,442 reviews
 * about how 61 apps work." — or null when either number is missing or zero.
 */
export function corpusSentence(
  corpus: { reviews: number; apps: number } | null | undefined,
  ui: UIFile,
): string | null {
  if (!corpus || !(corpus.apps > 0) || !(corpus.reviews > 0)) return null;
  const { reviews, apps } = corpus;
  const reviewWord = pluralWord(ui, "отзыв", reviews, russianReviews(ui, reviews));
  const appWord = pluralWord(
    ui,
    "приложение",
    apps,
    apps % 10 === 1 && apps % 100 !== 11 ? "приложения" : "приложений",
  );
  return translate(
    ui,
    "Мы изучили %1$@ %2$@ о работе %3$@ %4$@.",
    formatNumber(reviews, ui.locale),
    reviewWord,
    formatNumber(apps, ui.locale),
    appWord,
  );
}

/** Research hero subtitle: summary + " " + corpus sentence (locked previews show the summary only). */
export function researchDescription(
  summary: string,
  corpus: { reviews: number; apps: number } | null | undefined,
  ui: UIFile,
): string {
  return [summary, corpusSentence(corpus, ui) ?? ""].filter((s) => s.trim() !== "").join(" ");
}

/** «Сборник от 5 сентября 2026» formatted in the viewer's locale (the app always uses ru_RU). */
export function formatCollectionDate(isoDate: string, locale: LocaleCode | string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

// ---------------------------------------------------------------------------
// Search normalization and name sorting
// ---------------------------------------------------------------------------

/**
 * Case-, width- and diacritic-insensitive form used on both sides of a search
 * (Swift `localizedStandardContains`). The importer stores search.json in this form.
 */
export function normalizeForSearch(text: string, locale: LocaleCode | string): string {
  return text
    .normalize("NFKC")
    .toLocaleLowerCase(locale)
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

/**
 * Search cost guards (defence in depth; the pages also cap `?q=` at 200 chars).
 * Only the first MAX_QUERY_CHARS UTF-16 units of a query are searched, and only its first
 * MAX_QUERY_TOKENS distinct tokens are matched (a longer query can only match more).
 */
export const MAX_QUERY_CHARS = 200;
export const MAX_QUERY_TOKENS = 12;

/** `query` cut to MAX_QUERY_CHARS UTF-16 units, never leaving half of a surrogate pair. */
export function capQuery(query: string): string {
  if (query.length <= MAX_QUERY_CHARS) return query;
  const head = query.slice(0, MAX_QUERY_CHARS);
  return /[\uD800-\uDBFF]$/.test(head) ? head.slice(0, -1) : head;
}

/** Query tokens (split on whitespace), normalized, de-duplicated and capped (see MAX_QUERY_*). */
export function queryTokens(query: string, locale: LocaleCode | string): string[] {
  const tokens = new Set<string>();
  for (const raw of capQuery(query).split(/\s+/u)) {
    if (!raw) continue;
    const token = normalizeForSearch(raw, locale);
    if (!token) continue;
    tokens.add(token);
    if (tokens.size >= MAX_QUERY_TOKENS) break;
  }
  return [...tokens];
}

/**
 * Every token (from queryTokens) is contained in some field; `fields` must already be
 * normalized. No tokens → true. Lets a caller tokenize once and test many haystacks.
 */
export function matchesTokens(tokens: readonly string[], fields: readonly string[]): boolean {
  return tokens.every((token) => fields.some((field) => field.includes(token)));
}

/**
 * StudioContent.matches: every whitespace token of the query is contained in
 * some field. An empty query matches everything. `fields` must already be
 * normalized (search.json is) unless `normalizeFields` is true.
 */
export function matchesQuery(
  query: string,
  fields: readonly string[],
  locale: LocaleCode | string,
  normalizeFields = false,
): boolean {
  const tokens = queryTokens(query, locale);
  if (tokens.length === 0) return true;
  return matchesTokens(tokens, normalizeFields ? fields.map((f) => normalizeForSearch(f, locale)) : fields);
}

const collators = new Map<string, Intl.Collator>();

/** `localizedStandardCompare` equivalent. */
export function compareNames(a: string, b: string, locale: LocaleCode | string): number {
  let c = collators.get(locale);
  if (!c) {
    c = new Intl.Collator(locale, { numeric: true, sensitivity: "base" });
    collators.set(locale, c);
  }
  return c.compare(a, b);
}

// ---------------------------------------------------------------------------
// Ideas and categories
// ---------------------------------------------------------------------------

/** Category slug of an idea id: "habit-tracking-10" → "habit-tracking". */
export function ideaCategorySlug(slug: string): string {
  return slug.replace(/-\d+$/, "");
}

/** Category {slug, name} of an idea from the (public) catalog, or null for unknown ids. */
export function ideaCategory(
  catalog: Pick<CatalogFile, "categories" | "ideas">,
  slug: string,
): { slug: string; name: string } | null {
  const idea = catalog.ideas.find((i) => i.slug === slug);
  const categorySlug = idea?.category ?? ideaCategorySlug(slug);
  const category = catalog.categories.find((c) => c.slug === categorySlug);
  return category ? { slug: category.slug, name: category.name } : null;
}

/** Category display name for an idea ("" when unknown). */
export function ideaCategoryName(catalog: Pick<CatalogFile, "categories" | "ideas">, slug: string): string {
  return ideaCategory(catalog, slug)?.name ?? "";
}
