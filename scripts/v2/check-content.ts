/**
 * Validate the generated content in content/v2 and public/media WITHOUT the app
 * sources (CI-friendly; spec 09 §5 #27: "CI re-runs only the validator").
 *
 *   npx tsx scripts/v2/check-content.ts
 *
 * Checks: every file exists; counts match the manifest; the routing manifest
 * (src/site/manifest.generated.ts) matches; every Art has its WebP widths in
 * public/media; public files carry no paid idea text; structure is identical
 * across locales; content was not hand-edited (contentHash); «Пульс» data
 * (pulse-demand.json, optional) passes the shared validator and, in CI, is not a development
 * build (source.unverifiedIncluded; PULSE_ALLOW_UNVERIFIED=1 overrides).
 *
 * Rating (content/v2/<L>/rating/**, written by `import-app-content.ts --only=rating`): the
 * files the rating pages read exist and agree with each other (index ↔ niche files ↔ de/fr/ja
 * overlays, ru ↔ en numbers and media), media paths, SEO texts and the catalogue groups (spec 11
 * §8.5). They are outside manifest.contentHash: that step never writes the manifest.
 */

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import { FREE_CATEGORY, FREE_IDEAS, LAUNCH_CATEGORIES, LAUNCH_IDEAS } from "../../src/site/manifest.generated";
import type { PulseDemand } from "../../src/site/features/pulse/types";
import { validatePulseDemand } from "../../src/site/features/pulse/validate";
import type {
  Art,
  CardsFile,
  CatalogFile,
  IdeaFile,
  LocaleCode,
  Manifest,
  OnboardingFile,
  ResearchFile,
  SearchFile,
  UIFile,
  UsedImage,
} from "../../src/site/content/types";
import type { RatingIndexFile, RatingNicheFile, RatingOverlayFile } from "../../src/site/content/rating-types";
import { RATING_GROUPS, ratingGroupMembers } from "../../src/site/features/rating/groups";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT = path.join(REPO, "content/v2");
const MEDIA = path.join(REPO, "public/media");

const errors: string[] = [];
const warnings: string[] = [];
const error = (m: string) => errors.push(m);

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const rawFiles = new Map<string, string>();

function read<T>(rel: string, { hashed = true } = {}): T | null {
  const file = path.join(CONTENT, rel);
  if (!fs.existsSync(file)) {
    error(`missing content/v2/${rel}`);
    return null;
  }
  const raw = fs.readFileSync(file, "utf8");
  if (hashed) rawFiles.set(rel, raw);
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    error(`content/v2/${rel} is not valid JSON: ${(e as Error).message}`);
    return null;
  }
}

const mediaChecked = new Set<string>();
let ratingFilesChecked = 0;
function checkArt(where: string, art: Art | null | undefined, required = true) {
  if (!art) {
    if (required) error(`${where}: missing art`);
    return;
  }
  if (!art.src || !Array.isArray(art.widths) || art.widths.length === 0) {
    error(`${where}: invalid art ${JSON.stringify(art)}`);
    return;
  }
  if (typeof art.alt !== "string") error(`${where}: art without alt`);
  for (const w of art.widths) {
    const rel = `${art.src}-${w}.webp`;
    if (mediaChecked.has(rel)) continue;
    mediaChecked.add(rel);
    if (!fs.existsSync(path.join(MEDIA, rel))) error(`${where}: public/media/${rel} missing (run node scripts/v2/export-images.mjs)`);
  }
}

