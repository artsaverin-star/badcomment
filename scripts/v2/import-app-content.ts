/**
 * Import the iOS app's bundled content into content/v2 (spec 04 §7.4).
 *
 *   npx tsx scripts/v2/import-app-content.ts            # import + validate + write
 *   npx tsx scripts/v2/import-app-content.ts --check    # import + validate only (writes nothing)
 *
 * Env:
 *   APP_RESOURCES   path to Inapp/Resources (default: ~/projects/app_04_inapp/Inapp/Resources)
 *   APP_GIT_COMMIT  app repo commit to record when Resources is not inside a git checkout
 *   ALLOW_COUNT_CHANGE=1  downgrade the fixed-count checks (35 / 293 / 792) to warnings
 *
 * The script is a faithful port of the app's assembly (Clarity reader, flow,
 * quote reading, locale packs, editorial overrides, artwork map, onboarding
 * examples). Every fallback is resolved here so the web runtime only reads
 * pre-resolved JSON. Validation runs before anything is written and exits 1
 * on any error.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

import { excerpt, normalizeForSearch, splitPassages } from "../../src/site/content/text";
import type {
  Art,
  CardsFile,
  CatalogFile,
  ContentStats,
  IdeaBlockView,
  IdeaFile,
  LocaleCode,
  Manifest,
  OnboardingFile,
  Placement,
  QuoteView,
  ResearchFile,
  ResearchObservation,
  ResearchSection,
  SearchFile,
  TocEntry,
  UIFile,
  UsedImage,
} from "../../src/site/content/types";

// ---------------------------------------------------------------------------
// Paths and options
// ---------------------------------------------------------------------------

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const RES = path.resolve(
  process.env.APP_RESOURCES ?? path.join(os.homedir(), "projects/app_04_inapp/Inapp/Resources"),
);
const APP_SRC = path.resolve(RES, ".."); // Inapp/ (Swift sources), used for constants + drift checks
const OUT = path.join(REPO, "content/v2");
const ROUTING_MANIFEST = path.join(REPO, "src/site/manifest.generated.ts");
const CHECK_ONLY = process.argv.includes("--check") || process.argv.includes("--dry-run");
const ALLOW_COUNT_CHANGE = process.env.ALLOW_COUNT_CHANGE === "1";

const LOCALES: LocaleCode[] = ["ru", "en", "de", "fr", "ja"];
const EXPECTED = { categories: 35, ideas: 293, quotes: 792 };

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

const errors: string[] = [];
const warnings: string[] = [];
const error = (msg: string) => errors.push(msg);
const warn = (msg: string) => warnings.push(msg);
const countCheck = (msg: string) => (ALLOW_COUNT_CHANGE ? warn(msg) : error(msg));

function fatal(msg: string): never {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Source file access
// ---------------------------------------------------------------------------

const sha256 = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const jsonCache = new Map<string, unknown>();

function resPath(rel: string) {
  return path.join(RES, rel);
}
function resExists(rel: string) {
  return fs.existsSync(resPath(rel));
}
function readJson<T>(rel: string): T {
  if (!jsonCache.has(rel)) {
    const raw = fs.readFileSync(resPath(rel), "utf8");
    jsonCache.set(rel, JSON.parse(raw));
  }
  return jsonCache.get(rel) as T;
}

function readSwift(rel: string): string | null {
  const file = path.join(APP_SRC, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

// ---------------------------------------------------------------------------
// Source schemas (spec 04 §2)
// ---------------------------------------------------------------------------

interface SrcQuote {
  text: string;
  app: string;
  rating: number;
  lang?: string;
}
interface SrcFactIdea {
  slug: string;
  category: string;
  rank: number;
  quote: SrcQuote | null;
  quotes: SrcQuote[];
}
interface SrcFacts {
  version: number;
  ideas: SrcFactIdea[];
}
interface SrcIdeaText {
  title: string;
  oneLiner: string;
}
interface SrcTextPack {
  version: number;
  categories: Record<string, string>;
  ideas: Record<string, SrcIdeaText>;
}
interface SrcEvidence {
  app: string;
  rating: number;
  quote: string;
  translation?: string | null;
}
interface SrcFinding {
  id: string;
  evidence: SrcEvidence[];
}
interface SrcDossier {
  corpusApps?: number | null;
  corpusReviews?: number | null;
  findings?: SrcFinding[] | null;
}
interface SrcRichPack {
  version: number;
  dossiers: Record<string, SrcDossier>;
}
interface SrcQuoteRef {
  findingID: string;
  quoteIndex: number;
}
interface SrcObservation {
  id: string;
  title: string;
  body: string;
  sourceFindingIDs: string[];
  quoteRefs: SrcQuoteRef[];
}
interface SrcSection {
  id: string;
  title: string;
  intro: string;
  observations: SrcObservation[];
}
interface SrcDirection {
  id: string;
  title: string;
  body: string;
  sourceFindingIDs: string[];
  observationID?: string | null;
  ideaSlugs: string[];
}
interface SrcArticle {
  category: string;
  summary: string;
  lead: string;
  audiences: { title: string; body: string; sourceFindingIDs: string[] }[];
  sections: SrcSection[];
  directions: SrcDirection[];
  conclusion?: { title: string; body: string } | null;
}
interface SrcEditorialPack {
  version: number;
  locale: string;
  editedAt: string;
  categories: Record<string, SrcArticle>;
}
interface SrcIdeaBlock {
  id: string;
  kind: string;
  title?: string | null;
  text?: string | null;
  quoteIndex?: number | null;
}
interface SrcIdeaArticle {
  title: string;
  description: string;
  blocks: SrcIdeaBlock[];
}
interface SrcIdeaArticlesPack {
  version: number;
  articles: Record<string, SrcIdeaArticle>;
}
interface SrcIdeaCardsPack {
  ideas: Record<string, { title: string; description: string }>;
}
interface SrcQuoteTranslations {
  version: number;
  translations: Record<string, string>;
}
interface SrcUIPack {
  version: number;
  locale: string;
  strings: Record<string, string>;
  plurals?: Record<string, Record<string, string>>;
}
interface SrcIdeaContext {
  audience?: string | null;
  canonicalSlug?: string | null;
}
interface SrcEditorialReading {
  version: number;
  editedAt: string;
  ideas: Record<string, SrcIdeaContext>;
  findingSections: Record<string, unknown>;
}
interface SrcStudio {
  version: number;
  builtAt: string;
  ideas: Record<string, { buyer?: string | null }>;
}
interface SrcArtImage {
  assetName: string;
  accessibilityLabel: string;
}
interface SrcLaunchArtEntry {
  cover: SrcArtImage;
  audiences: SrcArtImage;
  observations: Record<string, SrcArtImage>;
}
interface SrcOverridePack {
  version: number;
  entries: { id?: string; original: string; sha256: string; replacement: string; status: string }[];
}
interface SrcLocales {
  version: number;
  default?: string;
  available: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const nonBlank = (s: string | null | undefined): s is string => !!s && s.trim() !== "";

// ---------------------------------------------------------------------------
// App constants (parsed from Swift where simple; hard-coded + drift-checked otherwise)
// ---------------------------------------------------------------------------

const FALLBACK_LAUNCH = [
  "interior-design", "habit-tracking", "personal-finance", "calendars-tasks", "notes-pkm",
  "nutrition-calories", "workout-fitness", "sleep-tracking", "language-learning", "photo-editing",
  "travel-planning", "meal-prep-grocery", "voice-recorder", "focus-productivity", "plant-care",
  "pet-care", "guitar-tuner-learn", "scanner-pdf", "weather-apps", "wardrobe-outfit", "run-tracking",
  "hiking-trails", "flashcards", "journaling-mood", "invoice-maker", "meditation-mindfulness",
  "mind-mapping", "car-maintenance", "ai-writing", "teleprompter-captions", "password-manager",
  "translator", "astronomy-stargazing", "resume-builder", "music-streaming",
];

function stringLiterals(src: string): string[] {
  return [...src.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
}

const swiftSources: Record<string, string> = {};
function swift(rel: string): string | null {
  const text = readSwift(rel);
  if (text !== null) swiftSources[rel] = text;
  return text;
}

function parseLaunch(): string[] {
  const src = swift("Content/LaunchEdition.swift");
  if (!src) {
    warn("Content/LaunchEdition.swift not found next to Resources; using the built-in launch list");
    return FALLBACK_LAUNCH;
  }
  const m = src.match(/static let categories = \[([\s\S]*?)\]/);
  if (!m) fatal("cannot parse LaunchEdition.categories");
  return stringLiterals(m[1]);
}

function parseFree(): { category: string; ideas: string[] } {
  const fallback = {
    category: "interior-design",
    ideas: ["interior-design-1", "interior-design-2", "interior-design-3", "interior-design-4", "interior-design-5"],
  };
  const src = swift("Clarity/ClarityContentAccess.swift");
  if (!src) {
    warn("Clarity/ClarityContentAccess.swift not found; using the built-in free layer");
    return fallback;
  }
  const cat = src.match(/static let freeCategory = "([^"]+)"/);
  const ideas = src.match(/static let freeIdeaIDs = \[([^\]]*)\]/);
  if (!cat || !ideas) fatal("cannot parse ClarityContentAccess free layer");
  return { category: cat[1], ideas: stringLiterals(ideas[1]) };
}

function parseCorpus(): { reviews: number; apps: number; niches: number } {
  const fallback = { reviews: 1451072, apps: 4623, niches: 72 };
  const src = swift("Models/ResearchProduct.swift");
  if (!src) {
    warn("Models/ResearchProduct.swift not found; using the built-in corpus constants");
    return fallback;
  }
  const num = (name: string) => {
    const m = src.match(new RegExp(`static let ${name} = ([0-9_]+)`));
    if (!m) fatal(`cannot parse ResearchCorpus.${name}`);
    return Number(m[1].replace(/_/g, ""));
  };
  return { reviews: num("reviews"), apps: num("apps"), niches: num("niches") };
}

/** Hand-coded artwork (ClarityResearchArtwork.swift `articles`) — wins over launch-research-artwork.json. */
interface HandArt {
  prefix: string;
  cover: string;
  audiences?: string;
  observations: Record<string, string>;
  sections?: Record<string, { key: string; alt: string }>;
}
const HANDCRAFTED_ART: Record<string, HandArt> = {
  "interior-design": {
    prefix: "ResearchInterior_",
    cover: "Двое людей сравнивают образцы цвета в комнате, держа развёрнутый план будущего интерьера.",
    audiences: "Образцы цвета, рулетка со шкафом и раскрытая книга проекта показывают три задачи планирования интерьера.",
    observations: {
      "controlled-change": "Женщина меняет штору; окно, диван и проход остаются на своих местах.",
      measure: "Люди проверяют рулеткой, помещается ли шкаф в нишу у плинтуса.",
      dependencies: "Рука сдвигает перегородку, связанную нитями с соседними стенами плана.",
      levels: "Двое людей устанавливают последнюю ступень между лестницей и верхним этажом.",
      "saved-work": "Из раскрытой книги снова поднимается сохранённая комната; закладки отмечают предыдущие версии.",
      limits: "Ластик стирает комнату с плана, но потраченный жетон остаётся в коробке.",
    },
    sections: {
      finish: { key: "directions", alt: "Люди вместе уточняют детали комнаты, используя рамку, линейку и книгу проекта." },
    },
  },
  "habit-tracking": {
    prefix: "ResearchHabits_",
    cover: "Женщина укладывает следующий камень в дорожку рядом с цветущим растением.",
    audiences: "Вид сверху: трое людей читают, делают растяжку и поливают растение.",
    observations: {
      "quick-mark": "Женщина с сумкой у открытой двери держит перед собой руку с часами.",
      sequence: "Утренние действия выстроены в дорожку, которая ведёт к выходу из дома.",
      "pause-correction": "Человек отдыхает среди сохранённых дней: перерыв не уничтожает уже пройденный путь.",
      "social-choice": "Двое друзей передают друг другу лейку, ухаживая каждый за своей грядкой.",
    },
  },
  "personal-finance": {
    prefix: "ResearchFinance_",
    cover: "Пара за столом раскладывает повседневные деньги по назначению.",
    audiences: "Чек с блокнотом, конверты и модель дома показывают повседневные покупки и будущие траты.",
    observations: {
      manual: "Человек переносит покупку с чека в свой блокнот расходов.",
      allowance: "Отдельные конверты сохраняют деньги на обязательства; рядом остаётся доступная часть бюджета.",
      couple: "Двое сверяют общий бюджет, сохраняя личную часть денег у каждого.",
      archive: "История расходов бережно переходит из старой книги в новую.",
    },
  },
};

