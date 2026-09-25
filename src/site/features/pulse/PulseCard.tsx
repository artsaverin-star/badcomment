import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { PainMeter, PainValue } from "./PainMeter";
import { countsLine, kindLabel, needText, painAria } from "./query";
import type { PulseStrings } from "./strings";
import type { PulseNeed } from "./types";

// The minimal Pulse card (SPEC «Карточка»), top to bottom: grey category pill with the grey kind
// label on the right; the title; «Боль» on the left and a big «7» + grey «/10» on the right; the
// 10-segment scale; the grey line «267 отзывов · в 67 из 100 приложений». The whole card is one
// link to the need. Server-rendered, no client JS. Screen readers get «Боль 7 из 10.» as text.

export function PulseCard({ need, categoryName, locale, strings: s }: { need: PulseNeed; categoryName: string; locale: Locale; strings: PulseStrings }) {
  return (
    <Link href={routes.pulseNeed(locale, need.id)} prefetch={false} className="ia-pulse-card" data-kind={need.kind}>
      <span className="ia-pulse-card__meta">
        <span className="ia-pulse-pill">{categoryName}</span>
        <span className="ia-pulse-kind">{kindLabel(s, need.kind)}</span>
      </span>
      <h2 className="ia-pulse-card__title">{needText(need.title, locale)}</h2>
      <span className="ia-pulse-score">
        <span className="ia-pulse-score__label" aria-hidden="true">
          {s.pain}
        </span>
        <PainValue score={need.score} className="ia-pulse-score__value" />
        <span className="ia-pulse-sr-only">{painAria(s, need.score)}</span>
      </span>
      <PainMeter score={need.score} />
      <span className="ia-pulse-card__counts">{countsLine(locale, s, need)}</span>
    </Link>
  );
}
