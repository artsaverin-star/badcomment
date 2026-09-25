import Link from "next/link";
import { counted } from "@/site/i18n/count";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/translate";
import { AppIcon } from "@/site/ui/AppIcon";
import { Badge } from "@/site/ui/Badge";
import { cx } from "@/site/ui/cx";
import { formatNodes, starText } from "./format";
import { RatingShots } from "./RatingShots";
import { RatingStage } from "./RatingStage";
import { RankMark, ScoreMeter } from "./score";
import { ratingStrings, type RatingStrings } from "./strings";
import { displayTitle } from "./text";

// One app of a ranked list (spec 11 §3.6). Server. Returns the <li> — put it in an
// `ol.ia-rt-list` (the list is the container the layout measures: narrow < 600 px ≤ wide).
//
//   <ol className="ia-rt-list" start={4}>{rows}</ol>               variant="row": № 4+, task and search contexts
//   <ol className="ia-rt-list ia-rt-list--leaders">{leaders}</ol>   variant="leader": № 1–3
//
//   <RatingAppCard app={a} href={routes.ratingApp(L, niche, a.slug)} locale={L} dataLang={textLang} variant="row" />
//
// Row: rank, icon, the store title (the link, stretched over the card), App Store star and
// count, the review score with its meter, the first 3 screenshots (their own link to the
// gallery), the verdict, and «Хвалят» / «Жалуются» / «Кому» with CSS glyphs. Everything is in
// the DOM (RR6: only CSS clamps), one tab stop (the title), ≤ 26 elements. The narrow rank label
// «№ 4» comes from CSS: the list sets `style={rankVars(s.rankShort)}` once (score.tsx). Ranks
// ≥ 11 render lazily (content-visibility). Titles print without a dangling separator of a cut-off
// store title (text.ts displayTitle).
// Leader: the research-card chrome (radius 28, shadow, 0.7 stroke) with a screenshot stage on
// top, an accent rank badge, the Georgia title, the large score, the full verdict, praise and
// complaints as a pair of insets and the «Кому» note; the title's link stretches over the body.
// A text that is null is not rendered; the star or the count is dropped when missing or zero.

/** The app fields a card reads (sitedata RatingAppEntry satisfies it). */
export type RatingCardApp = {
  slug: string;
  /** Store title, verbatim (the heading). */
  title: string;
  /** Short display name (alts, labels). */
  short: string;
  /** 1-based rank in the niche (raw data index + 1). */
  rank: number;
  icon: string | null;
  shots: readonly string[];
  realScore: number | null;
  storeAvg: number | null;
  ratings: number;
  verdict: string | null;
  loved: string | null;
  weak: string | null;
  whoFor: string | null;
};

/** Rows from this rank on skip rendering while off-screen (content-visibility: auto). */
const DEFER_FROM = 11;

/**
 * `lang` only when the text's language differs from the page's (de/fr/ja pages print English
 * data). A `lang={undefined}` prop would still travel in the RSC payload, 7 times per row.
 */
function langAttr(lang: string | undefined): { lang?: string } {
  return lang ? { lang } : {};
}