/** ClarityWelcomeExamples.articles + categoryLabel. */
const ONBOARDING_ARTICLES = [
  { category: "interior-design", observationID: "controlled-change", excerptSkip: 1, excerptCount: 1, quoteIndex: 0, quoteSkip: 0, quoteCount: 1, label: "Дизайн интерьера", swift: '.init(category: "interior-design", observationID: "controlled-change", excerptSkip: 1)' },
  { category: "habit-tracking", observationID: "pause-correction", excerptSkip: 0, excerptCount: 1, quoteIndex: 0, quoteSkip: 1, quoteCount: 1, label: "Привычки", swift: '.init(category: "habit-tracking", observationID: "pause-correction", quoteSkip: 1)' },
  { category: "personal-finance", observationID: "couple", excerptSkip: 0, excerptCount: 2, quoteIndex: 0, quoteSkip: 0, quoteCount: 1, label: "Личные финансы", swift: '.init(category: "personal-finance", observationID: "couple", excerptCount: 2)' },
  { category: "nutrition-calories", observationID: "database", excerptSkip: 0, excerptCount: 1, quoteIndex: 0, quoteSkip: 0, quoteCount: 1, label: "Питание", swift: '.init(category: "nutrition-calories", observationID: "database")' },
  { category: "calendars-tasks", observationID: "time", excerptSkip: 0, excerptCount: 1, quoteIndex: 0, quoteSkip: 0, quoteCount: 1, label: "Календари и задачи", swift: '.init(category: "calendars-tasks", observationID: "time")' },
];

/** ClarityWelcomeExamples.ideaTeasers (only entries whose slug is shown matter). */
const IDEA_TEASERS: Record<string, { title: string; description: string }> = {
  "interior-design-1": {
    title: "Новая комната. Те же стены.",
    description: "Новая мебель и отделка на фото твоей комнаты. Стены, окна и двери остаются на месте.",
  },
};

/** Locale-independent illustrations (onboarding, paywall, settings, privacy sheet; spec 09 C4). */
const WELCOME_ASSETS = ["WelcomeReviews_v7", "WelcomeLibrary_v7", "WelcomeResearch_v7", "WelcomeProduct_v7", "ClarityResearch"];

const TOC_KEYS = {
  introduction: "Главное",
  audience: "Какие задачи решают люди",
  directions: "Другие возможности",
  ideas: "Другие идеи категории",
};

const RU_PLURALS: Record<string, Record<string, string>> = {
  отзыв: { one: "отзыв", few: "отзыва", many: "отзывов" },
  // Genitive after «о работе» — the corpus sentence is the only Clarity use (spec 04 §7.4 step 4).
  приложение: { one: "приложения", few: "приложений", many: "приложений" },
  идея: { one: "идея", few: "идеи", many: "идей" },
  наблюдение: { one: "наблюдение", few: "наблюдения", many: "наблюдений" },
  "наблюдение в отзывах": { one: "наблюдение в отзывах", few: "наблюдения в отзывах", many: "наблюдений в отзывах" },
};

