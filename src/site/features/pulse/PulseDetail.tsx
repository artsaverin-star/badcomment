import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { INTL_LOCALE, type Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { buttonClass } from "@/site/ui/Button";
import { LockIcon } from "@/site/ui/icons";
import { DOTS_PER_ROW, dotGrid, painScore, scoreBreakdown } from "./gauge";
import { PulseBar, PulseFactList } from "./PulseGauge";
import { formatNumber, sharePercent } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseEvidence, PulseNeed, PulseScoreParams } from "./types";

// Parts of a need page (SPEC «Подробности», direction A «Прибор»). Pure and server-rendered.
// EVIDENCE GATE: the first quote is public; the others are rendered only when the viewer can
// read the category's breakdown (getViewer().canReadResearch(categoryId)). Locked quotes never
// reach the HTML or the RSC payload — the gate is applied here, before rendering.

export type PulseUnlock = { href: string; label: string; signInHref: string | null };

/** format() for React: "{value} из {max}" with nodes in place of the placeholders. */
function fill(template: string, values: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((part, i) => {
    const key = /^\{(\w+)\}$/.exec(part)?.[1];
    return <Fragment key={i}>{key && key in values ? values[key] : part}</Fragment>;
  });
}

/**
 * The facts line: «3 827 отзывов · в 92 из 100 приложений · …», wrapping only between facts and
 * never after a «·» (PulseFactList).
 */
export function PulseFacts({ facts, className }: { facts: readonly string[]; className?: string }) {
  return (
    <p className={className}>
      <PulseFactList facts={facts} />
    </p>
  );
}

/** The quotes a viewer may see: all of them with access, else only the first. */
export function visibleEvidence(need: Pick<PulseNeed, "evidence">, readable: boolean): PulseEvidence[] {
  return readable ? need.evidence : need.evidence.slice(0, 1);
}

