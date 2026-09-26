// Pure numbers and geometry behind the Pulse visuals (direction A «Прибор», owner 2026-09-25:
// «давай А и стилек хочется флэт 3D премиум эппл такой»): the 10-tick gauge, the word level,
// the score breakdown on a need page and its dot grid of apps. One hue (the brand cobalt) — the
// need's kind never reaches any of this. No I/O: shared by the components, the old archive
// bridge and scripts/v2/test-pulse.ts.

import type { PulseNeed, PulseScoreParams } from "./types";
import { logScale } from "./validate";

export const PAIN_TICKS = 10;

/** A score the gauge can draw: an integer 0..10 (anything else is rounded and clamped). */
export function painScore(score: number): number {
  return Number.isFinite(score) ? Math.min(PAIN_TICKS, Math.max(0, Math.round(score))) : 0;
}

// ---------------------------------------------------------------------------
// Word level — the only place the thresholds live
// ---------------------------------------------------------------------------

export type PainLevel = "mild" | "noticeable" | "strong" | "acute";

/** 1–3 «Фоновая», 4–6 «Заметная», 7–8 «Сильная», 9–10 «Острая» (a 0 would read as mild). */
export const PAIN_LEVELS: readonly { level: PainLevel; from: number; to: number }[] = [
  { level: "mild", from: 1, to: 3 },
  { level: "noticeable", from: 4, to: 6 },
  { level: "strong", from: 7, to: 8 },
  { level: "acute", from: 9, to: 10 },
];

export function painLevel(score: number): PainLevel {
  const s = painScore(score);
  return (PAIN_LEVELS.find((band) => s <= band.to) ?? PAIN_LEVELS[PAIN_LEVELS.length - 1]).level;
}

// ---------------------------------------------------------------------------
// Gauge: a 180° dial of 10 round-capped ticks, the number inside
// ---------------------------------------------------------------------------

export type GaugeSize = "card" | "page";

export type GaugeGeometry = {
  width: number;
  height: number;
  /** Centre of the dial; also the number's baseline. */
  cx: number;
  cy: number;
  /** A tick runs from `inner` to `outer`; the active (last filled) one from `needleInner` to `needleOuter`. */
  inner: number;
  outer: number;
  needleInner: number;
  needleOuter: number;
  stroke: number;
  /** Font size of the number, in viewBox units (1 unit = 1 CSS px at the natural size). */
  fontSize: number;
  /** Baseline of «1» and «10» under the ends of the arc (the need page), or null for none. */
  endsBaseline: number | null;
};

export const GAUGE: Record<GaugeSize, GaugeGeometry> = {
  // Feed card and «Пульс категории» (scaled by 4/3 by CSS in a wide block). The drawn box is
  // trimmed to the ticks' ink: 84×56 (gaugeBox), 112×74.67 scaled.
  card: { width: 96, height: 56, cx: 48, cy: 50, inner: 30, outer: 40, needleInner: 28, needleOuter: 44, stroke: 5, fontSize: 28, endsBaseline: null },
  // Need page: 169×116 drawn (gaugeBox).
  page: { width: 200, height: 116, cx: 100, cy: 97, inner: 62, outer: 81, needleInner: 57, needleOuter: 90, stroke: 9, fontSize: 60, endsBaseline: 113 },
};

export type GaugeTick = { index: number; x1: number; y1: number; x2: number; y2: number; on: boolean; needle: boolean };

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Angle of tick `index` (1..10) in degrees: 171° (left) … 9° (right), 18° apart. */
export function tickAngle(index: number): number {
  return 180 - (index - 0.5) * (180 / PAIN_TICKS);
}

/** The ten ticks, left to right: the first `score` are on; the last of them is the longer needle. */
export function gaugeTicks(score: number, g: GaugeGeometry): GaugeTick[] {
  const filled = painScore(score);
  return Array.from({ length: PAIN_TICKS }, (_, i) => {
    const index = i + 1;
    const needle = index === filled;
    const a = (tickAngle(index) * Math.PI) / 180;
    const from = needle ? g.needleInner : g.inner;
    const to = needle ? g.needleOuter : g.outer;
    return {
      index,
      x1: round2(g.cx + from * Math.cos(a)),
      y1: round2(g.cy - from * Math.sin(a)),
      x2: round2(g.cx + to * Math.cos(a)),
      y2: round2(g.cy - to * Math.sin(a)),
      on: index <= filled,
      needle,
    };
  });
}

/**
 * The drawn box: the dial's box trimmed at both sides to the outer end of the first and the last
 * tick, round caps included. The ticks' ink then starts at the SVG's left edge and lines up with
 * the text column above it (the untrimmed box indented it by 6 px on a card, 15.5 on the need
 * page); the longer needle at 1 or 10 overflows by a few px (the SVG is overflow: visible).
 */
export function gaugeBox(g: GaugeGeometry): { x: number; width: number; height: number } {
  const x = round2(g.cx + g.outer * Math.cos((tickAngle(1) * Math.PI) / 180) - g.stroke / 2);
  return { x, width: round2(g.width - 2 * x), height: g.height };
}