function driftChecks() {
  const art = swift("Clarity/ClarityResearchArtwork.swift");
  if (art) {
    for (const [cat, a] of Object.entries(HANDCRAFTED_ART)) {
      if (!art.includes(`"${cat}": makeArticle(`) || !art.includes(`assetPrefix: "${a.prefix}"`))
        error(`ClarityResearchArtwork.swift drift: hand-coded entry for ${cat} changed; update HANDCRAFTED_ART`);
      const alts = [a.cover, a.audiences, ...Object.values(a.observations), ...Object.values(a.sections ?? {}).map((s) => s.alt)];
      for (const alt of alts) if (alt && !art.includes(`L("${alt}")`)) error(`ClarityResearchArtwork.swift drift: alt text not found: ${alt}`);
      for (const key of Object.keys(a.observations)) if (!art.includes(`"${key}": L(`)) error(`ClarityResearchArtwork.swift drift: observation ${cat}/${key}`);
    }
    const handCount = (art.match(/": makeArticle\(/g) ?? []).length;
    if (handCount !== Object.keys(HANDCRAFTED_ART).length) error(`ClarityResearchArtwork.swift drift: ${handCount} hand-coded articles (expected ${Object.keys(HANDCRAFTED_ART).length})`);
  } else warn("Clarity/ClarityResearchArtwork.swift not found; hand-coded artwork not drift-checked");

  const ex = swift("Clarity/ClarityWelcomeExamples.swift");
  if (ex) {
    for (const a of ONBOARDING_ARTICLES) {
      if (!ex.includes(a.swift)) error(`ClarityWelcomeExamples.swift drift: example ${a.category}/${a.observationID} changed`);
      if (!ex.includes(`case "${a.category}": L("${a.label}")`)) error(`ClarityWelcomeExamples.swift drift: label for ${a.category}`);
    }
    const count = (ex.match(/\.init\(category: "/g) ?? []).length;
    if (count !== ONBOARDING_ARTICLES.length) error(`ClarityWelcomeExamples.swift drift: ${count} article examples`);
    for (const [slug, t] of Object.entries(IDEA_TEASERS)) {
      if (!ex.includes(`"${slug}": (`) || !ex.includes(`L("${t.title}")`) || !ex.includes(`L("${t.description}")`))
        error(`ClarityWelcomeExamples.swift drift: teaser ${slug}`);
    }
    if (!ex.includes("static let ideaSlugs = ClarityContentAccess.freeIdeaIDs")) error("ClarityWelcomeExamples.swift drift: ideaSlugs is no longer freeIdeaIDs");
  } else warn("Clarity/ClarityWelcomeExamples.swift not found; onboarding examples not drift-checked");

  const ed = swift("Studio/StudioEditorial.swift");
  if (ed && !ed.includes(`["evidence", "quotes", "quote", "quoteRu", "translation", "translations",`))
    error("StudioEditorial.swift drift: preparedData verbatim key list changed");
  swift("Clarity/ClarityResearchFlow.swift");
  swift("Content/QuoteReading.swift");
  swift("Clarity/ClarityReader.swift");
}

// ---------------------------------------------------------------------------
// Locale chains and pack resolution (spec 04 §4.2)
// ---------------------------------------------------------------------------

const uniq = <T,>(xs: (T | null | undefined)[]) => [...new Set(xs.filter((x): x is T => x != null))];
const baseOf = (l: string) => {
  const b = l.split("-")[0];
  return b !== l ? b : null;
};
const fallbacks = (l: string) => uniq([l, baseOf(l), "en", "ru"]);
const ownChain = (l: string) => uniq([l, baseOf(l)]);

interface Resolved<T> {
  locale: string;
  file: string;
  data: T;
}

/** LocalePacks: first file that exists, decodes and passes `accept` (decode errors skip). */
function localePack<T>(name: string, chain: string[], accept: (v: unknown) => boolean): Resolved<T> | null {
  for (const c of chain) {
    const file = `${name}.${c}.json`;
    if (!resExists(file)) continue;
    let data: unknown;
    try {
      data = readJson(file);
    } catch {
      warn(`${file} does not parse; skipped like the app does`);
      continue;
    }
    if (!accept(data)) continue;
    return { locale: c, file, data: data as T };
  }
  return null;
}

/** BundledContent.read: first existing file wins; a decode error is fatal. */
function bundledPack<T>(name: string, chain: string[]): Resolved<T> {
  for (const c of chain) {
    const file = `${name}.${c}.json`;
    if (!resExists(file)) continue;
    try {
      return { locale: c, file, data: readJson<T>(file) };
    } catch (e) {
      fatal(`${file} does not decode: ${(e as Error).message}`);
    }
  }
  fatal(`no ${name} pack for chain ${chain.join(" → ")}`);
}

const acceptEditorial = (v: unknown) => isObj(v) && v.version === 1 && isStr(v.locale) && isStr(v.editedAt) && isObj(v.categories);
const acceptIdeaArticles = (v: unknown) => isObj(v) && v.version === 1 && isObj(v.articles);
const acceptIdeaCards = (v: unknown) => isObj(v) && isObj(v.ideas);
const acceptQuoteTr = (v: unknown) => isObj(v) && v.version === 1 && isObj(v.translations);
const acceptUI = (v: unknown) => isObj(v) && v.version === 1 && isStr(v.locale) && isObj(v.strings);
const acceptReading = (v: unknown) => isObj(v) && v.version === 1 && isStr(v.editedAt) && isObj(v.ideas) && isObj(v.findingSections);

// ---------------------------------------------------------------------------
// Editorial overrides (spec 04 §2.12, Studio/StudioEditorial.swift)
// ---------------------------------------------------------------------------

const overrides = new Map<string, string>();
const overrideHits: Record<string, number> = {};
let overridesRejected = 0;

function loadOverrides() {
  for (const name of ["editorial-overrides.ru.json", "research-idea-corrections.ru.json"]) {
    if (!resExists(name)) {
      warn(`${name} missing: no editorial corrections from it`);
      continue;
    }
    let pack: SrcOverridePack;
    try {
      pack = readJson<SrcOverridePack>(name);
    } catch {
      warn(`${name} does not decode; ignored like the app does`);
      continue;
    }
    if (pack.version !== 1) continue;
    for (const entry of pack.entries) {
      const ok =
        sha256(Buffer.from(entry.original, "utf8")) === entry.sha256 &&
        entry.replacement.trim() !== "" &&
        (entry.status === "reworded" || entry.status === "withheld");
      if (!ok) {
        overridesRejected++;
        warn(`override ${entry.id ?? "?"} in ${name} rejected (sha256/status/replacement check failed)`);
        continue;
      }
      overrides.set(entry.original, entry.replacement);
    }
  }
}

/** StudioEditorial.text: exact whole-string replacement. */
function ov(s: string, where: string): string {
  const r = overrides.get(s);
  if (r === undefined) return s;
  overrideHits[where] = (overrideHits[where] ?? 0) + 1;
  return r;
}

const VERBATIM_KEYS = new Set([
  "evidence", "quotes", "quote", "quoteRu", "translation", "translations",
  "original", "app", "appName", "appTitle", "author", "appID", "id", "slug",
]);

/** StudioEditorial.preparedData: walk every string except quote subtrees, app names and ids. */
function prepared(value: unknown, where: string): unknown {
  if (typeof value === "string") return ov(value, where);
  if (Array.isArray(value)) return value.map((v) => prepared(v, where));
  if (!isObj(value)) return value;
  const isApp = "id" in value && "verdict" in value;
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (VERBATIM_KEYS.has(key)) out[key] = nested;
    else if (key === "apps" && Array.isArray(nested) && nested.every(isStr)) out[key] = nested;
    else if (isApp && (key === "title" || key === "name")) out[key] = nested;
    else out[key] = prepared(nested, where);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

interface ImageInfo {
  file: string;
  width: number;
  height: number;
  sha256: string;
}
const imageInfoCache = new Map<string, ImageInfo | null>();

function imageSize(buf: Buffer): { width: number; height: number } | null {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc)
        return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
  }
  return null;
}

/** Asset catalog lookup (`UIImage(named:)`): Assets.xcassets/<name>.imageset/<first image>. */
function assetInfo(asset: string): ImageInfo | null {
  if (imageInfoCache.has(asset)) return imageInfoCache.get(asset) ?? null;
  let info: ImageInfo | null = null;
  const dir = `Assets.xcassets/${asset}.imageset`;
  const contents = `${dir}/Contents.json`;
  if (resExists(contents)) {
    const c = readJson<{ images?: { filename?: string }[] }>(contents);
    const filename = c.images?.find((im) => im.filename)?.filename;
    if (filename && resExists(`${dir}/${filename}`)) {
      const rel = `${dir}/${filename}`;
      const buf = fs.readFileSync(resPath(rel));
      const size = imageSize(buf);
      if (size) info = { file: rel, ...size, sha256: sha256(buf) };
      else error(`cannot read image size of ${rel}`);
    }
  }
  imageInfoCache.set(asset, info);
  return info;
}

const usedImages = new Map<string, UsedImage>();

function widthsFor(kind: UsedImage["kind"], srcWidth: number): number[] {
  const targets = kind === "alpha" ? [400, 800] : [480, 800, 1200];
  const ws = targets.filter((w) => w <= srcWidth);
  if (srcWidth < targets[targets.length - 1] && !ws.includes(srcWidth)) ws.push(srcWidth);
  return ws.sort((a, b) => a - b);
}

/** Register an exported image and return its Art. Missing assets are validation errors. */
function art(out: string, asset: string, alt: string): Art {
  const info = assetInfo(asset);
  const kind: UsedImage["kind"] = out.startsWith("welcome/") ? "alpha" : "photo";
  if (!info) {
    error(`missing asset ${asset} (for ${out})`);
    return { src: out, alt, widths: [], width: 0, height: 0 };
  }
  const widths = widthsFor(kind, info.width);
  const max = widths[widths.length - 1];
  const prev = usedImages.get(out);
  if (prev && prev.asset !== asset) error(`media name collision: ${out} ← ${prev.asset} and ${asset}`);
  usedImages.set(out, {
    out,
    asset,
    file: info.file,
    kind,
    widths,
    width: info.width,
    height: info.height,
    sha256: info.sha256,
  });
  return { src: out, alt, widths, width: max, height: Math.round((info.height * max) / info.width) };
}

// ---------------------------------------------------------------------------
// Per-locale library (Library.swift join)
// ---------------------------------------------------------------------------

interface Idea {
  slug: string;
  category: string;
  categoryName: string;
  rank: number;
  quotes: SrcQuote[];
  text: SrcIdeaText;
}

interface LocaleData {
  locale: LocaleCode;
  ideas: Idea[]; // all joined ideas, facts order
  bySlug: Map<string, Idea>;
  categoryNames: Record<string, string>;
  niches: Set<string>;
  dossiers: Record<string, SrcDossier>;
  editorial: SrcEditorialPack | null;
  ideaArticles: SrcIdeaArticlesPack | null;
  ideaCards: SrcIdeaCardsPack | null;
  quoteTr: Record<string, string> | null;
  context: (slug: string) => SrcIdeaContext | undefined;
  ui: SrcUIPack | null;
  resolved: Record<string, string | null>;
}

function loadLocale(L: LocaleCode, facts: SrcFacts): LocaleData {
  const text = bundledPack<SrcTextPack>("text", fallbacks(L));
  const rich = bundledPack<SrcRichPack>("rich", fallbacks(L));
  const textData = text.locale === "ru" ? (prepared(text.data, "text.ru") as SrcTextPack) : text.data;
  const richData = rich.locale === "ru" ? (prepared(rich.data, "rich.ru") as SrcRichPack) : rich.data;

  const editorial = localePack<SrcEditorialPack>("research-editorial", fallbacks(L), acceptEditorial);
  const ideaArticles = localePack<SrcIdeaArticlesPack>("idea-articles", fallbacks(L), acceptIdeaArticles);
  const ideaCards = localePack<SrcIdeaCardsPack>("idea-cards", fallbacks(L), acceptIdeaCards);
  const quoteTr = localePack<SrcQuoteTranslations>("quote-translations", ownChain(L), acceptQuoteTr);
  const reading = localePack<SrcEditorialReading>("editorial-reading", fallbacks(L), acceptReading);
  const contexts = localePack<SrcEditorialReading>("research-idea-contexts", fallbacks(L), acceptReading);
  const ui = localePack<SrcUIPack>("ui", L === "ru" ? ["ru"] : [...ownChain(L), "en"], acceptUI);

  const ideas: Idea[] = [];
  for (const f of facts.ideas) {
    const body = textData.ideas[f.slug];
    if (!body) continue;
    ideas.push({
      slug: f.slug,
      category: f.category,
      categoryName: textData.categories[f.category] ?? f.category,
      rank: f.rank,
      quotes: f.quotes.length ? f.quotes : f.quote ? [f.quote] : [],
      text: body,
    });
  }
  const bySlug = new Map(ideas.map((i) => [i.slug, i]));
  if (bySlug.size !== ideas.length) error(`${L}: duplicate idea slugs in facts`);

  return {
    locale: L,
    ideas,
    bySlug,
    categoryNames: textData.categories,
    niches: new Set(ideas.map((i) => i.category)),
    dossiers: richData.dossiers,
    editorial: editorial?.data ?? null,
    ideaArticles: ideaArticles?.data ?? null,
    ideaCards: ideaCards?.data ?? null,
    quoteTr: quoteTr?.data.translations ?? null,
    context: (slug) => contexts?.data.ideas[slug] ?? reading?.data.ideas[slug],
    ui: ui?.data ?? null,
    resolved: {
      text: text.file,
      rich: rich.file,
      "research-editorial": editorial?.file ?? null,
      "idea-articles": ideaArticles?.file ?? null,
      "idea-cards": ideaCards?.file ?? null,
      "quote-translations": quoteTr?.file ?? null,
      "editorial-reading": reading?.file ?? null,
      "research-idea-contexts": contexts?.file ?? null,
      ui: ui?.file ?? null,
    },
  };
}

// ---------------------------------------------------------------------------
// Assembly helpers
// ---------------------------------------------------------------------------

let LAUNCH: string[] = [];
let LAUNCH_SET = new Set<string>();

/** ClarityReading.canonicalIdeas. */
function canonicalIdeas(list: Idea[], lib: LocaleData): Idea[] {
  const seen = new Set<string>();
  const out: Idea[] = [];
  for (const idea of list) {
    const cs = lib.context(idea.slug)?.canonicalSlug;
    const canonical = cs ? lib.bySlug.get(cs) : undefined;
    const resolved =
      canonical && !(LAUNCH_SET.has(idea.category) && !LAUNCH_SET.has(canonical.category)) ? canonical : idea;
    if (!seen.has(resolved.slug)) {
      seen.add(resolved.slug);
      out.push(resolved);
    }
  }
  return out;
}

/** L(source): pack string or the Russian source. */
function tr(lib: LocaleData, source: string, missing?: Set<string>): string {
  const v = lib.ui?.strings[source];
  if (v === undefined && lib.locale !== "ru") missing?.add(source);
  return v ?? source;
}

/** QuoteReading.text. */
function displayQuote(lib: LocaleData, original: string, translation: string | null | undefined): { text: string; own: boolean } {
  const t = lib.quoteTr?.[original];
  if (nonBlank(t)) return { text: t, own: true };
  if (nonBlank(translation)) return { text: translation, own: false };
  return { text: original, own: false };
}

/** Observation.selectedQuotes: resolve refs, drop invalid, dedupe by (app, quote) within the observation. */
function selectedQuotes(obs: SrcObservation, dossier: SrcDossier | undefined, onMiss?: (ref: SrcQuoteRef) => void): SrcEvidence[] {
  const findings = new Map<string, SrcFinding>();
  for (const f of dossier?.findings ?? []) if (!findings.has(f.id)) findings.set(f.id, f);
  const seen = new Set<string>();
  const out: SrcEvidence[] = [];
  for (const ref of obs.quoteRefs) {
    const ev = findings.get(ref.findingID)?.evidence[ref.quoteIndex];
    if (!ev) {
      onMiss?.(ref);
      continue;
    }
    const key = ev.app + "\u001f" + ev.quote;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ev);
  }
  return out;
}

interface ArtRef {
  asset: string;
  altRu: string;
  /** alt fallback when the pack has no translation of altRu. */
  template: string;
}
interface CategoryArt {
  cover: ArtRef;
  audiences: ArtRef | null;
  observations: Record<string, ArtRef>;
  sections: Record<string, ArtRef>;
}

let launchArtwork: Record<string, SrcLaunchArtEntry> = {};

/** ClarityResearchArtwork.article(for:) = hand-coded ?? launch JSON. */
function categoryArt(category: string, article: SrcArticle, name: string): CategoryArt | null {
  const obsTitle = (id: string) =>
    article.sections.flatMap((s) => s.observations).find((o) => o.id === id)?.title ?? name;
  const hand = HANDCRAFTED_ART[category];
  if (hand) {
    return {
      cover: { asset: hand.prefix + "cover", altRu: hand.cover, template: name },
      audiences: hand.audiences ? { asset: hand.prefix + "audiences", altRu: hand.audiences, template: name } : null,
      observations: Object.fromEntries(
        Object.entries(hand.observations).map(([k, alt]) => [k, { asset: hand.prefix + k, altRu: alt, template: obsTitle(k) }]),
      ),
      sections: Object.fromEntries(
        Object.entries(hand.sections ?? {}).map(([k, s]) => [
          k,
          { asset: hand.prefix + s.key, altRu: s.alt, template: article.sections.find((x) => x.id === k)?.title ?? name },
        ]),
      ),
    };
  }
  const entry = launchArtwork[category];
  if (!entry) return null;
  return {
    cover: { asset: entry.cover.assetName, altRu: entry.cover.accessibilityLabel, template: name },
    audiences: { asset: entry.audiences.assetName, altRu: entry.audiences.accessibilityLabel, template: name },
    observations: Object.fromEntries(
      Object.entries(entry.observations).map(([k, im]) => [k, { asset: im.assetName, altRu: im.accessibilityLabel, template: obsTitle(k) }]),
    ),
    sections: {},
  };
}

// ---------------------------------------------------------------------------
// Build one locale
// ---------------------------------------------------------------------------

interface LocaleOutput {
  catalog: CatalogFile;
  cards: CardsFile;
  search: SearchFile;
  onboarding: OnboardingFile;
  ui: UIFile;
  research: Record<string, ResearchFile>;
  ideas: Record<string, IdeaFile>;
  stats: ContentStats;
  structure: string;
  ideaStructure: string;
  researchSignature: string;
}

let FREE = { category: "", ideas: [] as string[] };
let uiKeyUnion: string[] = [];

function buildLocale(lib: LocaleData, studio: SrcStudio): LocaleOutput {
  const L = lib.locale;
  const missingUI = new Set<string>();
  const t = (s: string) => tr(lib, s, missingUI);
  const altOf = (ref: ArtRef) => {
    if (L === "ru") return ref.altRu;
    const v = lib.ui?.strings[ref.altRu];
    if (v !== undefined) return v;
    warn(`${L}: no translation for alt text «${ref.altRu}»; using «${ref.template}»`);
    return ref.template;
  };
  const researchArt = (ref: ArtRef, alt = altOf(ref)) => art(`research/${ref.asset}`, ref.asset, alt);
  const ideaArt = (idea: Idea): Art => {
    // ClarityIdeaCardArt: EditorialIdeaCover_<slug> ?? IdeaCover_<slug> ?? category object (unsupported on the web).
    const asset = [`EditorialIdeaCover_${idea.slug}`, `IdeaCover_${idea.slug}`].find((a) => assetInfo(a));
    if (!asset) {
      error(`${idea.slug}: no cover (EditorialIdeaCover_/IdeaCover_); the app would draw the category object, which the web does not support`);
      return { src: `ideas/${idea.slug}`, alt: "", widths: [], width: 0, height: 0 };
    }
    return art(`ideas/${idea.slug}`, asset, "");
  };

  const stats: ContentStats = {
    categories: 0,
    ideas: 0,
    sections: 0,
    observations: 0,
    directions: 0,
    placements: 0,
    quotes: 0,
    ideaQuotes: 0,
    quotesWithoutOwnTranslation: 0,
  };

  // --- ideas in the launch edition (Library join ∩ LaunchEdition) -----------
  const launchIdeas = lib.ideas.filter((i) => LAUNCH_SET.has(i.category));
  const catalogIdeas = [...launchIdeas].sort((a, b) => a.rank - b.rank || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  const canon = canonicalIdeas(catalogIdeas, lib).filter((i) => LAUNCH_SET.has(i.category));
  if (canon.length !== catalogIdeas.length || canon.some((i, n) => i.slug !== catalogIdeas[n].slug))
    error(`${L}: canonical idea resolution is not a no-op for the launch edition`);
  for (const idea of launchIdeas) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.test(idea.slug) || !idea.slug.startsWith(idea.category + "-"))
      error(`${L}: idea slug ${idea.slug} is not "<category>-<n>"`);
  }
  if (launchIdeas.length !== EXPECTED.ideas) countCheck(`${L}: ${launchIdeas.length} launch ideas (expected ${EXPECTED.ideas})`);
  stats.ideas = launchIdeas.length;
  for (const slug of FREE.ideas) if (!lib.bySlug.has(slug)) error(`${L}: free idea ${slug} missing`);

  // --- card copy (ClarityIdeaCardCopy) ---------------------------------------
  const cardOf = (idea: Idea) => ({
    title: lib.ideaCards?.ideas[idea.slug]?.title ?? idea.text.title,
    description: lib.ideaCards?.ideas[idea.slug]?.description ?? idea.text.oneLiner,
  });
  const cards: CardsFile = { version: 1, locale: L, ideas: {} };
  for (const idea of catalogIdeas) {
    if (!lib.ideaCards?.ideas[idea.slug]) warn(`${L}: ${idea.slug} has no idea-cards entry; using text.title/oneLiner`);
    cards.ideas[idea.slug] = cardOf(idea);
  }

  // --- research articles ------------------------------------------------------
  const research: Record<string, ResearchFile> = {};
  const catalogCategories: CatalogFile["categories"] = [];
  const searchResearch: SearchFile["research"] = {};
  const signature: unknown[] = [];

  for (const category of LAUNCH) {
    const name = lib.categoryNames[category] ?? category;
    if (!lib.categoryNames[category]) warn(`${L}: no category name for ${category}; using the slug`);
    if (!lib.niches.has(category)) {
      error(`${L}: category ${category} has no ideas (the app would show «Материал недоступен»)`);
      continue;
    }
    const article = lib.editorial?.categories[category];
    if (!article) {
      error(`${L}: no research-editorial article for ${category} (the dossier fallback view is not ported)`);
      continue;
    }
    if (article.category !== category) warn(`${L}: research-editorial article under ${category} says category ${article.category}`);
    const dossier = lib.dossiers[category];
    if (!dossier) warn(`${L}: no dossier for ${category}; no corpus sentence and no quotes`);
    const artMap = categoryArt(category, article, name);
    if (!artMap) {
      error(`${L}: no artwork for ${category}`);
      continue;
    }

    // Flow (ClarityResearchFlow)
    const observations = article.sections.flatMap((s) => s.observations);
    const obsIds = new Set(observations.map((o) => o.id));
    if (obsIds.size !== observations.length) error(`${L}/${category}: duplicate observation ids`);
    const assigned = new Map<string, SrcDirection[]>();
    const unassigned: SrcDirection[] = [];
    for (const direction of article.directions) {
      let destination: string | null = null;
      if (direction.observationID && obsIds.has(direction.observationID)) destination = direction.observationID;
      else {
        if (direction.observationID) warn(`${L}/${category}: direction ${direction.id} names unknown observation ${direction.observationID}`);
        const sources = new Set(direction.sourceFindingIDs);
        let best = 0;
        for (const o of observations) {
          const overlap = o.sourceFindingIDs.filter((id, n, arr) => arr.indexOf(id) === n && sources.has(id)).length;
          if (overlap > best) {
            best = overlap;
            destination = o.id;
          }
        }
      }
      if (destination) assigned.set(destination, [...(assigned.get(destination) ?? []), direction]);
      else unassigned.push(direction);

      const resolvedIdeas = direction.ideaSlugs.filter((s) => lib.bySlug.has(s));
      if (resolvedIdeas.length !== direction.ideaSlugs.length)
        error(`${L}/${category}: direction ${direction.id} references unknown ideas ${direction.ideaSlugs.filter((s) => !lib.bySlug.has(s)).join(", ")}`);
      if (resolvedIdeas.length === 0 && direction.body.trim() === "")
        error(`${L}/${category}: direction ${direction.id} has neither ideas nor body`);
    }
    stats.directions += article.directions.length;

    const seenIdeas = new Set<string>();
    const toPlacements = (directions: SrcDirection[]): Placement[] => {
      const out: Placement[] = [];
      for (const direction of directions) {
        const ideas = canonicalIdeas(
          direction.ideaSlugs.map((s) => lib.bySlug.get(s)).filter((i): i is Idea => !!i),
          lib,
        ).filter((i) => {
          if (seenIdeas.has(i.slug)) return false;
          seenIdeas.add(i.slug);
          return true;
        });
        if (ideas.length === 0 && direction.body.trim() === "") continue;
        out.push({
          directionId: direction.id,
          title: direction.title,
          body: ov(direction.body, "research.direction"),
          ideas: ideas.map((i) => i.slug),
        });
      }
      return out;
    };
    const placementsByObs = new Map<string, Placement[]>();
    for (const o of observations) placementsByObs.set(o.id, toPlacements(assigned.get(o.id) ?? []));
    const remainingDirections = toPlacements(unassigned);
    const remainingIdeas = canonicalIdeas(
      lib.ideas.filter((i) => i.category === category).sort((a, b) => a.rank - b.rank),
      lib,
    )
      .filter((i) => {
        if (seenIdeas.has(i.slug)) return false;
        seenIdeas.add(i.slug);
        return true;
      })
      .map((i) => i.slug);
    if (remainingDirections.length) warn(`${L}/${category}: ${remainingDirections.length} unassigned directions («Другие возможности»)`);
    if (remainingIdeas.length) warn(`${L}/${category}: ${remainingIdeas.length} ideas not placed by any direction («Другие идеи категории»)`);

    // Quotes: per observation, then article-wide dedupe by (app, quote)
    const seenQuotes = new Set<string>();
    const quotesByObs = new Map<string, QuoteView[]>();
    let refCount = 0;
    for (const o of observations) {
      refCount += o.quoteRefs.length;
      const selected = selectedQuotes(o, dossier, (ref) =>
        error(`${L}/${category}: quoteRef ${ref.findingID}#${ref.quoteIndex} of ${o.id} does not resolve`),
      );
      const views: QuoteView[] = [];
      for (const ev of selected) {
        const key = ev.app + "\u001f" + ev.quote;
        if (seenQuotes.has(key)) {
          warn(`${L}/${category}: quote of ${o.id} already shown earlier in the article (dropped)`);
          continue;
        }
        seenQuotes.add(key);
        const d = displayQuote(lib, ev.quote, ev.translation);
        if (!d.own && L !== "en") {
          stats.quotesWithoutOwnTranslation++;
          warn(`${L}/${category}/${o.id}: quote has no ${L} translation; showing ${nonBlank(ev.translation) ? "the evidence translation" : "the original"}`);
        }
        views.push({ text: d.text, rating: ev.rating, app: ev.app });
      }
      quotesByObs.set(o.id, views);
    }
    const shownQuotes = [...quotesByObs.values()].reduce((n, q) => n + q.length, 0);
    if (shownQuotes !== refCount) error(`${L}/${category}: ${refCount} quoteRefs but ${shownQuotes} quotes shown (unresolved or duplicate)`);
    stats.quotes += shownQuotes;

    // Assemble sections
    const sections: ResearchSection[] = article.sections.map((section) => {
      stats.sections++;
      const sectionArt = artMap.sections[section.id];
      return {
        id: section.id,
        title: section.title,
        intro: ov(section.intro, "research.intro"),
        art: sectionArt ? researchArt(sectionArt) : null,
        observations: section.observations.map((o): ResearchObservation => {
          stats.observations++;
          const obsArt = artMap.observations[o.id];
          const placements = placementsByObs.get(o.id) ?? [];
          stats.placements += placements.length;
          return {
            id: o.id,
            title: o.title,
            passages: splitPassages(o.body).map((p) => ov(p, "research.passage")),
            quotes: quotesByObs.get(o.id) ?? [],
            art: obsArt ? researchArt(obsArt) : null,
            placements,
          };
        }),
      };
    });
    for (const k of Object.keys(artMap.observations))
      if (!obsIds.has(k)) error(`${L}/${category}: artwork for unknown observation ${k}`);
    for (const k of Object.keys(artMap.sections))
      if (!article.sections.some((s) => s.id === k)) error(`${L}/${category}: artwork for unknown section ${k}`);

    // TOC (ClarityReader contentsItems)
    const toc: TocEntry[] = [{ id: "introduction", title: t(TOC_KEYS.introduction), depth: 0 }];
    if (article.audiences.length) toc.push({ id: "audience", title: t(TOC_KEYS.audience), depth: 0 });
    for (const section of article.sections) {
      toc.push({ id: "theme-" + section.id, title: section.title, depth: 0 });
      for (const o of section.observations) toc.push({ id: "observation-" + o.id, title: o.title, depth: 1 });
    }
    if (remainingDirections.length) toc.push({ id: "directions", title: t(TOC_KEYS.directions), depth: 0 });
    if (remainingIdeas.length) toc.push({ id: "ideas", title: t(TOC_KEYS.ideas), depth: 0 });
    if (article.conclusion) toc.push({ id: "conclusion", title: article.conclusion.title, depth: 0 });

    const corpus =
      dossier && (dossier.corpusApps ?? 0) > 0 && (dossier.corpusReviews ?? 0) > 0
        ? { reviews: dossier.corpusReviews as number, apps: dossier.corpusApps as number }
        : null;
    if (!corpus) error(`${L}/${category}: no corpus numbers (hero sentence would be missing)`);

    const cover = researchArt(artMap.cover);
    research[category] = {
      version: 1,
      locale: L,
      category,
      name,
      summary: article.summary,
      corpus,
      lead: ov(article.lead, "research.lead"),
      cover,
      audiencesArt: article.audiences.length && artMap.audiences ? researchArt(artMap.audiences) : null,
      audiences: article.audiences.map((a) => ({ title: a.title, body: ov(a.body, "research.audience") })),
      sections,
      remainingDirections,
      remainingIdeas,
      conclusion: article.conclusion
        ? { title: article.conclusion.title, body: ov(article.conclusion.body, "research.conclusion") }
        : null,
      toc,
      free: category === FREE.category,
    };

    const ideaCount = launchIdeas.filter((i) => i.category === category).length;
    catalogCategories.push({
      slug: category,
      name,
      summary: article.summary,
      cover,
      free: category === FREE.category,
      corpus: corpus ?? { reviews: 0, apps: 0 },
      ideaCount,
    });

    // Search haystack: [name] + ResearchEditorial.Article.searchText
    const n = (s: string) => normalizeForSearch(s, L);
    const body: string[] = [article.lead];
    for (const a of article.audiences) body.push(a.title, a.body);
    for (const s of article.sections) {
      body.push(s.title);
      for (const o of s.observations) body.push(o.title, o.body);
    }
    for (const d of article.directions) body.push(d.title, d.body);
    if (article.conclusion) body.push(article.conclusion.title, article.conclusion.body);
    searchResearch[category] = { name: n(name), summary: n(article.summary), body: body.filter(nonBlank).map(n) };

    signature.push({
      category,
      audiences: article.audiences.map((a) => a.sourceFindingIDs),
      sections: article.sections.map((s) => ({
        id: s.id,
        observations: s.observations.map((o) => ({ id: o.id, sources: o.sourceFindingIDs, refs: o.quoteRefs })),
      })),
      directions: article.directions.map((d) => ({ id: d.id, obs: d.observationID ?? null, ideas: d.ideaSlugs, sources: d.sourceFindingIDs })),
      conclusion: !!article.conclusion,
    });
    stats.categories++;
  }
  if (stats.categories !== EXPECTED.categories) countCheck(`${L}: ${stats.categories} research categories (expected ${EXPECTED.categories})`);
  if (stats.quotes !== EXPECTED.quotes) countCheck(`${L}: ${stats.quotes} visible research quotes (expected ${EXPECTED.quotes}, spec 09 C1)`);

  // --- idea articles ------------------------------------------------------------
  const ideas: Record<string, IdeaFile> = {};
  const ideaSig: unknown[] = [];
  for (const idea of catalogIdeas) {
    const a = lib.ideaArticles?.articles[idea.slug];
    const problems: string[] = [];
    if (!a) problems.push("no article");
    else {
      if (!nonBlank(a.title) || !nonBlank(a.description)) problems.push("empty title/description");
      if (!a.blocks.length) problems.push("no blocks");
      const ids = a.blocks.map((b) => b.id);
      if (new Set(ids).size !== ids.length || ids.some((id) => !nonBlank(id))) problems.push("block ids not unique/non-empty");
      for (const b of a.blocks) {
        if ((b.kind === "paragraph" || b.kind === "heading") && !nonBlank(b.text)) problems.push(`${b.id}: empty text`);
        else if (b.kind === "idea" && (!nonBlank(b.title) || !nonBlank(b.text))) problems.push(`${b.id}: empty idea inset`);
        else if (b.kind === "quote" && (typeof b.quoteIndex !== "number" || !idea.quotes[b.quoteIndex])) problems.push(`${b.id}: quoteIndex does not resolve`);
        else if (!["paragraph", "heading", "idea", "quote"].includes(b.kind)) problems.push(`${b.id}: unknown kind ${b.kind}`);
      }
    }
    if (problems.length || !a) {
      error(`${L}/${idea.slug}: invalid idea article (${problems.join("; ")}); the fallback idea view is not ported`);
      continue;
    }
    const blocks: IdeaBlockView[] = a.blocks.map((b): IdeaBlockView => {
      switch (b.kind) {
        case "paragraph":
          return { id: b.id, kind: "paragraph", text: ov(b.text as string, "idea.paragraph") };
        case "heading":
          return { id: b.id, kind: "heading", text: b.text as string };
        case "idea":
          return { id: b.id, kind: "idea", title: b.title as string, text: ov(b.text as string, "idea.inset") };
        default: {
          const q = idea.quotes[b.quoteIndex as number];
          const d = displayQuote(lib, q.text, null);
          if (!d.own && L !== "en") warn(`${L}/${idea.slug}: idea quote has no ${L} translation; showing the original`);
          stats.ideaQuotes++;
          return { id: b.id, kind: "quote", quote: { text: d.text, rating: q.rating, app: q.app } };
        }
      }
    });
    ideas[idea.slug] = {
      version: 1,
      locale: L,
      slug: idea.slug,
      category: idea.category,
      categoryName: idea.categoryName,
      title: a.title,
      description: a.description,
      cover: ideaArt(idea),
      blocks,
      rank: idea.rank,
      free: FREE.ideas.includes(idea.slug),
    };
    ideaSig.push({ slug: idea.slug, blocks: a.blocks.map((b) => [b.id, b.kind, b.quoteIndex ?? null]) });
  }

  // --- catalog ------------------------------------------------------------------
  const catalog: CatalogFile = {
    version: 1,
    locale: L,
    categories: catalogCategories,
    ideas: catalogIdeas.map((i) => ({
      slug: i.slug,
      category: i.category,
      rank: i.rank,
      free: FREE.ideas.includes(i.slug),
      cover: ideaArt(i),
    })),
  };

  // --- search -------------------------------------------------------------------
  const searchIdeas: SearchFile["ideas"] = {};
  for (const idea of catalogIdeas) {
    const card = cardOf(idea);
    const fields = [card.title, card.description, idea.text.title, idea.text.oneLiner, idea.categoryName];
    // Russian-only audience/buyer: kept for ru, dropped elsewhere (spec 09 §5 #25).
    if (L === "ru") fields.push(lib.context(idea.slug)?.audience ?? studio.ideas[idea.slug]?.buyer ?? "");
    searchIdeas[idea.slug] = uniq(fields.filter(nonBlank).map((f) => normalizeForSearch(f, L)));
  }
  const search: SearchFile = { version: 1, locale: L, research: searchResearch, ideas: searchIdeas };

  // --- onboarding (ClarityWelcomeExamples / ClarityWelcomeContentPreview) --------
  const onboarding: OnboardingFile = { version: 1, locale: L, articles: [], ideas: [] };
  for (const ex of ONBOARDING_ARTICLES) {
    const article = lib.editorial?.categories[ex.category];
    const observation = article?.sections.flatMap((s) => s.observations).find((o) => o.id === ex.observationID);
    if (!article || !observation) {
      error(`${L}: onboarding example ${ex.category}/${ex.observationID} not found`);
      continue;
    }
    const quotes = selectedQuotes(observation, lib.dossiers[ex.category]);
    const quote = quotes[ex.quoteIndex];
    const artMap = categoryArt(ex.category, article, lib.categoryNames[ex.category] ?? ex.category);
    const ref = artMap?.observations[observation.id] ?? artMap?.cover;
    if (!ref) {
      error(`${L}: onboarding example ${ex.category} has no artwork`);
      continue;
    }
    const text = excerpt(observation.body, L, ex.excerptSkip, ex.excerptCount);
    if (!text) error(`${L}: onboarding excerpt for ${ex.category}/${ex.observationID} is empty`);
    const quoteText = quote
      ? excerpt(displayQuote(lib, quote.quote, quote.translation).text, L, ex.quoteSkip, ex.quoteCount)
      : "";
    if (!quote) warn(`${L}: onboarding example ${ex.category} has no quote #${ex.quoteIndex}`);
    onboarding.articles.push({
      category: ex.category,
      observationId: observation.id,
      label: t(ex.label),
      observationTitle: observation.title,
      excerpt: text,
      art: art(`research/${ref.asset}`, ref.asset, ""),
      quote: quote ? { excerpt: quoteText, rating: quote.rating } : null,
    });
  }
  for (const slug of FREE.ideas) {
    const idea = lib.bySlug.get(slug);
    if (!idea) continue;
    const teaser = IDEA_TEASERS[slug];
    const card = cardOf(idea);
    onboarding.ideas.push({
      slug,
      title: teaser ? t(teaser.title) : card.title,
      description: teaser ? t(teaser.description) : card.description,
      cover: ideaArt(idea),
    });
  }

  // --- ui -------------------------------------------------------------------------
  let ui: UIFile;
  if (L === "ru") {
    ui = { version: 1, locale: L, strings: Object.fromEntries(uiKeyUnion.map((k) => [k, k])), plurals: RU_PLURALS };
  } else {
    if (!lib.ui) error(`${L}: no ui pack (the app would fall back to Russian keys)`);
    const resolvedFrom = lib.resolved.ui;
    if (resolvedFrom && resolvedFrom !== `ui.${L}.json`) warn(`${L}: ui strings resolved to ${resolvedFrom}`);
    ui = { version: 1, locale: L, strings: { ...(lib.ui?.strings ?? {}) }, plurals: lib.ui?.plurals ?? {} };
    for (const key of ["отзыв", "приложение"]) if (!ui.plurals[key]) warn(`${L}: ui plurals lack "${key}" (the corpus sentence falls back to Russian forms)`);
    for (const key of ["Мы изучили %1$@ %2$@ о работе %3$@ %4$@.", "Из отзыва пользователя", ...Object.values(TOC_KEYS)])
      if (!(key in ui.strings)) missingUI.add(key);
  }
  if (missingUI.size) warn(`${L}: ${missingUI.size} UI keys missing in the pack: ${[...missingUI].slice(0, 8).join(" | ")}`);

  // --- structure signature of the resulting web content (compared across locales) ---
  const structure = JSON.stringify({
    catalog: catalog.categories.map((c) => [c.slug, c.ideaCount, c.corpus]),
    ideas: catalog.ideas.map((i) => [i.slug, i.rank, i.cover.src]),
    research: Object.values(research).map((r) => ({
      c: r.category,
      toc: r.toc.map((e) => e.id),
      corpus: r.corpus,
      sections: r.sections.map((s) => ({
        id: s.id,
        art: s.art?.src ?? null,
        obs: s.observations.map((o) => ({
          id: o.id,
          passages: o.passages.length,
          quotes: o.quotes.map((q) => [q.app, q.rating]),
          art: o.art?.src ?? null,
          placements: o.placements.map((p) => [p.directionId, p.ideas]),
        })),
      })),
      remaining: [r.remainingDirections.map((p) => p.directionId), r.remainingIdeas],
    })),
    onboarding: onboarding.articles.map((a) => [a.category, a.observationId, a.art.src, a.quote?.rating ?? null]),
  });

  return {
    catalog,
    cards,
    search,
    onboarding,
    ui,
    research,
    ideas,
    stats,
    structure,
    ideaStructure: JSON.stringify(ideaSig),
    researchSignature: JSON.stringify(signature),
  };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const serialize = (data: unknown) => JSON.stringify(data, null, 1) + "\n";

interface PendingFile {
  rel: string;
  content: string;
}

function localeDisplayNames(available: LocaleCode[]): { order: LocaleCode[]; names: Record<LocaleCode, string> } {
  const names = {} as Record<LocaleCode, string>;
  for (const l of available) {
    if (l === "ru") names[l] = "Русский";
    else if (l === "en") names[l] = "English";
    else {
      const raw = new Intl.DisplayNames([l], { type: "language" }).of(l) ?? l;
      names[l] = raw.charAt(0).toLocaleUpperCase(l) + raw.slice(1);
    }
  }
  const lead = (["ru", "en"] as LocaleCode[]).filter((l) => available.includes(l));
  const rest = available.filter((l) => !lead.includes(l)).sort((a, b) => (names[a] < names[b] ? -1 : names[a] > names[b] ? 1 : 0));
  const order = [...lead, ...rest];
  return { order, names: Object.fromEntries(order.map((l) => [l, names[l]])) as Record<LocaleCode, string> };
}

function routingManifestSource(launch: string[], ideaIds: string[], free: { category: string; ideas: string[] }): string {
  return `// GENERATED by scripts/v2/import-app-content.ts — do not edit by hand.
// Routing manifest for the new site: which public URLs have a new-site equivalent.
// Kept tiny and dependency-free because src/proxy.ts imports it.

/** The app's launch edition, in catalogue order (Inapp/Content/LaunchEdition.swift). */
export const LAUNCH_CATEGORIES = [
${launch.map((c) => `  ${JSON.stringify(c)}`).join(",\n")}
] as const;

/** All ${ideaIds.length} app ideas (ids like "habit-tracking-1"). */
export const LAUNCH_IDEAS: readonly string[] = [${ideaIds.map((i) => JSON.stringify(i)).join(", ")}];

export const FREE_CATEGORY = ${JSON.stringify(free.category)};
export const FREE_IDEAS: readonly string[] = [${free.ideas.map((i) => JSON.stringify(i)).join(", ")}];

const categorySet: ReadonlySet<string> = new Set(LAUNCH_CATEGORIES);
const ideaSet: ReadonlySet<string> = new Set(LAUNCH_IDEAS);
export const isLaunchCategory = (slug: string) => categorySet.has(slug);
export const isLaunchIdea = (id: string) => ideaSet.has(id);
`;
}

function gitCommit(): string | undefined {
  if (process.env.APP_GIT_COMMIT) return process.env.APP_GIT_COMMIT;
  try {
    const commit = execFileSync("git", ["-C", RES, "rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    const dirty = execFileSync("git", ["-C", RES, "status", "--porcelain", "--", "."], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
    return dirty ? `${commit}+dirty` : commit;
  } catch {
    return undefined;
  }
}

function kb(n: number) {
  return `${(n / 1024).toFixed(1)} KB`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  if (!fs.existsSync(RES)) fatal(`APP_RESOURCES not found: ${RES}`);
  console.log(`inApp content import\n  resources: ${RES}\n  output:    ${path.relative(REPO, OUT)}${CHECK_ONLY ? " (check only)" : ""}`);

  // Source hashes: every JSON pack + the font (images are hashed per used image).
  const sourceSha: Record<string, string> = {};
  for (const f of fs.readdirSync(RES).filter((f) => f.endsWith(".json")).sort())
    sourceSha[f] = sha256(fs.readFileSync(resPath(f)));
  for (const f of ["Fonts/Onest.ttf"]) if (resExists(f)) sourceSha[f] = sha256(fs.readFileSync(resPath(f)));

  LAUNCH = parseLaunch();
  LAUNCH_SET = new Set(LAUNCH);
  if (LAUNCH_SET.size !== LAUNCH.length) error("LaunchEdition has duplicate categories");
  if (LAUNCH.length !== EXPECTED.categories) countCheck(`LaunchEdition has ${LAUNCH.length} categories (expected ${EXPECTED.categories})`);
  FREE = parseFree();
  if (!LAUNCH_SET.has(FREE.category)) error(`free category ${FREE.category} is not in the launch edition`);
  const corpus = parseCorpus();
  driftChecks();
  for (const [rel, text] of Object.entries(swiftSources)) sourceSha[`../${rel}`] = sha256(text);

  const locales = readJson<SrcLocales>("locales.json");
  const available = locales.available.filter((l): l is LocaleCode => (LOCALES as string[]).includes(l));
  const unknown = locales.available.filter((l) => !(LOCALES as string[]).includes(l));
  if (unknown.length) error(`locales.json lists locales the web does not support yet: ${unknown.join(", ")}`);
  for (const l of LOCALES) if (!locales.available.includes(l)) error(`locales.json no longer lists ${l}`);
  if (locales.default !== "en") warn(`locales.json default is ${locales.default}`);
  const { order, names } = localeDisplayNames(available);

  loadOverrides();
  const facts = readJson<SrcFacts>("facts.json");
  const studio = prepared(readJson<SrcStudio>("studio.json"), "studio") as SrcStudio;
  if (!isStr(studio.builtAt)) error("studio.json has no builtAt");
  launchArtwork = readJson<Record<string, SrcLaunchArtEntry>>("launch-research-artwork.json");

  const libs = new Map<LocaleCode, LocaleData>();
  for (const L of order) libs.set(L, loadLocale(L, facts));

  // UI key union (ru identity pack) + keyset parity
  const keysets = order.filter((l) => l !== "ru").map((l) => [l, Object.keys(libs.get(l)?.ui?.strings ?? {})] as const);
  uiKeyUnion = [...new Set(keysets.flatMap(([, k]) => k))].sort();
  for (const [l, keys] of keysets)
    if (keys.length !== uiKeyUnion.length) warn(`ui.${l}.json has ${keys.length} keys, the union has ${uiKeyUnion.length}`);

  const outputs = new Map<LocaleCode, LocaleOutput>();
  for (const L of order) outputs.set(L, buildLocale(libs.get(L) as LocaleData, studio));

  // Cross-locale structure checks
  const ref = outputs.get("en") ?? outputs.get(order[0]);
  for (const [L, o] of outputs) {
    if (!ref || o === ref) continue;
    if (o.researchSignature !== ref.researchSignature) error(`${L}: research-editorial structure (ids/refs/slugs) differs from en`);
    if (o.ideaStructure !== ref.ideaStructure) error(`${L}: idea-articles structure (block ids/kinds/quoteIndex) differs from en`);
    if (o.structure !== ref.structure) error(`${L}: assembled content structure differs from en`);
  }

  // Locale-independent art
  const welcomeArt: Record<string, Art> = {};
  for (const asset of WELCOME_ASSETS) welcomeArt[asset] = art(`welcome/${asset}`, asset, "");

  // App icon
  const iconContents = readJson<{ images?: { filename?: string }[] }>("Assets.xcassets/AppIcon.appiconset/Contents.json");
  const iconFile = iconContents.images?.find((i) => i.filename)?.filename;
  const appIcon: Record<string, string> = {};
  if (!iconFile || !resExists(`Assets.xcassets/AppIcon.appiconset/${iconFile}`)) error("AppIcon.appiconset has no image");
  else {
    const rel = `Assets.xcassets/AppIcon.appiconset/${iconFile}`;
    const buf = fs.readFileSync(resPath(rel));
    const size = imageSize(buf) ?? { width: 0, height: 0 };
    const widths = [180, 512].filter((w) => w <= size.width);
    usedImages.set("app-icon", { out: "app-icon", asset: "AppIcon", file: rel, kind: "icon", widths, width: size.width, height: size.height, sha256: sha256(buf) });
    for (const w of widths) appIcon[String(w)] = `/media/app-icon-${w}.png`;
  }

  // Leak checks: public files must not contain paid idea text.
  for (const [L, o] of outputs) {
    const catalogJson = JSON.stringify(o.catalog);
    const onboardingJson = JSON.stringify(o.onboarding);
    for (const [slug, card] of Object.entries(o.cards.ideas)) {
      const texts = [card.title, card.description, o.ideas[slug]?.title, o.ideas[slug]?.description].filter(
        (s): s is string => !!s && s.length >= 12,
      );
      for (const s of texts) {
        const needle = JSON.stringify(s).slice(1, -1);
        if (catalogJson.includes(needle)) error(`${L}: catalog.json leaks idea text of ${slug}`);
        if (!FREE.ideas.includes(slug) && onboardingJson.includes(needle)) error(`${L}: onboarding.json leaks paid idea text of ${slug}`);
      }
    }
  }

  // --- report diagnostics ------------------------------------------------------
  const hitSummary = Object.entries(overrideHits).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  console.log(`  overrides: ${overrides.size} accepted, ${overridesRejected} rejected; hits: ${hitSummary}`);
  const renderHits = Object.entries(overrideHits).filter(([k]) => k.startsWith("research.") || k.startsWith("idea."));
  if (renderHits.length)
    warn(`render-time overrides hit research/idea text (${renderHits.map(([k, v]) => `${k} ${v}`).join(", ")}); the export document uses the raw text`);
  if (warnings.length) {
    const grouped = new Map<string, number>();
    for (const w of warnings) grouped.set(w, (grouped.get(w) ?? 0) + 1);
    console.log(`\n⚠ ${warnings.length} warning(s):`);
    for (const [w, n] of grouped) console.log(`  - ${w}${n > 1 ? ` (×${n})` : ""}`);
  }
  if (errors.length) {
    console.error(`\n✖ validation failed with ${errors.length} error(s):`);
    for (const e of errors.slice(0, 200)) console.error(`  - ${e}`);
    if (errors.length > 200) console.error(`  … and ${errors.length - 200} more`);
    process.exit(1);
  }
  console.log("\n✔ validation passed");

  // --- assemble files -----------------------------------------------------------
  const pending: PendingFile[] = [];
  for (const [L, o] of outputs) {
    pending.push({ rel: `${L}/catalog.json`, content: serialize(o.catalog) });
    pending.push({ rel: `${L}/cards.json`, content: serialize(o.cards) });
    pending.push({ rel: `${L}/search.json`, content: serialize(o.search) });
    pending.push({ rel: `${L}/onboarding.json`, content: serialize(o.onboarding) });
    pending.push({ rel: `${L}/ui.json`, content: serialize(o.ui) });
    for (const [slug, r] of Object.entries(o.research)) pending.push({ rel: `${L}/research/${slug}.json`, content: serialize(r) });
    for (const [slug, i] of Object.entries(o.ideas)) pending.push({ rel: `${L}/ideas/${slug}.json`, content: serialize(i) });
  }
  const used = [...usedImages.values()].sort((a, b) => (a.out < b.out ? -1 : a.out > b.out ? 1 : 0));
  pending.push({ rel: "_build/used-images.json", content: serialize(used) });

  const contentHash = sha256(
    [...pending]
      .sort((a, b) => (a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0))
      .map((p) => `${p.rel}\n${sha256(p.content)}`)
      .join("\n"),
  );
  let contentBuiltAt = new Date().toISOString();
  const previousManifestPath = path.join(OUT, "manifest.json");
  if (fs.existsSync(previousManifestPath)) {
    try {
      const prev = JSON.parse(fs.readFileSync(previousManifestPath, "utf8")) as Partial<Manifest>;
      if (prev.contentHash === contentHash && prev.contentBuiltAt) contentBuiltAt = prev.contentBuiltAt;
    } catch {
      /* rebuild */
    }
  }

  const ideaIds = LAUNCH.flatMap((c) =>
    (libs.get("en") ?? libs.get(order[0]))!
      .ideas.filter((i) => i.category === c)
      .map((i) => i.slug)
      .sort((a, b) => Number(a.slice(c.length + 1)) - Number(b.slice(c.length + 1))),
  );
  const commit = gitCommit();
  if (!commit) warn("app repo git commit unknown (Resources is not in a git checkout; set APP_GIT_COMMIT to record it)");

  const manifest: Manifest = {
    version: 1,
    contentBuiltAt,
    collectionDate: studio.builtAt,
    source: {
      path: RES,
      ...(commit ? { gitCommit: commit } : {}),
      sha256: sourceSha,
      resolved: Object.fromEntries(order.map((L) => [L, libs.get(L)!.resolved])) as Manifest["source"]["resolved"],
    },
    locales: order,
    localeNames: names,
    defaultLocale: (available.includes(locales.default as LocaleCode) ? locales.default : "en") as LocaleCode,
    launch: LAUNCH,
    ideas: ideaIds,
    free: FREE,
    corpus,
    art: welcomeArt,
    appIcon,
    stats: Object.fromEntries(order.map((L) => [L, outputs.get(L)!.stats])) as Manifest["stats"],
    contentHash,
  };
  pending.push({ rel: "manifest.json", content: serialize(manifest) });

  // --- payload report -------------------------------------------------------------
  console.log("\nPayload per locale (pretty on disk / minified / minified+gzip):");
  for (const L of order) {
    const files = pending.filter((p) => p.rel.startsWith(`${L}/`));
    const size = (pred: (p: PendingFile) => boolean) => {
      let disk = 0;
      let min = 0;
      let gz = 0;
      for (const p of files.filter(pred)) {
        const m = JSON.stringify(JSON.parse(p.content));
        disk += Buffer.byteLength(p.content);
        min += Buffer.byteLength(m);
        gz += gzipSync(m).length;
      }
      return { disk, min, gz };
    };
    const all = size(() => true);
    const research = files.filter((p) => p.rel.includes("/research/")).map((p) => Buffer.byteLength(JSON.stringify(JSON.parse(p.content))));
    const ideaSizes = files.filter((p) => p.rel.includes("/ideas/")).map((p) => Buffer.byteLength(JSON.stringify(JSON.parse(p.content))));
    const one = (name: string) => size((p) => p.rel === `${L}/${name}`).min;
    const s = outputs.get(L)!.stats;
    console.log(
      `  ${L}: ${kb(all.disk)} / ${kb(all.min)} / ${kb(all.gz)} gz — catalog ${kb(one("catalog.json"))}, cards ${kb(one("cards.json"))}, search ${kb(one("search.json"))}, ui ${kb(one("ui.json"))}, onboarding ${kb(one("onboarding.json"))}; research max ${kb(Math.max(...research))} avg ${kb(research.reduce((a, b) => a + b, 0) / research.length)}; ideas max ${kb(Math.max(...ideaSizes))} avg ${kb(ideaSizes.reduce((a, b) => a + b, 0) / ideaSizes.length)}`,
    );
    console.log(
      `      ${s.categories} categories, ${s.ideas} ideas, ${s.sections} sections, ${s.observations} observations, ${s.directions} directions → ${s.placements} placements, ${s.quotes} research quotes (${s.quotesWithoutOwnTranslation} without own translation), ${s.ideaQuotes} idea quotes`,
    );
  }
  const photo = used.filter((u) => u.kind !== "icon");
  console.log(`\nImages referenced: ${photo.length} (${photo.filter((u) => u.out.startsWith("ideas/")).length} ideas, ${photo.filter((u) => u.out.startsWith("research/")).length} research, ${photo.filter((u) => u.out.startsWith("welcome/")).length} welcome) + app icon`);

  if (CHECK_ONLY) {
    console.log("\n--check: nothing written.");
    return;
  }

  // --- write (only changed files) + remove stale ------------------------------------
  let written = 0;
  let unchanged = 0;
  const expected = new Set(pending.map((p) => p.rel));
  for (const p of pending) {
    const file = path.join(OUT, p.rel);
    if (fs.existsSync(file) && fs.readFileSync(file, "utf8") === p.content) {
      unchanged++;
      continue;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, p.content);
    written++;
  }
  let removed = 0;
  for (const L of LOCALES) {
    for (const sub of ["research", "ideas"]) {
      const dir = path.join(OUT, L, sub);
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        const rel = `${L}/${sub}/${f}`;
        if (!expected.has(rel)) {
          fs.rmSync(path.join(dir, f));
          removed++;
        }
      }
    }
  }
  const routing = routingManifestSource(LAUNCH, ideaIds, FREE);
  const routingChanged = !fs.existsSync(ROUTING_MANIFEST) || fs.readFileSync(ROUTING_MANIFEST, "utf8") !== routing;
  if (routingChanged) fs.writeFileSync(ROUTING_MANIFEST, routing);
  console.log(
    `\nWrote ${written} file(s), ${unchanged} unchanged, ${removed} stale removed; ${path.relative(REPO, ROUTING_MANIFEST)} ${routingChanged ? "updated" : "unchanged"}.`,
  );
  console.log("Next: node scripts/v2/export-images.mjs");
}

main();
