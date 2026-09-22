import { format } from "@/site/i18n/strings";
import { INTL_LOCALE, toOldLocale, type Locale } from "@/site/i18n/locales";
import { getTopicApps, oldLinksInEnglish, oldTopicHref, reviewsHubHref, type TopicApp, type TopicApps } from "@/site/sitedata";
import { APP_STORE_BADGE_SRC } from "@/site/config";
import { ArrowRightIcon } from "@/site/ui";
import { AppPromo } from "./AppPromo";
import { ShowMoreList } from "./ShowMoreList";
import { researchStrings, type ResearchStrings } from "./strings";

// Site-only blocks of every topic page, readable or locked (DECISIONS §3: the web may name
// competitor apps and show their icons; the app may not): «Приложения в этой теме» from the
// old site's App Store snapshot (container id="main-players" and the App Store badge art are
// asserted by the CI smoke tests), links into the old site (per-app pages, reviews, the
// previous version of the breakdown) and the App Store promo. Public data only.

const INITIAL_APPS = 8;

/** Intl formatters, built once per locale (they are costly to construct; review performance P14). */
type Formats = {
  number: Intl.NumberFormat;
  compact: Intl.NumberFormat;
  rating: Intl.NumberFormat;
  plural: Intl.PluralRules;
  date: Intl.DateTimeFormat;
  region: Intl.DisplayNames | null;
};
const formatsCache = new Map<Locale, Formats>();

