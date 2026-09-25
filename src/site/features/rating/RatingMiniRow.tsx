import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { AppIcon } from "@/site/ui/AppIcon";
import { cx } from "@/site/ui/cx";
import { ScoreMeter } from "./score";
import { ratingStrings } from "./strings";

// A compact app line (spec 11 §3.7): the niche's Top-5 card (in-page anchors), the app page's
// alternatives and «В других рейтингах». Server. Returns the <li>; put the rows in
// `ul.ia-rt-minis` inside a `.ia-card--utility` (rating.css pads it 6 × 18 and draws the
// dividers, inset past the rank and icon).
//
//   <ul className="ia-rt-minis">
//     <RatingMiniRow href={`#app-${a.slug}`} rank={a.rank} icon={a.icon} iconEager title={a.short}
//                    meta={storeMetaText(L, a.storeAvg, a.ratings, s)} score={a.realScore} locale={L} />
//   </ul>
//
// Grid [rank 2.2ch] [icon 40] [title + meta] [small score]; one link, one tab stop. The rank is
// plain text (read before the name); the score is aria-hidden with its sentence in sr-only.
// No `rank` → no rank column; no `icon` prop (undefined) → no icon column; `icon={null}` keeps
// the column with an empty tile.

export function RatingMiniRow({
  href,
  rank,
  icon,
  iconEager = false,
  title,
  titleLang,
  meta,
  score,
  locale,
}: {
  href: string;
  rank?: number;
  icon?: string | null;
  iconEager?: boolean;
  title: string;
  /** `lang` of the title when it differs from the page (a niche name in «В других рейтингах»). */
  titleLang?: string;
  meta?: string;
  score: number | null;
  locale: Locale;
}) {
  const s = ratingStrings[locale];
  const className = cx("ia-rt-mini", rank === undefined && "ia-rt-mini--norank", icon === undefined && "ia-rt-mini--noicon");
  const body = (
    <>
      {rank !== undefined ? <span className="ia-rt-mini__rank">{rank}</span> : null}
      {icon !== undefined ? <AppIcon path={icon} size={40} eager={iconEager} className="ia-rt-mini__icon" /> : null}
      <span className="ia-rt-mini__text">
        <span className="ia-rt-mini__title" lang={titleLang}>
          {title}
        </span>
        {meta ? <span className="ia-rt-mini__meta">{meta}</span> : null}
      </span>
      <ScoreMeter score={score} size="sm" />
      {score !== null ? <span className="sr-only">{format(s.scoreA11y, { score })}</span> : null}
    </>
  );
  // In-page anchors («#app-hevy…») stay plain links: the niche list listens for them.
  return (
    <li>
      {href.startsWith("#") ? (
        <a className={className} href={href}>
          {body}
        </a>
      ) : (
        <Link className={className} href={href}>
          {body}
        </Link>
      )}
    </li>
  );
}
