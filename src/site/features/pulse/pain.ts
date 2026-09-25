// «Шкала боли» (SPEC «Правила чтения»): 10 rounded segments, `score` of them filled. Filled
// segments take the colour of their position on a linear ramp from amber #F4B63F (1) to red
// #E5484D (10). The number next to the meter stays ink-coloured: amber text on white is
// ≈ 1.8:1 and unreadable (owner-approved deviation from the SPEC, 2026-09-24). The colour never
// depends on the need's kind. Pure: used by the new site, the old archive and the
// tests.

export const PAIN_SEGMENTS = 10;

const AMBER = [0xf4, 0xb6, 0x3f] as const;
const RED = [0xe5, 0x48, 0x4d] as const;

const hex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

/** Colour of segment `position` (1..10), clamped. painColor(1) = "#f4b63f", painColor(10) = "#e5484d". */
export function painColor(position: number): string {
  const p = Math.min(PAIN_SEGMENTS, Math.max(1, Math.round(position)));
  const t = (p - 1) / (PAIN_SEGMENTS - 1);
  return `#${AMBER.map((from, i) => hex(from + (RED[i] - from) * t)).join("")}`;
}

/** A score the meter can draw: an integer 0..10 (anything else is clamped/rounded). */
export function meterScore(score: number): number {
  return Number.isFinite(score) ? Math.min(PAIN_SEGMENTS, Math.max(0, Math.round(score))) : 0;
}
