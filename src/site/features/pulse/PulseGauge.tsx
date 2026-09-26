import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Locale } from "@/site/i18n/locales";
import { GAUGE, gaugeBox, gaugeEnds, gaugeTicks, painScore, type GaugeSize } from "./gauge";
import { levelWord, needAria, needText, painOfPhrase } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseNeed } from "./types";

// The visual primitives of «Пульс» (direction A «Прибор»), shared by the feed card, the need
// page, «Пульс категории» and the old archive: the 10-tick gauge, the word level, the score bar
// and the rows of bars. Pure and server-rendered; every graphic is aria-hidden and its meaning is
// in text (needAria). One hue — the brand cobalt — whatever the need's kind. Styles:
// ./pulse-kit.css (self-contained, with DS fallbacks: the old site has no --ia-* tokens).

/** A link that is next/link on the new site and a plain <a> on the old one (another root layout). */
export function PulseLink({ plain, href, className, children }: { plain?: boolean; href: string; className: string; children: ReactNode }) {
  return plain ? (
    <a href={href} className={className}>
      {children}
    </a>
  ) : (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  );
}

/**
 * The gauge: ten round-capped ticks on a 180° arc, the first `score` in the cobalt gradient with a
 * soft coloured shadow (light theme only), the last of them longer and solid like a needle, the
 * number inside. The box is trimmed to the ticks' ink (gaugeBox), so the dial lines up with the
 * text beside and above it. `id` must be unique on the page (the gradient and the shadow are
 * referenced by id): use the need id.
 */
export function PulseGauge({ score, size = "card", id, className }: { score: number; size?: GaugeSize; id: string; className?: string }) {
  const g = GAUGE[size];
  const filled = painScore(score);
  const ticks = gaugeTicks(filled, g);
  const ends = gaugeEnds(g);
  const box = gaugeBox(g);
  const fill = `${id}-fill`;
  const glow = `${id}-glow`;
  const line = (t: (typeof ticks)[number]) => (
    <line
      key={t.index}
      x1={t.x1}
      y1={t.y1}
      x2={t.x2}
      y2={t.y2}
      data-tick={t.on ? "on" : "off"}
      data-needle={t.needle ? "" : undefined}
      className={t.needle ? "ia-pulse-gauge__needle" : undefined}
    />
  );
  return (
    <svg
      className={`ia-pulse-gauge ia-pulse-gauge--${size}${className ? ` ${className}` : ""}`}
      width={box.width}
      height={box.height}
      viewBox={`${box.x} 0 ${box.width} ${box.height}`}
      aria-hidden="true"
      focusable="false"
      data-score={filled}
    >
      <defs>
        {/* Vertical: lighter at the top of the dial, deeper at its ends — light from above. */}
        <linearGradient id={fill} gradientUnits="userSpaceOnUse" x1="0" y1={g.cy - g.needleOuter} x2="0" y2={g.cy}>
          <stop offset="0" className="ia-pulse-gauge__hi" />
          <stop offset="1" className="ia-pulse-gauge__lo" />
        </linearGradient>
        <filter id={glow} filterUnits="userSpaceOnUse" x={-12} y={-12} width={g.width + 24} height={g.height + 24} colorInterpolationFilters="sRGB">
          <feDropShadow className="ia-pulse-gauge__glow" dx="0" dy={size === "page" ? 3 : 2} stdDeviation={size === "page" ? 3 : 2} />
        </filter>
      </defs>
      <g className="ia-pulse-gauge__off" strokeWidth={g.stroke} strokeLinecap="round">
        {ticks.filter((t) => !t.on).map(line)}
      </g>
      {filled > 0 ? (
        <g className="ia-pulse-gauge__on" stroke={`url(#${fill})`} strokeWidth={g.stroke} strokeLinecap="round" filter={`url(#${glow})`}>
          {ticks.filter((t) => t.on).map(line)}
        </g>
      ) : null}
      <text className="ia-pulse-gauge__n" x={g.cx} y={g.cy} fontSize={g.fontSize} textAnchor="middle">
        {filled}
      </text>
      {ends ? (
        <g className="ia-pulse-gauge__ends" textAnchor="middle">
          <text x={ends.first} y={ends.y}>
            1
          </text>
          <text x={ends.last} y={ends.y}>
            10
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/**
 * Facts joined by « · » that wrap only between facts: every fact after the first carries its «·»
 * in one unbreakable run, so a line never ends in a separator or splits «в 67 из 100 приложений»
 * (a fact wider than the line still wraps inside). The text is exactly facts.join(" · ").
 */
export function PulseFactList({ facts }: { facts: readonly ReactNode[] }) {
  return facts.map((fact, i) => (
    <Fragment key={i}>
      {i ? " " : null}
      <span className="ia-pulse-kit-fact">
        {i ? "· " : null}
        {fact}
      </span>
    </Fragment>
  ));
}

/** «Сильная» over «боль 7 из 10» (aria-hidden: the card or row carries needAria). */
export function PulseLevel({ score, strings: s, className }: { score: number; strings: PulseStrings; className?: string }) {
  return (
    <span className={`ia-pulse-level${className ? ` ${className}` : ""}`} aria-hidden="true">
      <span className="ia-pulse-level__word">{levelWord(s, score)}</span>
      <span className="ia-pulse-level__of">{painOfPhrase(s, score)}</span>
    </span>
  );
}

/** A horizontal bar: track --ia-soft, the fill `value` of 1 (0..1) in the cobalt gradient. */
export function PulseBar({ value, thin, className }: { value: number; thin?: boolean; className?: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 1000) / 10;
  return (
    <span className={`ia-pulse-bar${thin ? " ia-pulse-bar--thin" : ""}${className ? ` ${className}` : ""}`} aria-hidden="true" data-value={pct}>
      <span className="ia-pulse-bar__fill" style={{ width: `${pct}%` }} />
    </span>
  );
}

/**
 * Need rows: the title (≤ 2 lines), a bar of score × 10 % and «9/10»; one link per row. In a
 * block ≥ 560 px wide one line [title 1fr][bar 200][score 56]; narrower, the bar and the score go
 * under the title. `categoryNames` adds the category under each title (a cross-category list).
 */
export function PulseBarRows({
  needs,
  locale,
  strings: s,
  href,
  plainLinks,
  categoryNames,
  className,
}: {
  needs: readonly PulseNeed[];
  locale: Locale;
  strings: PulseStrings;
  href: (needId: string) => string;
  plainLinks?: boolean;
  categoryNames?: ReadonlyMap<string, string>;
  className?: string;
}) {
  if (!needs.length) return null;
  return (
    <ul className={`ia-pulse-barrows${className ? ` ${className}` : ""}`} role="list">
      {needs.map((need) => {
        const score = painScore(need.score);
        const category = categoryNames?.get(need.categoryId);
        return (
          <li key={need.id}>
            <PulseLink plain={plainLinks} href={href(need.id)} className="ia-pulse-barrow">
              <span className="ia-pulse-barrow__text">
                <span className="ia-pulse-barrow__title">{needText(need.title, locale)}</span>
                {category ? <span className="ia-pulse-barrow__meta">{category}</span> : null}
              </span>
              <PulseBar value={score / 10} className="ia-pulse-barrow__bar" />
              <span className="ia-pulse-barrow__score" aria-hidden="true">
                <span className="ia-pulse-barrow__n">{score}</span>
                <span className="ia-pulse-barrow__of">/10</span>
              </span>
              <span className="ia-pulse-kit-sr"> {needAria(locale, s, need)}</span>
            </PulseLink>
          </li>
        );
      })}
    </ul>
  );
}