function main() {
  const manifest = read<Manifest>("manifest.json");
  if (!manifest) return finish();

  // Routing manifest parity
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((x, i) => x === b[i]);
  if (!same(LAUNCH_CATEGORIES, manifest.launch)) error("src/site/manifest.generated.ts LAUNCH_CATEGORIES differs from content/v2/manifest.json");
  if (!same([...LAUNCH_IDEAS], manifest.ideas)) error("src/site/manifest.generated.ts LAUNCH_IDEAS differs from content/v2/manifest.json");
  if (FREE_CATEGORY !== manifest.free.category || !same([...FREE_IDEAS], manifest.free.ideas))
    error("src/site/manifest.generated.ts FREE_* differs from content/v2/manifest.json");

  for (const [name, a] of Object.entries(manifest.art)) checkArt(`manifest.art.${name}`, a);
  for (const src of Object.values(manifest.appIcon))
    if (!fs.existsSync(path.join(REPO, "public", src))) error(`app icon ${src} missing`);

  const ideaSet = new Set(manifest.ideas);
  const structures = new Map<LocaleCode, string>();

  for (const L of manifest.locales) {
    const catalog = read<CatalogFile>(`${L}/catalog.json`);
    const cards = read<CardsFile>(`${L}/cards.json`);
    const search = read<SearchFile>(`${L}/search.json`);
    const onboarding = read<OnboardingFile>(`${L}/onboarding.json`);
    const ui = read<UIFile>(`${L}/ui.json`);
    if (!catalog || !cards || !search || !onboarding || !ui) continue;
    for (const f of [catalog, cards, search, onboarding, ui]) if (f.locale !== L || f.version !== 1) error(`${L}: file with locale ${f.locale} / version ${f.version}`);

    // Catalog
    if (!same(catalog.categories.map((c) => c.slug), manifest.launch)) error(`${L}: catalog categories differ from manifest.launch`);
    if (catalog.ideas.length !== manifest.ideas.length || catalog.ideas.some((i) => !ideaSet.has(i.slug)))
      error(`${L}: catalog ideas differ from manifest.ideas`);
    for (let n = 1; n < catalog.ideas.length; n++) {
      const a = catalog.ideas[n - 1];
      const b = catalog.ideas[n];
      if (a.rank > b.rank || (a.rank === b.rank && a.slug > b.slug)) error(`${L}: catalog ideas not sorted by (rank, slug) at ${b.slug}`);
    }
    for (const c of catalog.categories) {
      checkArt(`${L}/catalog ${c.slug}`, c.cover);
      if (!c.name || !c.summary) error(`${L}/catalog ${c.slug}: empty name/summary`);
      if (c.free !== (c.slug === manifest.free.category)) error(`${L}/catalog ${c.slug}: wrong free flag`);
    }
    for (const i of catalog.ideas) {
      const keys = Object.keys(i).sort().join(",");
      if (keys !== "category,cover,free,rank,slug") error(`${L}/catalog idea ${i.slug}: unexpected fields ${keys} (catalog must stay public-safe)`);
      if (i.free !== manifest.free.ideas.includes(i.slug)) error(`${L}/catalog idea ${i.slug}: wrong free flag`);
      checkArt(`${L}/catalog idea ${i.slug}`, i.cover);
    }

    // Cards and search
    if (!same(Object.keys(cards.ideas).sort(), [...manifest.ideas].sort())) error(`${L}: cards.json keys differ from manifest.ideas`);
    for (const [slug, c] of Object.entries(cards.ideas)) if (!c.title || !c.description) error(`${L}/cards ${slug}: empty title/description`);
    if (!same(Object.keys(search.research), manifest.launch)) error(`${L}: search.research keys differ from manifest.launch`);
    if (!same(Object.keys(search.ideas).sort(), [...manifest.ideas].sort())) error(`${L}: search.ideas keys differ from manifest.ideas`);

    // Leak checks on public files
    const publicJson = JSON.stringify(catalog);
    const onboardingJson = JSON.stringify(onboarding);
    for (const [slug, c] of Object.entries(cards.ideas)) {
      for (const text of [c.title, c.description].filter((s) => s.length >= 12)) {
        const needle = JSON.stringify(text).slice(1, -1);
        if (publicJson.includes(needle)) error(`${L}: catalog.json contains card text of ${slug}`);
        if (!manifest.free.ideas.includes(slug) && onboardingJson.includes(needle)) error(`${L}: onboarding.json contains paid card text of ${slug}`);
      }
    }

    // Onboarding
    if (onboarding.articles.length !== 5) error(`${L}: onboarding has ${onboarding.articles.length} article examples`);
    if (!same(onboarding.ideas.map((i) => i.slug), manifest.free.ideas)) error(`${L}: onboarding ideas are not the free ideas`);
    for (const a of onboarding.articles) {
      checkArt(`${L}/onboarding ${a.category}`, a.art);
      if (!a.excerpt || !a.observationTitle || !a.label) error(`${L}/onboarding ${a.category}: empty text`);
    }
    for (const i of onboarding.ideas) checkArt(`${L}/onboarding idea ${i.slug}`, i.cover);

    // UI
    if (Object.keys(ui.strings).length < 100) error(`${L}: ui.json has only ${Object.keys(ui.strings).length} strings`);
    if (!ui.plurals["отзыв"] || !ui.plurals["приложение"]) error(`${L}: ui.json lacks the corpus-sentence plurals`);

    // Research
    const sig: unknown[] = [];
    let quotes = 0;
    for (const slug of manifest.launch) {
      const r = read<ResearchFile>(`${L}/research/${slug}.json`);
      if (!r) continue;
      if (r.category !== slug || r.locale !== L) error(`${L}/research/${slug}: wrong category/locale`);
      checkArt(`${L}/research/${slug} cover`, r.cover);
      checkArt(`${L}/research/${slug} audiences`, r.audiencesArt, false);
      const seenIdeas = new Set<string>();
      const placements = [
        ...r.sections.flatMap((s) => s.observations.flatMap((o) => o.placements)),
        ...r.remainingDirections,
      ];
      for (const p of placements)
        for (const id of p.ideas) {
          if (!ideaSet.has(id)) error(`${L}/research/${slug}: placement ${p.directionId} references unknown idea ${id}`);
          if (seenIdeas.has(id)) error(`${L}/research/${slug}: idea ${id} placed twice`);
          seenIdeas.add(id);
        }
      for (const s of r.sections) {
        checkArt(`${L}/research/${slug} section ${s.id}`, s.art, false);
        for (const o of s.observations) {
          checkArt(`${L}/research/${slug} observation ${o.id}`, o.art, false);
          if (o.passages.length === 0) error(`${L}/research/${slug}/${o.id}: no passages`);
          for (const q of o.quotes) if (!q.text || !(q.rating >= 1 && q.rating <= 5)) error(`${L}/research/${slug}/${o.id}: bad quote`);
          quotes += o.quotes.length;
        }
      }
      const tocIds = r.toc.map((e) => e.id);
      if (new Set(tocIds).size !== tocIds.length) error(`${L}/research/${slug}: duplicate TOC ids`);
      sig.push([
        slug,
        tocIds,
        r.corpus,
        r.sections.map((s) => [s.id, s.art?.src ?? null, s.observations.map((o) => [o.id, o.passages.length, o.quotes.length, o.art?.src ?? null, o.placements.map((p) => [p.directionId, p.ideas])])]),
      ]);
    }
    if (quotes !== manifest.stats[L]?.quotes) error(`${L}: ${quotes} research quotes, manifest.stats says ${manifest.stats[L]?.quotes}`);

    // Ideas
    for (const id of manifest.ideas) {
      const i = read<IdeaFile>(`${L}/ideas/${id}.json`);
      if (!i) continue;
      if (i.slug !== id || i.locale !== L) error(`${L}/ideas/${id}: wrong slug/locale`);
      if (!i.title || !i.description || i.blocks.length === 0) error(`${L}/ideas/${id}: empty article`);
      if (i.free !== manifest.free.ideas.includes(id)) error(`${L}/ideas/${id}: wrong free flag`);
      checkArt(`${L}/ideas/${id}`, i.cover);
      sig.push([id, i.blocks.map((b) => [b.id, b.kind])]);
    }
    structures.set(L, JSON.stringify(sig));
  }

  const first = structures.get("en") ?? [...structures.values()][0];
  for (const [L, s] of structures) if (s !== first) error(`${L}: content structure differs from en`);

  // used-images vs media folder
  const used = read<UsedImage[]>("_build/used-images.json") ?? [];
  const expected = new Set<string>();
  for (const u of used) for (const w of u.widths) expected.add(u.kind === "icon" ? `${u.out}-${w}.png` : `${u.out}-${w}.webp`);
  for (const rel of mediaChecked) if (!expected.has(rel)) error(`public/media/${rel} is referenced but not in used-images.json`);
  for (const dir of ["ideas", "research", "welcome"]) {
    const abs = path.join(MEDIA, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (!expected.has(`${dir}/${f}`)) warnings.push(`orphan media file public/media/${dir}/${f}`);
  }

  checkPulse();

  // Hand-edit detection
  const hashed = [...rawFiles.entries()]
    .filter(([rel]) => rel !== "manifest.json")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const expectedFiles = hashed.length;
  const contentHash = sha256(hashed.map(([rel, raw]) => `${rel}\n${sha256(raw)}`).join("\n"));
  if (errors.length === 0 && contentHash !== manifest.contentHash)
    warnings.push(`contentHash mismatch over ${expectedFiles} files — content/v2 was edited by hand or files are missing; re-run the importer`);

  checkRating();
  finish();
}

/**
 * The rating content (src/site/content/rating.ts reads it at runtime; types in rating-types.ts).
 * ru and en hold the texts, de/fr/ja only an overlay over en. Structural checks only: the
 * importer (scripts/v2/import-rating.ts) validates the texts against the app sources.
 */
function checkRating() {
  const CYRILLIC = /\p{Script=Cyrillic}/u;
  // Spec 11 §8.2, §8.5 (the importer applies the same rules).
  const MZ_PATH = /^[A-Za-z0-9][A-Za-z0-9._@/-]*\.(?:png|jpe?g)$/i;
  const TRUST_WORDING = /накрут|накручен|скам|фейк|juic|fake|scam|inflat/i;
  const DAY = /^\d{4}-\d{2}-\d{2}$/;
  const usable = ratingUsable();
  const byLocale = new Map<"ru" | "en", Map<string, RatingNicheFile>>();
  for (const dl of ["ru", "en"] as const) {
    const index = read<RatingIndexFile>(`${dl}/rating/index.json`, { hashed: false });
    if (!index) continue;
    if (index.version !== 1 || index.locale !== dl) error(`${dl}/rating/index.json: locale ${index.locale} / version ${index.version}`);
    const slugs = index.niches.map((n) => n.slug);
    if (new Set(slugs).size !== slugs.length) error(`${dl}/rating/index.json: duplicate niche slugs`);
    const files = new Map<string, RatingNicheFile>();
    const totals = { apps: 0, scenarios: 0, readableScenarios: 0, appsWithQuotes: 0, quotes: 0, appsWithIcon: 0, appsWithShots: 0, shots: 0 };
    let newest = "";
    for (const entry of index.niches) {
      const where = `${dl}/rating/${entry.slug}`;
      const f = read<RatingNicheFile>(`${where}.json`, { hashed: false });
      if (!f) continue;
      if (f.version !== 1 || f.locale !== dl || f.category !== entry.slug) error(`${where}: wrong version/locale/category`);
      if (!f.name || f.name !== entry.name || f.nameLang !== entry.nameLang || f.count !== entry.count) error(`${where}: differs from its index entry`);
      if (f.totalReviews !== entry.totalReviews || f.intro !== entry.intro || f.updatedAt !== entry.updatedAt)
        error(`${where}: totalReviews / intro / updatedAt differ from its index entry`);
      // The catalogue card reads the leaders from the index: they are the file's first 4 apps.
      const leaders = f.apps.slice(0, 4).map((a) => ({ id: a.id, title: a.title, short: a.short, icon: a.icon, realScore: a.realScore }));
      if (JSON.stringify(entry.leaders) !== JSON.stringify(leaders)) error(`${where}: index leaders are not the file's first 4 apps`);
      if (dl === "en" && CYRILLIC.test(f.name)) error(`${where}: Cyrillic in the English niche name`);
      // SEO head term and intro (spec 11 §6.2, §6.3).
      if (typeof f.seoName !== "string" || !f.seoName.trim() || f.seoName.length > 40) error(`${where}: seoName must be 1–40 characters`);
      else if (dl === "en" && (/\bapps?$/i.test(f.seoName) || CYRILLIC.test(f.seoName))) error(`${where}: seoName «${f.seoName}» ends in app(s) or is not English`);
      if (f.intro === null) {
        if (usable.has(entry.slug)) error(`${where}: no intro (only a niche without a rating page may lack one)`);
      } else if (typeof f.intro !== "string" || f.intro.length > 180 || TRUST_WORDING.test(f.intro) || (dl === "en" && CYRILLIC.test(f.intro)))
        error(`${where}: intro over 180 characters, with trust wording or in the wrong language`);
      if (typeof f.updatedAt !== "string" || !DAY.test(f.updatedAt)) error(`${where}: updatedAt ${f.updatedAt} is not YYYY-MM-DD`);
      else if (f.updatedAt > newest) newest = f.updatedAt;
      const ids = new Set<string>();
      f.apps.forEach((a, i) => {
        // The rank is the raw index + 1 (spec 11 D3): the raw order is realScore descending.
        const prev = f.apps[i - 1];
        if (prev && (a.realScore ?? -1) > (prev.realScore ?? -1)) error(`${where}/${a.id}: apps are not sorted by realScore descending`);
      });
      for (const a of f.apps) {
        // The URL slug index depends on unique ids in the raw order (sitedata/rating.ts).
        if (!/^\d+$/.test(a.id) || ids.has(a.id)) error(`${where}: bad or duplicate app id ${a.id}`);
        ids.add(a.id);
        if (!a.title) error(`${where}/${a.id}: empty title`);
        if (typeof a.short !== "string" || !a.short.trim() || a.short.length > a.title.length) error(`${where}/${a.id}: bad short name «${a.short}»`);
        if (a.icon !== null && (typeof a.icon !== "string" || !MZ_PATH.test(a.icon))) error(`${where}/${a.id}: bad icon path ${a.icon}`);
        if (!Array.isArray(a.shots) || a.shots.length > 10 || new Set(a.shots).size !== a.shots.length || a.shots.some((p) => typeof p !== "string" || !MZ_PATH.test(p)))
          error(`${where}/${a.id}: shots must be ≤ 10 unique compact paths`);
        if (a.reviewsRead !== null && !(Number.isInteger(a.reviewsRead) && a.reviewsRead >= 1 && a.reviewsRead <= 2000))
          error(`${where}/${a.id}: reviewsRead ${a.reviewsRead} is not an integer 1–2000`);
        if (a.icon) totals.appsWithIcon++;
        if (a.shots?.length) totals.appsWithShots++;
        totals.shots += a.shots?.length ?? 0;
        // Titles keep the store's Cyrillic look-alike letters; the texts must be English.
        if (dl === "en") for (const k of ["verdict", "loved", "weak", "whoFor"] as const) if (a[k] && CYRILLIC.test(a[k])) error(`${where}/${a.id}: Cyrillic in ${k}`);
        for (const q of a.quotes) if (!q.text || !q.lang) error(`${where}/${a.id}: bad quote`);
        if (a.quotes.length) totals.appsWithQuotes++;
        totals.quotes += a.quotes.length;
      }
      totals.apps += f.apps.length;
      f.scenarios.forEach((s, i) => {
        // /rating/<niche>/tasks/<n> is the 1-based index into the full list.
        if (s.n !== i + 1) error(`${where}: scenario ${i + 1} has n=${s.n}`);
        for (const id of s.appIds) if (!ids.has(id)) error(`${where}: scenario ${s.n} references unknown app ${id}`);
        if (dl === "en") for (const k of ["name", "job", "gap"] as const) if (s[k] && CYRILLIC.test(s[k])) error(`${where}: Cyrillic in scenario ${s.n} ${k}`);
        if (s.job) totals.readableScenarios++;
      });
      totals.scenarios += f.scenarios.length;
      files.set(entry.slug, f);
      ratingFilesChecked++;
    }
    const stats = { niches: index.niches.length, ...totals };
    for (const [k, v] of Object.entries(stats))
      if (index.stats[k as keyof typeof stats] !== v) error(`${dl}/rating/index.json: stats.${k} = ${index.stats[k as keyof typeof stats]}, files say ${v}`);
    if (index.generatedAt !== newest) error(`${dl}/rating/index.json: generatedAt ${index.generatedAt} is not the newest niche updatedAt ${newest}`);
    const dir = path.join(CONTENT, dl, "rating");
    for (const name of fs.readdirSync(dir))
      if (name !== "index.json" && !files.has(name.replace(/\.json$/, ""))) warnings.push(`stale file content/v2/${dl}/rating/${name} (not in index.json)`);
    byLocale.set(dl, files);
  }

  // ru and en share the numbers, the raw app order (URL slugs) and the niche set.
  const ru = byLocale.get("ru");
  const en = byLocale.get("en");
  if (ru && en) {
    if ([...ru.keys()].sort().join() !== [...en.keys()].sort().join()) error("rating: ru and en list different niches");
    for (const [slug, r] of ru) {
      const e = en.get(slug);
      if (!e) continue;
      if (r.count !== e.count || r.totalReviews !== e.totalReviews) error(`rating/${slug}: ru and en counts differ`);
      if (r.apps.map((a) => a.id).join() !== e.apps.map((a) => a.id).join()) error(`rating/${slug}: ru and en app order differs`);
      r.apps.forEach((a, i) => {
        const b = e.apps[i];
        if (b && (a.realScore !== b.realScore || a.storeAvg !== b.storeAvg || a.ratings !== b.ratings)) error(`rating/${slug}/${a.id}: ru and en numbers differ`);
        if (b && (a.short !== b.short || a.icon !== b.icon || a.reviewsRead !== b.reviewsRead || JSON.stringify(a.shots) !== JSON.stringify(b.shots)))
          error(`rating/${slug}/${a.id}: ru and en short name / media / reviewsRead differ`);
      });
    }
  }

  // Catalogue groups (features/rating/groups.ts): every niche with a rating page exactly once.
  const grouped = new Map<string, number>();
  for (const id of RATING_GROUPS) for (const slug of ratingGroupMembers(id)) grouped.set(slug, (grouped.get(slug) ?? 0) + 1);
  const niches = en ?? ru;
  if (niches) {
    for (const slug of niches.keys()) if (usable.has(slug) && grouped.get(slug) !== 1) error(`rating: ${slug} is in ${grouped.get(slug) ?? 0} catalogue groups (groups.ts; want 1)`);
    for (const slug of grouped.keys()) if (!niches.has(slug) || !usable.has(slug)) error(`rating: groups.ts lists ${slug}, which has no rating page`);
  }

  // de/fr/ja: own names and quote translations over en.
  for (const L of ["de", "fr", "ja"] as const) {
    const o = read<RatingOverlayFile>(`${L}/rating/overlay.json`, { hashed: false });
    if (!o || !en) continue;
    ratingFilesChecked++;
    if (o.version !== 1 || o.locale !== L) error(`${L}/rating/overlay.json: locale ${o.locale} / version ${o.version}`);
    for (const [slug, n] of Object.entries(o.names)) if (!en.has(slug) || !n.name) error(`${L}/rating/overlay.json: bad name for ${slug}`);
    for (const [key, list] of Object.entries(o.quotes)) {
      const [slug, id] = key.split(":");
      const app = en.get(slug)?.apps.find((a) => a.id === id);
      if (!app) error(`${L}/rating/overlay.json: quotes for unknown app ${key}`);
      else if (list.length !== app.quotes.length || list.some((q) => !q.text || !q.lang)) error(`${L}/rating/overlay.json: ${key} is not the app's full quote list`);
    }
  }
}

/**
 * Niches with a rating page besides being in the index: they have a review corpus
 * (sitedata/rating.ts `usable`, lib/reviews.ts hasReviewCorpus).
 */
function ratingUsable(): Set<string> {
  const file = path.join(REPO, "src/data/reviewSourceIndex.json");
  const index = JSON.parse(fs.readFileSync(file, "utf8")) as { niches?: Record<string, unknown[]> };
  return new Set(Object.entries(index.niches ?? {}).filter(([, apps]) => Array.isArray(apps) && apps.length > 0).map(([slug]) => slug));
}

/**
 * «Пульс»: content/v2/pulse-demand.json is written only by app_04_inapp/Tools/pulse-demand/build.py
 * --site (Pulse is site-only; the app bundle and import-app-content.ts do not carry it).
 * Optional (the section renders an empty state without it) and outside contentHash, because the
 * build tool refreshes it independently of the app import.
 */
function checkPulse() {
  const file = path.join(CONTENT, "pulse-demand.json");
  if (!fs.existsSync(file)) {
    warnings.push("content/v2/pulse-demand.json missing — «Пульс» renders its empty state");
    return;
  }
  let data: unknown;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    error(`content/v2/pulse-demand.json is not valid JSON: ${(e as Error).message}`);
    return;
  }
  for (const problem of validatePulseDemand(data)) error(`pulse-demand.json: ${problem}`);
  if ((data as Partial<PulseDemand>).source?.unverifiedIncluded) {
    // SPEC: the draft build is for development only, and the interface cannot tell it apart, so
    // CI (the deploy gate) refuses it. Locally it stays a warning. PULSE_ALLOW_UNVERIFIED=1 overrides.
    const message = "pulse-demand.json is a development build (source.unverifiedIncluded: true)";
    if (process.env.CI && process.env.PULSE_ALLOW_UNVERIFIED !== "1")
      error(`${message} — rebuild without --allow-unverified (build.py --site), or set PULSE_ALLOW_UNVERIFIED=1 to ship it anyway`);
    else warnings.push(`${message}; CI rejects it unless PULSE_ALLOW_UNVERIFIED=1`);
  }
}

function finish() {
  for (const w of warnings) console.log(`⚠ ${w}`);
  if (errors.length) {
    console.error(`✖ content check failed with ${errors.length} error(s):`);
    for (const e of errors.slice(0, 100)) console.error(`  - ${e}`);
    process.exit(1);
  }
  console.log(`✔ content/v2 and public/media are consistent (${mediaChecked.size} media files, ${ratingFilesChecked} rating files checked)`);
}

main();
