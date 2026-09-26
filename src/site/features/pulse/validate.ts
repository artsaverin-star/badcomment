// Structural validation of content/v2/pulse-demand.json (schemaVersion 1). Pure and
// dependency-free: shared by scripts/v2/check-content.ts and
// scripts/v2/test-pulse.ts. Returns human-readable problems; an empty list means valid.

import { PULSE_KINDS, PULSE_LANGS, type PulseDemand, type PulseScoreParams } from "./types";

/** Category slug and need slug: lower-case words joined by single hyphens. */
export const PULSE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** "<category>--<slug>": URL-safe, no colons, no encoding needed. */
export const PULSE_NEED_ID = /^([a-z0-9]+(?:-[a-z0-9]+)*)--([a-z0-9]+(?:-[a-z0-9]+)*)$/;

/** Position of `value` on a log scale floor..ceil, clamped to 0..1 (build.py's logscale). */
export const logScale = (value: number, floor: number, ceil: number) =>
  Math.min(1, Math.max(0, (Math.log10(Math.max(value, 1e-9)) - Math.log10(floor)) / (Math.log10(ceil) - Math.log10(floor))));

/**
 * Unrounded pain score (0..10) exactly as build.py computes it:
 * 10 × (shareWeight × logscale(share, shareFloor..shareCeil) + breadthWeight × appCount / categoryAppCount
 *       + volumeWeight × logscale(reviewCount, volumeFloor..volumeCeil)).
 */
export function rawPainScore(share: number, appCount: number, categoryAppCount: number, reviewCount: number, p: PulseScoreParams): number {
  const frequency = logScale(share, p.shareFloor, p.shareCeil);
  const breadth = categoryAppCount ? appCount / categoryAppCount : 0;
  const volume = logScale(reviewCount, p.volumeFloor, p.volumeCeil);
  return 10 * (p.shareWeight * frequency + p.breadthWeight * breadth + p.volumeWeight * volume);
}

const clampScore = (n: number) => Math.max(1, Math.min(10, n));

/**
 * The integer scores build.py may have written for `raw`: Python's round() is round-half-even,
 * so an exact .5 has one answer; within float noise of .5 both neighbours are accepted.
 */