/** Where «1» and «10» sit (x of the middle of the first and the last tick), or null. */
export function gaugeEnds(g: GaugeGeometry): { y: number; first: number; last: number } | null {
  if (g.endsBaseline === null) return null;
  const offset = round2(((g.inner + g.outer) / 2) * Math.cos((tickAngle(1) * Math.PI) / 180));
  return { y: g.endsBaseline, first: round2(g.cx + offset), last: round2(g.cx - offset) };
}

// ---------------------------------------------------------------------------
// «Из чего складывается 7/10»: the three terms of source.score
// ---------------------------------------------------------------------------

export type ScorePartKey = "share" | "apps" | "reviews";

export type ScorePart = {
  key: ScorePartKey;
  /** The exact term, 0..max (10 × weight × its 0..1 input). */
  value: number;
  /** 10 × weight: 5, 2, 3 with today's parameters. */
  max: number;
  /** `value` to one decimal, rounded so that the three add up to `total`. */
  shown: number;
};

export type ScoreBreakdown = {
  parts: ScorePart[];
  /** The unrounded score: the exact sum of the parts (what build.py rounds). */
  raw: number;
  /** Sum of the shown parts, one decimal, within 0.1 of `raw` and rounding to the published score. */
  total: number;
};

/**
 * The published score split into its terms: 10 × (shareWeight × logscale(share) + breadthWeight ×
 * apps / category apps + volumeWeight × logscale(reviews)). The exact parts add up to the raw
 * score. Shown to one decimal each, they are rounded like percentages that must total 100
 * (largest remainder): each is its value rounded down or up to 0.1, and their sum is the raw
 * score to one decimal — pulled into score − 0.5 … score + 0.4 when that decimal would round the
 * other way (build.py rounds 7.46 to 7; its one decimal, 7.5, would read as 8, so the total shows
 * 7.4), so the rows never add up to something that reads as another score.
 */
export function scoreBreakdown(
  need: Pick<PulseNeed, "reviewCount" | "categoryReviewCount" | "appCount" | "categoryAppCount" | "score">,
  p: PulseScoreParams,
): ScoreBreakdown {
  const share = need.categoryReviewCount ? need.reviewCount / need.categoryReviewCount : 0;
  // 10 × weight, without float noise (10 × 0.3 = 3.0000000000000004).
  const max = (weight: number) => Math.round(10 * weight * 1000) / 1000;
  const exact: { key: ScorePartKey; value: number; max: number }[] = [
    { key: "share", value: 10 * p.shareWeight * logScale(share, p.shareFloor, p.shareCeil), max: max(p.shareWeight) },
    { key: "apps", value: 10 * p.breadthWeight * (need.categoryAppCount ? Math.min(1, need.appCount / need.categoryAppCount) : 0), max: max(p.breadthWeight) },
    { key: "reviews", value: 10 * p.volumeWeight * logScale(need.reviewCount, p.volumeFloor, p.volumeCeil), max: max(p.volumeWeight) },
  ];
  const raw = exact.reduce((sum, part) => sum + part.value, 0);
  // Work in tenths.
  const floors = exact.map((part) => Math.floor(part.value * 10 + 1e-9));
  const ceils = exact.map((part, i) => (part.value * 10 - floors[i] > 1e-9 ? floors[i] + 1 : floors[i]));
  const low = floors.reduce((a, b) => a + b, 0);
  const high = ceils.reduce((a, b) => a + b, 0);
  const score = painScore(need.score);
  // The total to one decimal, kept where it reads as the score (rounding half up): score − 0.5 …
  // score + 0.4.
  let target = Math.round(raw * 10);
  target = Math.min(target, score * 10 + 4);
  target = Math.max(target, score * 10 - 5);
  target = Math.min(high, Math.max(low, target));
  const order = exact
    .map((part, i) => ({ i, rest: part.value * 10 - floors[i] }))
    .sort((a, b) => b.rest - a.rest || a.i - b.i)
    .map((entry) => entry.i);
  const tenths = [...floors];
  for (let k = 0, extra = target - low; k < order.length && extra > 0; k++) {
    const i = order[k];
    if (ceils[i] > floors[i]) {
      tenths[i] += 1;
      extra -= 1;
    }
  }
  const parts = exact.map((part, i) => ({ ...part, shown: tenths[i] / 10 }));
  return { parts, raw, total: tenths.reduce((a, b) => a + b, 0) / 10 };
}

// ---------------------------------------------------------------------------
// «Где об этом пишут»: one dot per app of the category
// ---------------------------------------------------------------------------

export const DOTS_PER_ROW = 10;

export type Dot = { col: number; row: number; on: boolean };

/**
 * `total` dots in rows of 10, the first `filled` of them on, filled from the bottom-left like
 * water in a jar: the bottom row left to right, then the row above. An incomplete row is the top
 * one. `row` counts from the top (0).
 */
export function dotGrid(filled: number, total: number): { rows: number; dots: Dot[] } {
  const count = Math.max(0, Math.floor(total));
  const on = Math.min(count, Math.max(0, Math.floor(filled)));
  const rows = Math.ceil(count / DOTS_PER_ROW);
  const dots = Array.from({ length: count }, (_, k) => ({
    col: k % DOTS_PER_ROW,
    row: rows - 1 - Math.floor(k / DOTS_PER_ROW),
    on: k < on,
  }));
  return { rows, dots };
}
