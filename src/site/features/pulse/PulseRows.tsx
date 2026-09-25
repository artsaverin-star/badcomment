import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { PainMeter, PainValue } from "./PainMeter";
import { formatNumber, needText, painAria, PULSE_EMBED_LIMIT } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseNeed } from "./types";

// Compact need rows (SPEC «Встраивание»): the title (up to 2 lines) and, on the right, «7/10»
// over a mini scale ~64 wide; a tap opens the need. Used by «Пульс категории» and by «Ещё в
// категории» on a need page. Pure and server-rendered.

export function PulseRows({ needs, locale, strings: s }: { needs: readonly PulseNeed[]; locale: Locale; strings: PulseStrings }) {
  return (
    <ul className="ia-pulse-rows">
      {needs.map((need) => (
        <li key={need.id}>
          <Link href={routes.pulseNeed(locale, need.id)} prefetch={false} className="ia-pulse-row">
            <span className="ia-pulse-row__title">{needText(need.title, locale)}</span>
            <span className="ia-pulse-row__score">
              <PainValue score={need.score} />
              <PainMeter score={need.score} size="mini" />
            </span>
            <span className="ia-pulse-sr-only">{painAria(s, need.score)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * «Пульс категории»: up to 5 compact rows + «Все потребности категории (N)» → the filtered feed.
 * Renders nothing for a category without needs (the TOC entry uses the same test,
 * hasCategoryPulse). `needs` = categoryNeeds(data, categoryId).
 */
export function CategoryPulseView({ categoryId, needs, locale, strings: s }: { categoryId: string; needs: readonly PulseNeed[]; locale: Locale; strings: PulseStrings }) {
  if (!needs.length) return null;
  return (
    <section className="ia-pulse-embed" id="category-pulse" aria-labelledby="category-pulse-title" data-pulse-embed={categoryId}>
      <h2 className="ia-pulse-embed__title" id="category-pulse-title">
        {s.embedTitle}
      </h2>
      <p className="ia-pulse-embed__subtitle">{s.embedSubtitle}</p>
      <PulseRows needs={needs.slice(0, PULSE_EMBED_LIMIT)} locale={locale} strings={s} />
      <Link className="ia-pulse-embed__all" href={routes.pulse(locale, { category: categoryId })}>
        {format(s.embedAll, { count: formatNumber(locale, needs.length) })}
        <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
