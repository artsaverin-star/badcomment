import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { PulseFactList, PulseGauge, PulseLevel } from "./PulseGauge";
import { countsFacts, needAria, needText, type PulseCardNeed, type PulseCardStrings } from "./query";

// The feed card (direction A «Прибор», owner 2026-09-25), top to bottom: the category as small
// secondary text; the title (≤ 3 lines); flexible space; the gauge with the number inside and,
// to its right, the word level over «боль 7 из 10»; a hairline; «267 отзывов · в 67 из 100
// приложений». No kind label («это мусор»). The whole card is one link; no client JS of its
// own. Screen readers get «Боль 7 из 10, сильная. 267 отзывов, в 67 из 100 приложений.».
// The feed's first page renders it on the server; the pages the feed loads by itself
// (PulseFeed) render the same component on the client from the slim PulseCardNeed of
// GET /api/site/pulse — so it takes only what a card shows and only the strings it reads.

export function PulseCard({ need, categoryName, locale, strings: s }: { need: PulseCardNeed; categoryName: string; locale: Locale; strings: PulseCardStrings }) {
  return (
    <Link href={routes.pulseNeed(locale, need.id)} prefetch={false} className="ia-pulse-card">
      <span className="ia-pulse-card__category">{categoryName}</span>
      <h2 className="ia-pulse-card__title">{needText(need.title, locale)}</h2>
      <span className="ia-pulse-card__gauge">
        <PulseGauge score={need.score} id={`pg-${need.id}`} />
        <PulseLevel score={need.score} strings={s} />
      </span>
      <span className="ia-pulse-card__counts" aria-hidden="true">
        <PulseFactList facts={countsFacts(locale, s, need)} />
      </span>
      <span className="ia-pulse-sr-only">{needAria(locale, s, need)}</span>
    </Link>
  );
}
