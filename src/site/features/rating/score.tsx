import type { CSSProperties } from "react";
import { cx } from "@/site/ui/cx";
import { reviewScoreValue } from "./format";

// The review score and the rank mark of the rating (spec 11 §3.3). Server- and client-safe,
// no string table: the caller passes the unit (`s.outOf100`) and the rank template.
//
//   <ScoreMeter score={91} size="md" unit={s.outOf100} />   rows, search rows (with unit), facts (without)
//   <ScoreMeter score={91} size="lg" unit={s.outOf100} />   leader cards
//   <ScoreMeter score={91} size="sm" />                     mini rows (sm never shows a unit)
//
// Both are aria-hidden: the owner prints the accessible text in an sr-only span (the row meta's
// «Место 4. Оценка по отзывам: 84 из 100. …», the mini row's `s.scoreA11y`). The meter is ink on
// --ia-soft, filled to the score; a missing score shows «—» without a meter (none today).

export type ScoreSize = "sm" | "md" | "lg";

export function ScoreMeter({
  score,
  size,
  unit,
  className,
}: {
  score: number | null;
  size: ScoreSize;
  /** «из 100» under the value (`s.outOf100`); omitted → no unit line. Never shown for `sm`. */
  unit?: string;
  className?: string;
}) {
  return (
    <span className={cx("ia-rt-score", `ia-rt-score--${size}`, className)} aria-hidden="true">
      <span className="ia-rt-score__value">{reviewScoreValue(score)}</span>
      {unit && size !== "sm" ? <span className="ia-rt-score__unit">{unit}</span> : null}
      {score !== null ? <span className="ia-rt-meter" style={{ "--v": Math.max(0, Math.min(100, score)) } as CSSProperties} /> : null}
    </span>
  );
}

/**
 * The rank of a row (15/20 600 tabular secondary). Below 600 px of list width it reads «№ 4» /
 * "#4" / «4位»: the prefix and suffix are CSS `content` from the custom properties that the list
 * sets once with `rankVars(s.rankShort)` (spec 11 §3.3; not per row: every row is in the HTML
 * and the RSC payload). From 600 px it is the bare numeral in a 28 px column.
 */
export function RankMark({ rank }: { rank: number }) {
  return (
    <span className="ia-rt-rank" aria-hidden="true">
      {rank}
    </span>
  );
}

/**
 * The CSS custom properties of the narrow rank label from the `s.rankShort` template
 * («№ {n}», "#{n}", «{n}位»): the text before `{n}` → --ia-rt-rank-prefix, after → -suffix.
 * One template instead of a prefix with a trailing no-break space (the strings lint rejects
 * leading/trailing spaces). Set on the `ol.ia-rt-list` of the rows; the marks inherit them.
 */
export function rankVars(short: string): CSSProperties {
  const at = short.indexOf("{n}");
  const prefix = at === -1 ? "" : short.slice(0, at);
  const suffix = at === -1 ? "" : short.slice(at + 3);
  return { "--ia-rt-rank-prefix": JSON.stringify(prefix), "--ia-rt-rank-suffix": JSON.stringify(suffix) } as CSSProperties;
}
