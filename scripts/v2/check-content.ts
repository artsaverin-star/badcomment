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

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT = path.join(REPO, "content/v2");
const MEDIA = path.join(REPO, "public/media");

const errors: string[] = [];
const warnings: string[] = [];
const error = (m: string) => errors.push(m);

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const rawFiles = new Map<string, string>();

function read<T>(rel: string): T | null {
  const file = path.join(CONTENT, rel);
  if (!fs.existsSync(file)) {
    error(`missing content/v2/${rel}`);
    return null;
  }
  const raw = fs.readFileSync(file, "utf8");
  rawFiles.set(rel, raw);
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    error(`content/v2/${rel} is not valid JSON: ${(e as Error).message}`);
    return null;
  }
}

const mediaChecked = new Set<string>();
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

  finish();
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
  console.log(`✔ content/v2 and public/media are consistent (${mediaChecked.size} media files checked)`);
}

main();
