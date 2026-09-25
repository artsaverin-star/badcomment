import Link from "next/link";
import { counted } from "@/site/i18n/count";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { AppIcon } from "@/site/ui/AppIcon";
import { formatNodes } from "./format";
import { dataLang } from "./seo";
import { ratingStrings } from "./strings";
import { displayTitle } from "./text";

// One niche as a card (spec 11 §3.8). Server. Returns the <li>; the whole card is one link.
//
//   <ul className="ia-grid ia-rt-niches">{cards.map((c, i) =>
//     <RatingNicheCard key={c.slug} niche={c} locale={L} variant="full" eager={i < 6} />)}</ul>   catalogue
//   <ul className="ia-rt-related">… variant="compact" …</ul>                                       «Похожие темы»
//
// full: an App Library–style folder of the top-4 icons, the topic name (Georgia 22/27), the
// intro, «93 приложения · 31 241 отзыв» and the leader line «Лидер: Hevy — 91 из 100».
// compact: a smaller folder, the name (17/22 600) and the counts.
// The counts wrap as two wholes, and a wrapped second line loses its «·» (rating.css); in the
// one-line leader line only the app name gives way (ellipsis), never the score.

/** The niche fields a card reads (sitedata RatingNicheCard satisfies it). */
export type RatingNicheCardData = {
  slug: string;
  /** The topic name and its language. */
  name: string;
  nameLang: string;
  count: number;
  totalReviews: number;
  /** One editorial sentence in the data language; null = none. */
  intro: string | null;
  /** Ranks 1–4 (folder; the first is the leader line). */
  leaders: readonly { short: string; icon: string | null; realScore: number | null }[];
};

export function RatingNicheCard({
  niche,
  locale,
  variant,
  eager = false,
}: {
  niche: RatingNicheCardData;
  locale: Locale;
  variant: "full" | "compact";
  /** Folder icons eagerly (the first cards of the catalogue). */
  eager?: boolean;
}) {
  const s = ratingStrings[locale];
  const full = variant === "full";
  const leader = niche.leaders[0];
  const apps = counted(locale, niche.count, s.appsWord);
  const reviews = counted(locale, niche.totalReviews, s.reviewsWord);
  // «{apps} · {reviews}» → the separator between the two parts (every locale has this shape).
  const sep = /^\{apps\}(.+)\{reviews\}$/u.exec(s.nicheCardMeta)?.[1].trim();
  return (
    <li>
      <Link className={`ia-card ia-card--utility ia-row-card ia-rt-niche ia-rt-niche--${variant}`} href={routes.ratingNiche(locale, niche.slug)}>
        <div className="ia-rt-folder" aria-hidden="true">
          {niche.leaders.slice(0, 4).map((app, i) => (
            <AppIcon key={i} path={app.icon} size={full ? 33 : 24} eager={eager} />
          ))}
        </div>
        <div className="ia-rt-niche__text">
          <h3 className="ia-rt-niche__name" lang={niche.nameLang === locale ? undefined : niche.nameLang}>
            {niche.name}
          </h3>
          {full && niche.intro ? (
            <p className="ia-rt-niche__intro" lang={dataLang(locale)}>
              {niche.intro}
            </p>
          ) : null}
          {sep ? (
            <p className="ia-rt-niche__meta">
              <span>{apps}</span>
              <span>
                <span className="ia-rt-niche__sep" aria-hidden="true">
                  {sep}
                </span>
                {reviews}
              </span>
            </p>
          ) : (
            <p className="ia-rt-niche__meta">{format(s.nicheCardMeta, { apps, reviews })}</p>
          )}
          {full && leader && leader.realScore !== null ? (
            <p className="ia-rt-niche__leader">
              {formatNodes(s.leaderLine, {
                app: <span className="ia-rt-niche__leader-app">{displayTitle(leader.short)}</span>,
                score: leader.realScore,
              })}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
