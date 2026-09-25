import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { buttonClass } from "@/site/ui/Button";
import { LockIcon } from "@/site/ui/icons";
import { formatNumber } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseEvidence, PulseNeed } from "./types";

// Parts of a need page (SPEC «Подробности»). Pure and server-rendered.
// EVIDENCE GATE: the first quote is public; the others are rendered only when the viewer can
// read the category's breakdown (getViewer().canReadResearch(categoryId)). Locked quotes never
// reach the HTML or the RSC payload — the gate is applied here, before rendering.

export type PulseUnlock = { href: string; label: string; signInHref: string | null };

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
              <span className="ia-pulse-stars__bar" aria-hidden="true">
                <span style={{ width: `${(count / max) * 100}%` }} />
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
export function PulseTopApps({ apps, locale, strings: s }: { apps: PulseNeed["topApps"]; locale: Locale; strings: PulseStrings }) {
  const named = apps.filter((app) => app.name.trim());
  if (!named.length) return null;
  return (
    <div className="ia-pulse-block">
      <h2 className="ia-pulse-block__title">{s.topAppsTitle}</h2>
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