function formats(locale: Locale): Formats {
  const hit = formatsCache.get(locale);
  if (hit) return hit;
  const intl = INTL_LOCALE[locale];
  let region: Intl.DisplayNames | null = null;
  try {
    region = new Intl.DisplayNames([intl], { type: "region" });
  } catch {
    region = null;
  }
  const made: Formats = {
    number: new Intl.NumberFormat(intl),
    compact: new Intl.NumberFormat(intl, { notation: "compact", maximumFractionDigits: 1 }),
    rating: new Intl.NumberFormat(intl, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
    plural: new Intl.PluralRules(intl),
    date: new Intl.DateTimeFormat(intl, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    region,
  };
  formatsCache.set(locale, made);
  return made;
}

function ratingCountText(s: ResearchStrings, locale: Locale, n: number): string {
  const f = formats(locale);
  if (n >= 10_000) {
    // "1,2 млн оценок", "1.2M ratings", "120万件の評価"
    const compact = f.compact.format(n);
    return locale === "ja" ? `${compact}${s.ratingsOther}` : `${compact} ${locale === "ru" ? s.ratingsMany : s.ratingsOther}`;
  }
  const category = f.plural.select(n);
  const word =
    category === "one" ? s.ratingsOne : category === "few" ? s.ratingsFew : category === "many" ? s.ratingsMany : s.ratingsOther;
  const num = f.number.format(n);
  return locale === "ja" ? `${num}${word}` : `${num} ${word}`;
}

/** The inside of one row; ShowMoreList renders the <li className="ia-rs-app">. */
function AppRow({ app, s, locale, oldLang }: { app: TopicApp; s: ResearchStrings; locale: Locale; oldLang: string }) {
  const rating = app.averageRating === null ? null : formats(locale).rating.format(app.averageRating);
  const hrefLang = oldLang === locale ? undefined : oldLang;
  return (
    <>
      {/* Remote App Store icon (public store data), decorative. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ia-rs-app__icon"
        src={app.iconUrl}
        alt=""
        width={48}
        height={48}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
      />
      <div className="ia-rs-app__main">
        <h3 className="ia-rs-app__name">{app.name}</h3>
        <p className="ia-rs-app__meta">
          {app.developer ? <span className="ia-rs-app__dev">{app.developer}</span> : null}
          <span>
            {rating !== null ? (
              <span role="img" aria-label={format(s.ratingLabel, { rating })}>
                {rating} ★
              </span>
            ) : null}
            {rating !== null ? " · " : null}
            {app.ratingCount === null ? s.noRating : ratingCountText(s, locale, app.ratingCount)}
          </span>
        </p>
      </div>
      <div className="ia-rs-app__actions">
        <a
          className="ia-rs-app__store"
          data-app-id={app.appStoreId}
          href={app.storeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={format(s.appStoreLink, { name: app.name })}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static SVG badge */}
          <img src={APP_STORE_BADGE_SRC} alt="" width={120} height={40} />
        </a>
        {app.pageHref ? (
          <a
            className="ia-rs-app__link"
            href={app.pageHref}
            hrefLang={hrefLang}
            aria-label={format(s.appPageLabel, { name: app.name })}
          >
            {s.appPage}
          </a>
        ) : null}
        {app.reviewsHref ? (
          <a
            className="ia-rs-app__link"
            href={app.reviewsHref}
            hrefLang={hrefLang}
            aria-label={format(s.appReviewsLabel, { name: app.name })}
          >
            {s.appReviews}
          </a>
        ) : null}
      </div>
    </>
  );
}

function AppsSection({
  data,
  locale,
  s,
  hubHref,
}: {
  data: TopicApps;
  locale: Locale;
  s: ResearchStrings;
  hubHref: string | null;
}) {
  const f = formats(locale);
  const oldLang = toOldLocale(locale);
  const store = data.store.toUpperCase();
  const region = (() => {
    try {
      return f.region?.of(store) ?? store;
    } catch {
      return store;
    }
  })();
  const date = f.date.format(new Date(data.collectedAt));
  // Every row goes into the HTML; ShowMoreList hides the ones past the first page.
  const rows = data.apps.map((app) => ({
    key: app.appStoreId,
    content: <AppRow app={app} s={s} locale={locale} oldLang={oldLang} />,
  }));
  const english = oldLinksInEnglish(locale) && s.englishNote;

  return (
    <section id="main-players" className="ia-rs-apps ia-rs-anchor" aria-labelledby="main-players-heading">
      <h2 id="main-players-heading" className="ia-rs-section__title">
        {s.appsTitle}
      </h2>
      <p className="ia-rs-apps__lead">{format(s.appsLead, { term: data.term })}</p>
      <ShowMoreList
        items={rows}
        initial={INITIAL_APPS}
        step={INITIAL_APPS}
        moreTemplate={s.appsShowMore}
        label={s.appsListLabel}
        className="ia-rs-apps__list"
        itemClassName="ia-rs-app"
        buttonClassName="ia-rs-apps__more-btn"
      />
      <p className="ia-rs-apps__source">{format(s.appsSource, { region, date })}</p>
      {hubHref ? (
        <ul className="ia-rs-links">
          <li>
            <a href={hubHref} hrefLang={oldLang === locale ? undefined : oldLang}>
              {s.allReviews}
              {english ? <span className="ia-rs-links__note">{english}</span> : null}
              <ArrowRightIcon size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          </li>
        </ul>
      ) : null}
    </section>
  );
}

export function TopicExtras({ locale, slug }: { locale: Locale; slug: string }) {
  const s = researchStrings[locale];
  const apps = getTopicApps(locale, slug);
  const hub = reviewsHubHref(locale, slug);
  const old = oldTopicHref(locale, slug);
  const oldLang = toOldLocale(locale);
  const english = oldLinksInEnglish(locale) && s.englishNote;
  return (
    <div className="ia-rs-extras">
      {apps ? <AppsSection data={apps} locale={locale} s={s} hubHref={hub} /> : null}
      <AppPromo locale={locale} />
      {old ? (
        <ul className="ia-rs-links">
          <li>
            {/* The previous site (another root layout): a plain link. */}
            <a className="ia-rs-old-link" href={old} hrefLang={oldLang === locale ? undefined : oldLang}>
              {s.oldVersion}
              {english ? <span className="ia-rs-links__note">{english}</span> : null}
            </a>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