function Stars({ rating, label }: { rating: number; label: string }) {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="ia-pulse-quote__stars" role="img" aria-label={label}>
      {"★".repeat(n)}
      <span className="ia-pulse-quote__stars-off">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function Quote({ quote, locale, strings: s }: { quote: PulseEvidence; locale: Locale; strings: PulseStrings }) {
  // ru shows the translation and lets the reader open the original; other locales show the original.
  const translated = locale === "ru" && quote.quoteRu.trim() !== "" && quote.quoteRu.trim() !== quote.quote.trim();
  return (
    <figure className="ia-pulse-quote" data-evidence-id={quote.id}>
      <blockquote lang={translated ? "ru" : "en"}>{translated ? quote.quoteRu : quote.quote}</blockquote>
      {translated ? (
        <details className="ia-pulse-quote__original">
          <summary>{s.original}</summary>
          <blockquote lang="en">{quote.quote}</blockquote>
        </details>
      ) : null}
      <figcaption>
        {quote.appName ? <span className="ia-pulse-quote__app">{quote.appName}</span> : null}
        <Stars rating={quote.rating} label={format(s.rating, { rating: quote.rating })} />
      </figcaption>
    </figure>
  );
}

export function PulseEvidenceList({ need, readable, locale, strings: s, unlock }: { need: PulseNeed; readable: boolean; locale: Locale; strings: PulseStrings; unlock: PulseUnlock }) {
  const shown = visibleEvidence(need, readable);
  if (!shown.length) return null;
  const locked = need.evidence.length > shown.length;
  return (
    <section className="ia-pulse-section" aria-labelledby="pulse-evidence-title">
      <h2 className="ia-pulse-section__title" id="pulse-evidence-title">
        {s.evidenceTitle}
      </h2>
      <div className="ia-pulse-quotes">
        {shown.map((quote) => (
          <Quote key={quote.id} quote={quote} locale={locale} strings={s} />
        ))}
      </div>
      {locked ? (
        <div className="ia-card ia-card--utility ia-pulse-lock" data-pulse-locked="">
          <p className="ia-pulse-lock__label">
            <LockIcon size={17} strokeWidth={2} aria-hidden="true" />
            {s.lockedTitle}
          </p>
          <p className="ia-pulse-lock__body">{s.lockedBody}</p>
          <Link href={unlock.href} className={buttonClass({ variant: "primary" })}>
            {unlock.label}
          </Link>
          {unlock.signInHref ? (
            <Link href={unlock.signInHref} className="ia-pulse-lock__link">
              {s.signIn}
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** Five thin bars: how the matching reviews rated the app, 5★ on top. */
export function PulseStars({ counts, locale, strings: s }: { counts: readonly number[]; locale: Locale; strings: PulseStrings }) {
  const max = Math.max(1, ...counts);
  return (
    <div className="ia-pulse-block">
      <h2 className="ia-pulse-block__title">{s.ratingsTitle}</h2>
      <ol className="ia-pulse-stars">
        {[5, 4, 3, 2, 1].map((stars) => {
          const count = counts[stars - 1] ?? 0;
          return (
            <li key={stars}>
              <span className="ia-pulse-stars__label" aria-hidden="true">
                {stars}★
              </span>
              <span className="ia-pulse-stars__bar" aria-hidden="true" data-count={count}>
                {/* No fill for a zero: the 2 px minimum is for small non-zero counts. */}
                {count > 0 ? <span style={{ width: `${(count / max) * 100}%` }} /> : null}
              </span>
              <span className="ia-pulse-stars__count" aria-hidden="true">
                {formatNumber(locale, count)}
              </span>
              <span className="ia-pulse-sr-only">{format(s.ratingAria, { stars, count: formatNumber(locale, count) })}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** «Чаще всего пишут в»: up to five apps with the number of matching reviews. */
export function PulseTopApps({ apps, locale, strings: s, heading: Heading = "h2" }: { apps: PulseNeed["topApps"]; locale: Locale; strings: PulseStrings; heading?: "h2" | "h3" }) {
  const named = apps.filter((app) => app.name.trim());
  if (!named.length) return null;
  return (
    <div className="ia-pulse-block">
      <Heading className="ia-pulse-block__title ia-pulse-block__title--sub">{s.topAppsTitle}</Heading>
      <ul className="ia-pulse-apps">
        {named.map((app) => (
          <li key={app.id}>
            <span className="ia-pulse-apps__name">{app.name}</span>
            <span className="ia-pulse-apps__count">{formatNumber(locale, app.count)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * «Из чего складывается 7/10»: the three terms of the score (source.score), each a labelled row
 * with a thin bar — share of the category's reviews (of 10 × shareWeight), apps (of 10 ×
 * breadthWeight), reviews (of 10 × volumeWeight) — and their total. The shown parts add up to the
 * total, which rounds to the published score (scoreBreakdown).
 */
export function PulseBreakdown({ need, params, locale, strings: s }: { need: PulseNeed; params: PulseScoreParams; locale: Locale; strings: PulseStrings }) {
  const breakdown = scoreBreakdown(need, params);
  const score = painScore(need.score);
  const tenths = new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const label = { share: s.partShare, apps: s.partApps, reviews: s.partReviews } as const;
  const detail = {
    share: sharePercent(locale, need.share),
    apps: format(s.appsOf, { n: formatNumber(locale, need.appCount), total: formatNumber(locale, need.categoryAppCount) }),
    reviews: formatNumber(locale, need.reviewCount),
  } as const;
  return (
    <section className="ia-pulse-panel ia-pulse-breakdown" aria-labelledby="pulse-breakdown-title" data-pulse-breakdown="">
      <h2 className="ia-pulse-block__title" id="pulse-breakdown-title">
        {format(s.breakdownTitle, { score })}
      </h2>
      <ul className="ia-pulse-parts" role="list">
        {breakdown.parts.map((part) => (
          <li key={part.key} className="ia-pulse-part" data-part={part.key} data-shown={part.shown} data-max={part.max}>
            <span className="ia-pulse-part__label">
              {label[part.key]}
              <span className="ia-pulse-part__detail">{detail[part.key]}</span>
            </span>
            <span className="ia-pulse-part__points">
              {fill(s.partPoints, { value: <span className="ia-pulse-part__value">{tenths.format(part.shown)}</span>, max: formatNumber(locale, part.max) })}
            </span>
            <PulseBar value={part.max ? part.shown / part.max : 0} thin className="ia-pulse-part__bar" />
          </li>
        ))}
      </ul>
      <p className="ia-pulse-parts__total" data-total={breakdown.total}>
        <span>{s.breakdownTotal}</span>
        <span className="ia-pulse-part__points">
          <span className="ia-pulse-part__value">{tenths.format(breakdown.total)}</span> ≈ {score}/10
        </span>
      </p>
    </section>
  );
}

const DOT = 8;
const DOT_GAP = 4;

/**
 * «Где об этом пишут»: one dot per app of the category (10 to a row), the apps whose reviews
 * mention the need filled in cobalt from the bottom-left, a legend «● 92 с этой болью · ● 8 без»
 * — next to «Чаще всего пишут в». The dots are not particular apps (only the top five are known).
 */
export function PulseWhere({ need, locale, strings: s }: { need: PulseNeed; locale: Locale; strings: PulseStrings }) {
  const grid = dotGrid(need.appCount, need.categoryAppCount);
  const on = grid.dots.filter((dot) => dot.on).length;
  const off = grid.dots.length - on;
  const width = DOTS_PER_ROW * DOT + (DOTS_PER_ROW - 1) * DOT_GAP;
  const height = grid.rows * DOT + Math.max(0, grid.rows - 1) * DOT_GAP;
  return (
    <section className="ia-pulse-panel ia-pulse-where" aria-labelledby="pulse-where-title">
      <h2 className="ia-pulse-block__title" id="pulse-where-title">
        {s.whereTitle}
      </h2>
      <div className="ia-pulse-where__body">
        <figure className="ia-pulse-dots">
          <svg className="ia-pulse-dots__grid" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" focusable="false" data-dots={grid.dots.length} data-on={on}>
            {grid.dots.map((dot) => (
              <circle
                key={`${dot.row}-${dot.col}`}
                cx={dot.col * (DOT + DOT_GAP) + DOT / 2}
                cy={dot.row * (DOT + DOT_GAP) + DOT / 2}
                r={DOT / 2}
                className={dot.on ? "ia-pulse-dots__on" : "ia-pulse-dots__off"}
              />
            ))}
          </svg>
          <figcaption className="ia-pulse-dots__caption">
            <span className="ia-pulse-dots__legend">
              <span className="ia-pulse-dots__key">
                <span className="ia-pulse-dots__swatch ia-pulse-dots__swatch--on" aria-hidden="true" />
                {format(s.dotsWith, { n: formatNumber(locale, on) })}
              </span>
              {off > 0 ? (
                <span className="ia-pulse-dots__key">
                  <span className="ia-pulse-dots__swatch" aria-hidden="true" />
                  {format(s.dotsWithout, { n: formatNumber(locale, off) })}
                </span>
              ) : null}
            </span>
            <span className="ia-pulse-dots__note">{s.dotsNote}</span>
          </figcaption>
        </figure>
        <PulseTopApps apps={need.topApps} locale={locale} strings={s} heading="h3" />
      </div>
    </section>
  );
}