export function acceptedScores(raw: number): number[] {
  const floor = Math.floor(raw);
  const frac = raw - floor;
  if (Math.abs(frac - 0.5) < 1e-9) return [...new Set([clampScore(floor), clampScore(floor + 1)])];
  return [clampScore(frac < 0.5 ? floor : floor + 1)];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => Number.isInteger(v);
const isNonNegInt = (v: unknown): v is number => isInt(v) && (v as number) >= 0;

export function validatePulseDemand(input: unknown): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  if (!isObj(input)) return ["pulse-demand.json is not an object"];
  const data = input as Partial<PulseDemand> & Record<string, unknown>;
  if (data.schemaVersion !== 1) err(`schemaVersion ${JSON.stringify(data.schemaVersion)} (expected 1)`);
  if (typeof data.generatedAt !== "string" || Number.isNaN(Date.parse(data.generatedAt))) err("generatedAt is not a date");
  const source = data.source;
  const params = isObj(source) && isObj(source.score) ? (source.score as PulseScoreParams) : null;
  const finite = (n: unknown) => typeof n === "number" && Number.isFinite(n);
  if (
    !params ||
    ![params.shareFloor, params.shareCeil, params.shareWeight, params.breadthWeight, params.volumeFloor, params.volumeCeil, params.volumeWeight].every(finite) ||
    !(params.shareFloor > 0 && params.shareCeil > params.shareFloor && params.volumeFloor > 0 && params.volumeCeil > params.volumeFloor)
  ) {
    err("source.score must carry shareFloor < shareCeil, volumeFloor < volumeCeil and the three weights");
  }
  if (!Array.isArray(data.categories)) err("categories is not an array");
  if (!Array.isArray(data.needs)) err("needs is not an array");
  if (errors.length) return errors;

  const categories = data.categories!;
  const needs = data.needs!;
  const categoryIds = new Set<string>();
  for (const c of categories) {
    if (!isObj(c) || typeof c.id !== "string" || !PULSE_SLUG.test(c.id)) {
      err(`category ${JSON.stringify(isObj(c) ? c.id : c)}: bad id`);
      continue;
    }
    if (categoryIds.has(c.id)) err(`category ${c.id}: duplicate`);
    categoryIds.add(c.id);
    if (!isObj(c.name) || typeof c.name.en !== "string" || !c.name.en.trim()) err(`category ${c.id}: no English name`);
    if (!isNonNegInt(c.reviewCount) || !isNonNegInt(c.appCount)) err(`category ${c.id}: bad counts`);
    const own = needs.filter((n) => isObj(n) && n.categoryId === c.id).length;
    if (c.needCount !== own) err(`category ${c.id}: needCount ${c.needCount}, but ${own} needs`);
    if (own === 0) err(`category ${c.id}: listed without needs`);
  }
  if (isObj(source) && source.needCount !== needs.length) err(`source.needCount ${String(source.needCount)}, but ${needs.length} needs`);

  const ids = new Set<string>();
  const ranks = new Map<string, number[]>();
  for (const [index, n] of needs.entries()) {
    if (!isObj(n) || typeof n.id !== "string") {
      err(`needs[${index}]: no id`);
      continue;
    }
    const where = `need ${n.id}`;
    const m = PULSE_NEED_ID.exec(n.id);
    if (!m) err(`${where}: id is not "<category>--<slug>" (URL-safe, no colons)`);
    else if (m[1] !== n.categoryId) err(`${where}: id prefix differs from categoryId ${n.categoryId}`);
    if (ids.has(n.id)) err(`${where}: duplicate id`);
    ids.add(n.id);
    if (!categoryIds.has(n.categoryId)) err(`${where}: unknown category ${n.categoryId}`);
    if (!PULSE_KINDS.includes(n.kind)) err(`${where}: kind ${JSON.stringify(n.kind)}`);
    for (const field of ["title", "summary"] as const) {
      const text = n[field];
      for (const lang of PULSE_LANGS) {
        if (!isObj(text) || typeof text[lang] !== "string" || !text[lang].trim()) err(`${where}: ${field}.${lang} is empty`);
      }
    }
    if (!isInt(n.score) || n.score < 1 || n.score > 10) err(`${where}: score ${JSON.stringify(n.score)} is not an integer 1..10`);
    const counts = [n.reviewCount, n.appCount, n.categoryAppCount, n.categoryReviewCount];
    if (!counts.every(isNonNegInt) || n.reviewCount < 1 || n.appCount < 1) err(`${where}: bad counts`);
    else {
      if (n.appCount > n.categoryAppCount) err(`${where}: appCount > categoryAppCount`);
      if (n.reviewCount > n.categoryReviewCount) err(`${where}: reviewCount > categoryReviewCount`);
      const exact = n.reviewCount / n.categoryReviewCount;
      if (typeof n.share !== "number" || Math.abs(n.share - exact) > 1e-6) err(`${where}: share ${n.share} ≠ ${exact.toFixed(6)}`);
      if (params && isInt(n.score)) {
        const raw = rawPainScore(exact, n.appCount, n.categoryAppCount, n.reviewCount, params);
        if (!acceptedScores(raw).includes(n.score)) err(`${where}: score ${n.score} differs from the formula (${raw.toFixed(3)})`);
      }
    }
    if (!Array.isArray(n.ratingCounts) || n.ratingCounts.length !== 5 || !n.ratingCounts.every(isNonNegInt)) err(`${where}: ratingCounts must be five counts`);
    else if (n.ratingCounts.reduce((a, b) => a + b, 0) !== n.reviewCount) err(`${where}: ratingCounts do not add up to reviewCount`);
    if (n.precision !== null && (typeof n.precision !== "number" || n.precision < 0 || n.precision > 1)) err(`${where}: precision ${n.precision}`);
    if (!isNonNegInt(n.precisionSample)) err(`${where}: precisionSample`);
    if (!isInt(n.rank) || n.rank < 1) err(`${where}: rank ${n.rank}`);
    else ranks.set(n.categoryId, [...(ranks.get(n.categoryId) ?? []), n.rank]);
    if (!Array.isArray(n.topApps) || n.topApps.length > 5 || !n.topApps.every((a) => isObj(a) && typeof a.id === "string" && typeof a.name === "string" && isNonNegInt(a.count))) {
      err(`${where}: topApps`);
    }
    if (!Array.isArray(n.evidence)) err(`${where}: evidence is not an array`);
    else {
      const seen = new Set<string>();
      for (const e of n.evidence) {
        if (!isObj(e) || typeof e.id !== "string" || typeof e.quote !== "string" || !e.quote.trim() || typeof e.quoteRu !== "string" || typeof e.appName !== "string" || !isInt(e.rating) || e.rating < 1 || e.rating > 5) {
          err(`${where}: malformed evidence ${isObj(e) ? String(e.id).slice(0, 12) : ""}`);
          continue;
        }
        if (seen.has(e.id)) err(`${where}: duplicate evidence ${e.id.slice(0, 12)}`);
        seen.add(e.id);
      }
    }
  }
  for (const [category, list] of ranks) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((r, i) => r !== i + 1)) err(`category ${category}: ranks are not 1..${list.length}`);
  }
  for (let i = 1; i < needs.length; i++) {
    const a = needs[i - 1];
    const b = needs[i];
    if (isObj(a) && isObj(b) && (b.score > a.score || (b.score === a.score && b.share > a.share))) {
      err(`needs are not sorted by score, then share, at ${b.id}`);
      break;
    }
  }
  return errors;
}
