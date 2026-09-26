import type { Locale } from "@/site/i18n/locales";
import { PulseBarRows, PulseFactList, PulseGauge, PulseLink } from "./PulseGauge";
import { aboutAppsPhrase, countsFacts, levelWord, needAria, needsPhrase, needText, PULSE_EMBED_LIMIT } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseNeed } from "./types";

// «Пульс категории» (direction A «Прибор», owner 2026-09-25: «флэт 3D премиум эппл такой»): a
// white DS card — radius 28, the research-card shadow — at the top of every topic page (new,
// readable and locked; old pages and NicheDossier) and of the review archive (/reviews,
// /reviews/<slug>). Top to bottom:
//   1. «Пульс категории» (Georgia, like the article) and «7 потребностей · 46 072 отзыва о 100
//      приложениях» — the host page's own figures (`stats`), so they match the page around it;
//   2. the #1 need, one link: its gauge (96×56, 128×74 in a block ≥ 560 px wide), «ГЛАВНАЯ БОЛЬ»,
//      the title and «Острая · 3 827 отзывов · в 92 из 100 приложений»;
//   3. rows for #2…#5: title, a bar of score × 10 %, «9/10» (PulseBarRows);
//   4. «Все 7 потребностей →».
// No chart, no rank numbers, no kind. Pure and server-rendered. Styles: ./category-pulse-hero.css
// and ./pulse-kit.css (both self-contained, with DS fallbacks for the old site); the callers
// import them.

export type CategoryPulseHeroProps = {
  /** Every need of the block, strongest first: categoryNeeds(data, id), or data.needs on the review hub (PulseTop). */
  needs: readonly PulseNeed[];
  locale: Locale;
  strings: PulseStrings;
  /** Section id; the topic page's TOC entry points at "category-pulse". */
  id: string;
  /** «Пульс категории» (or «Пульс» on the review hub). */
  heading: string;
  /**
   * The subtitle's reviews and apps: the figures the host page itself prints for this category
   * (the article's corpus sentence, the archive header, the hub's totals) — not the Pulse file's
   * own count, which drops a few duplicate texts and would sit next to a nearly equal number.
   */
  stats: { reviewCount: number; appCount: number };
  /** «Все 7 потребностей», formatted (allNeedsPhrase). */
  allLabel: string;
  allHref: string;
  needHref: (needId: string) => string;
  /** Category names with each need, for a cross-category list (the review hub, PulseTop). */
  categoryNames?: ReadonlyMap<string, string>;
  /** The old site links out of its root layout: plain <a> instead of next/link. */
  plainLinks?: boolean;
  /** data-pulse-embed on the section (the category id). */
  categoryId?: string;
  className?: string;
};

export function CategoryPulseHero({
  needs,
  locale,
  strings: s,
  id,
  heading,
  stats,
  allLabel,
  allHref,
  needHref,
  categoryNames,
  plainLinks,
  categoryId,
  className,
}: CategoryPulseHeroProps) {
  const top = needs[0];
  if (!top) return null;
  const topCategory = categoryNames?.get(top.categoryId);
  const titleId = `${id}-title`;
  return (
    <section className={className ? `ia-pulse-hero ${className}` : "ia-pulse-hero"} id={id} aria-labelledby={titleId} data-pulse-embed={categoryId}>
      <header className="ia-pulse-hero__head">
        <h2 className="ia-pulse-hero__heading" id={titleId}>
          {heading}
        </h2>
        <p className="ia-pulse-hero__sub">
          <PulseFactList facts={[needsPhrase(locale, s, needs.length), aboutAppsPhrase(locale, s, stats.reviewCount, stats.appCount)]} />
        </p>
      </header>

      <PulseLink plain={plainLinks} href={needHref(top.id)} className="ia-pulse-hero__lead">
        <PulseGauge score={top.score} id={`pg-${id}-${top.id}`} className="ia-pulse-hero__gauge" />
        <span className="ia-pulse-hero__copy">
          <span className="ia-pulse-hero__eyebrow">{s.topPain}</span>
          <span className="ia-pulse-hero__title">{needText(top.title, locale)}</span>
          <span className="ia-pulse-hero__meta" aria-hidden="true">
            <PulseFactList
              facts={[<span key="level" className="ia-pulse-hero__level">{levelWord(s, top.score)}</span>, ...(topCategory ? [topCategory] : []), ...countsFacts(locale, s, top)]}
            />
          </span>
        </span>
        <span className="ia-pulse-kit-sr">
          {" "}
          {topCategory ? `${topCategory}. ` : null}
          {needAria(locale, s, top)}
        </span>
      </PulseLink>

      <PulseBarRows
        needs={needs.slice(1, PULSE_EMBED_LIMIT)}
        locale={locale}
        strings={s}
        href={needHref}
        plainLinks={plainLinks}
        categoryNames={categoryNames}
        className="ia-pulse-hero__rows"
      />

      <PulseLink plain={plainLinks} href={allHref} className="ia-pulse-hero__all">
        {allLabel}
        <span aria-hidden="true">{"\u00a0→"}</span>
      </PulseLink>
    </section>
  );
}