export function RatingAppCard({
  app,
  href,
  locale,
  dataLang,
  variant,
  eager = false,
}: {
  app: RatingCardApp;
  /** routes.ratingApp(L, niche, app.slug). */
  href: string;
  locale: Locale;
  /** `lang` of the texts on de/fr/ja pages ("en"); undefined when it is the page's. */
  dataLang?: string;
  variant: "row" | "leader";
  /** Icon eagerly (leader №1 also: its first 3 stage shots). */
  eager?: boolean;
}) {
  const s = ratingStrings[locale];
  const titleId = `${app.slug}-t`;
  return variant === "leader" ? (
    <li id={`app-${app.slug}`} data-slug={app.slug} className="ia-rt-lead-item">
      <article className="ia-card ia-card--research ia-rt-lead" aria-labelledby={titleId}>
        <RatingStage paths={app.shots} href={href} app={displayTitle(app.short)} icon={app.icon} locale={locale} eager={eager} />
        <div className="ia-rt-lead__body">
          <div className="ia-rt-lead__head">
            <AppIcon path={app.icon} size={64} eager={eager} className="ia-rt-lead__icon" />
            <Badge tone="accent" className="ia-rt-lead__badge">
              {format(s.rankBadge, { n: app.rank })}
            </Badge>
            <h3 id={titleId} className="ia-rt-lead__title">
              <Link className="ia-rt-card__link" href={href}>
                {displayTitle(app.title)}
              </Link>
            </h3>
            <Meta app={app} locale={locale} s={s} withRank={false} />
            <ScoreMeter score={app.realScore} size="lg" unit={s.outOf100} className="ia-rt-lead__score" />
          </div>
          {app.verdict ? (
            <p className="ia-rt-lead__verdict" {...langAttr(dataLang)}>
              {app.verdict}
            </p>
          ) : null}
          {app.loved || app.weak ? (
            <div className="ia-rt-pcs">
              {app.loved ? (
                <div className="ia-rt-pc ia-rt-pc--plus">
                  <p className="ia-rt-pc__label">{bare(s.praised)}</p>
                  <p className="ia-rt-pc__text" {...langAttr(dataLang)}>
                    {app.loved}
                  </p>
                </div>
              ) : null}
              {app.weak ? (
                <div className="ia-rt-pc ia-rt-pc--minus">
                  <p className="ia-rt-pc__label">{bare(s.complained)}</p>
                  <p className="ia-rt-pc__text" {...langAttr(dataLang)}>
                    {app.weak}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          {app.whoFor ? <Note kind="for" label={s.forWhom} text={app.whoFor} locale={locale} dataLang={dataLang} /> : null}
          <span className="ia-rt-lead__more" aria-hidden="true">
            {s.openApp}
          </span>
        </div>
      </article>
    </li>
  ) : (
    <li id={`app-${app.slug}`} data-slug={app.slug} className={cx("ia-rt-item", app.rank >= DEFER_FROM && "ia-rt-item--defer")}>
      <article className={cx("ia-card ia-card--utility ia-rt-card", app.shots.length === 0 && "ia-rt-card--noshots")} aria-labelledby={titleId}>
        <div className="ia-rt-card__head">
          <RankMark rank={app.rank} />
          <AppIcon path={app.icon} size={56} eager={eager} className="ia-rt-card__icon" />
          <h3 id={titleId} className="ia-rt-card__title">
            <Link className="ia-rt-card__link" href={href}>
              {displayTitle(app.title)}
            </Link>
          </h3>
          <Meta app={app} locale={locale} s={s} withRank />
          <ScoreMeter score={app.realScore} size="md" unit={s.outOf100} className="ia-rt-card__score" />
        </div>
        <RatingShots paths={app.shots} href={href} app={displayTitle(app.short)} locale={locale} />
        {app.verdict ? (
          <p className="ia-rt-card__verdict" {...langAttr(dataLang)}>
            {app.verdict}
          </p>
        ) : null}
        {app.loved ? <Note kind="plus" label={s.praised} text={app.loved} locale={locale} dataLang={dataLang} /> : null}
        {app.weak ? <Note kind="minus" label={s.complained} text={app.weak} locale={locale} dataLang={dataLang} /> : null}
        {app.whoFor ? <Note kind="for" label={s.forWhom} text={app.whoFor} locale={locale} dataLang={dataLang} /> : null}
      </article>
    </li>
  );
}

/**
 * «4,8★ · 12 345 оценок» with the accessible sentence first (the rank mark and the score are
 * aria-hidden): «Место 4. Оценка по отзывам: 84 из 100. Оценка в App Store: 4,8★ · …».
 */
function Meta({ app, locale, s, withRank }: { app: RatingCardApp; locale: Locale; s: RatingStrings; withRank: boolean }) {
  const star = app.storeAvg !== null && app.storeAvg > 0 ? starText(locale, app.storeAvg) : "";
  const count = app.ratings > 0 ? counted(locale, app.ratings, s.ratingsWord) : "";
  const sr = [
    withRank ? format(s.rankA11y, { n: app.rank }) : "",
    app.realScore !== null ? format(s.scoreA11y, { score: app.realScore }) : "",
    star || count ? s.storeA11y : "",
  ]
    .filter(Boolean)
    .join(locale === "ja" ? "。" : ". ");
  const starNode = <span className="ia-rt-meta__star">{star}</span>;
  const countNode = <span className="ia-rt-meta__count">{count}</span>;
  return (
    <p className="ia-rt-meta">
      <span className="sr-only">{sr} </span>
      {star && count
        ? formatNodes(s.storeMeta, { star: starNode, ratings: countNode })
        : star
          ? starNode
          : count
            ? countNode
            : null}
    </p>
  );
}

/** «Хвалят: …» with its glyph (CSS). The label is in the page language, the text in the data's. */
function Note({
  kind,
  label,
  text,
  locale,
  dataLang,
}: {
  kind: "plus" | "minus" | "for";
  label: string;
  text: string;
  locale: Locale;
  dataLang?: string;
}) {
  return (
    <p className={`ia-rt-note ia-rt-note--${kind}`} {...langAttr(dataLang)}>
      {/* ja labels end in a full-width colon, which carries its own space. */}
      <strong {...langAttr(dataLang && locale)}>{label}</strong>
      {locale === "ja" ? "" : " "}
      {text}
    </p>
  );
}

/** «Хвалят:» → «Хвалят» for the leader's inset titles (fr « : » and ja «：» too). */
function bare(label: string): string {
  return label.replace(/\s*[:：]$/u, "");
}
