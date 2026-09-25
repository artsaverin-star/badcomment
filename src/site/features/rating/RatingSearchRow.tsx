"use client";

import Link from "next/link";
import { useLocale, useWeb } from "@/site/i18n/client";
import { format } from "@/site/i18n/translate";
import { AppIcon } from "@/site/ui/AppIcon";
import { formatNodes, starText } from "./format";
import { ScoreMeter } from "./score";
import type { RatingClientStrings } from "./strings";
import { displayTitle } from "./text";

// One result of the catalogue search (spec 11 §3.10). Client (RatingCatalog renders it); reads
// the page locale and `useWeb<RatingClientStrings>("rating")`.
//
//   <ol className="ia-stack">{hits.map((hit) =>
//     <RatingSearchRow key={`${hit.niche}/${hit.slug}`} hit={hit} href={routes.ratingApp(L, hit.niche, hit.slug)} />)}</ol>
//
// One card link: icon 44, the store title (2 lines), «Привычки · № 2 · 4,8★», the summary
// (2 lines), the review score with its meter (aria-hidden; the sentence is in sr-only).

/** The fields a search row reads (RatingCatalog's RatingSearchHit satisfies it). */
export type RatingSearchRowHit = {
  niche: string;
  nicheName: string;
  nicheLang: string;
  slug: string;
  title: string;
  realScore: number | null;
  storeAvg: number | null;
  /** The app's rank in that niche. */
  rank: number;
  icon: string | null;
  summary: string | null;
  summaryLang: string;
};

export function RatingSearchRow({ hit, href }: { hit: RatingSearchRowHit; href: string }) {
  const locale = useLocale();
  const s = useWeb<RatingClientStrings>("rating");
  const star = hit.storeAvg !== null && hit.storeAvg > 0 ? starText(locale, hit.storeAvg) : "";
  // Without a store average the «· {star}» part goes, separator included.
  const template = star ? s.searchContext : s.searchContext.replace(/\s*[·・]\s*\{star\}/u, "");
  const niche = hit.nicheLang === locale ? hit.nicheName : <span lang={hit.nicheLang}>{hit.nicheName}</span>;
  return (
    <li>
      <Link className="ia-card ia-card--utility ia-row-card ia-rt-hit" href={href}>
        <AppIcon path={hit.icon} size={44} className="ia-rt-hit__icon" />
        <div className="ia-rt-hit__text">
          <h3 className="ia-rt-hit__title">{displayTitle(hit.title)}</h3>
          <p className="ia-rt-hit__context">{formatNodes(template, { niche, rank: hit.rank, star })}</p>
          {hit.summary ? (
            <p className="ia-rt-hit__summary" lang={hit.summaryLang === locale ? undefined : hit.summaryLang}>
              {hit.summary}
            </p>
          ) : null}
        </div>
        <ScoreMeter score={hit.realScore} size="md" unit={s.outOf100} className="ia-rt-hit__score" />
        {hit.realScore !== null ? <span className="sr-only">{format(s.scoreA11y, { score: hit.realScore })}</span> : null}
      </Link>
    </li>
  );
}
