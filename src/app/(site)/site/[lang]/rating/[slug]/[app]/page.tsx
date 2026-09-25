import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { countWord, counted } from "@/site/i18n/count";
import { formatNodes, reviewScoreValue, storeMetaText, storeScoreValue } from "@/site/features/rating/format";
import { RATING_UI_KEYS } from "@/site/features/rating/keys";
import { MZ_ORIGIN } from "@/site/features/rating/media";
import { RatingGallery } from "@/site/features/rating/RatingGallery";
import { RatingImageGuard } from "@/site/features/rating/RatingImageGuard";
import { RatingMiniRow } from "@/site/features/rating/RatingMiniRow";
import { RatingTaskList } from "@/site/features/rating/RatingTaskList";
import { appJsonLd } from "@/site/features/rating/schema";
import { ScoreMeter } from "@/site/features/rating/score";
import { appDescription, appTitle, dataAlternates, dataLang } from "@/site/features/rating/seo";
import { ratingClientStrings, ratingStrings } from "@/site/features/rating/strings";
import { displayTitle, points } from "@/site/features/rating/text";
import "@/site/features/rating/rating.css";
import { OG_LOCALE, TOPIC_ROBOTS, jsonLd, withBrand } from "@/site/features/research/seo";
import { reviewsStrings } from "@/site/features/reviews/strings";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { appTasks, getRatingApp, nicheNeighbours, ratingAppNiches, ratingShareImage } from "@/site/sitedata/rating";
import { nicheTopicLink } from "@/site/sitedata/topics";
import {
  AppIcon,
  BackButton,
  Button,
  Card,
  ComplaintIcon,
  DetailToolbar,
  ExternalIcon,
  Heading,
  PraiseIcon,
  QuoteBlock,
  RatingIcon,
  ReviewsIcon,
  ROW_GLYPH,
  RowCard,
  SourceIcon,
} from "@/site/ui";

// One app of the rating (/<L>/rating/<niche>/<app>; spec 11 §4.3): the app's ClarityAppViewContent
// (ClarityRatings.swift:234-333) made visual. The icon hero (the store title as the H1, its place
// in the niche as the link back), the facts strip (review score, App Store star and count, reviews
// read), «Открыть в App Store», the editorial verdict inset, the screenshot gallery with its
// viewer, «Для каких задач используют», praise and complaints as a pair of cards (one point per
// sentence), every quote, the tasks that name the app, 5 alternatives from the niche, the same
// app in its other rankings, then the rows to the research, the reviews and the footnote.
// PUBLIC (spec 11 D2): nothing here reads the viewer — quotes included; do not add a gate back.
// Artwork is the rating's own (D1: App Store icons and screenshots from Apple's CDN, web only).
// JSON-LD: MobileApplication with inApp's editorial Review on the 0–100 scale; no App Store
// aggregateRating (features/rating/schema.ts). No bookmark: the web library has no «app» kind.

type Props = { params: Promise<{ lang: string; slug: string; app: string }> };

/** Route params can arrive percent-encoded through the locale rewrite (Cyrillic look-alikes in titles). */
function param(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, app } = await params;
  if (!isLocale(lang)) return {};
  const found = getRatingApp(lang, slug, param(app));
  if (!found) return {};
  const a = found.app;
  // An app rated in 2+ niches has a page in each: the niche keeps the <title>s unique.
  const title = appTitle(lang, a, found.niche, ratingAppNiches(lang, a.id).length);
  const description = appDescription(lang, a);
  const alternates = dataAlternates(lang, `rating/${slug}/${a.slug}`);
  // The generic rating card on purpose: the niche card names the niche's leader app and its
  // score, which would mislead on another app's page (per-app cards: spec 11 §11).
  const image = ratingShareImage(lang);
  return {
    title,
    description,
    alternates,
    robots: TOPIC_ROBOTS,
    openGraph: {
      type: "article",
      siteName: "inApp",
      title: withBrand(title, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
      images: [image],
    },
    twitter: { card: "summary_large_image", title: withBrand(title, lang), description, images: [image] },
  };
}

export default async function RatingAppPage({ params }: Props) {
  const { lang, slug, app: appParam } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const found = getRatingApp(locale, slug, param(appParam));
  if (!found) notFound();
  preconnect(MZ_ORIGIN);
  const { niche, app } = found;
  const t = await getT(locale);
  const s = ratingStrings[locale];
  const rs = reviewsStrings[locale];
  const textLang = dataLang(locale);
  const langOf = (l: Locale) => (l === locale ? undefined : l);
  const topic = nicheTopicLink(locale, slug);
  const nicheHref = routes.ratingNiche(locale, slug);
  const nicheName = niche.nameLang === locale ? niche.name : <span lang={niche.nameLang}>{niche.name}</span>;
  const tasks = appTasks(niche, app.id);
  const neighbours = nicheNeighbours(niche, app);
  const otherNiches = ratingAppNiches(locale, app.id).filter((n) => n.niche !== slug);
  const quotes = app.quotes;
  // «Что хвалят» / «На что жалуются»: a card per text that exists, its sentences as points.
  const pair = [
    { id: "rating-loved", title: t("Что хвалят в отзывах"), text: app.loved, Icon: PraiseIcon },
    { id: "rating-weak", title: t("На что жалуются в отзывах"), text: app.weak, Icon: ComplaintIcon },
  ].flatMap(({ text, ...card }) => (text ? [{ ...card, text, points: points(text, niche.dataLang) }] : []));

  return (
    <>
      <RatingImageGuard />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(appJsonLd(locale, t, niche, app)) }} />
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={nicheHref} />}
        title={t("Приложение")}
      />
      <div className="ia-page ia-page--catalog ia-page--stack ia-page--stack-24">
        <div className="ia-rt-hero">
          {/* Drawn at 96, shown at 72 below 760 (rating.css). */}
          <AppIcon path={app.icon} size={96} eager alt={format(s.iconAlt, { app: displayTitle(app.short) })} />
          <Heading
            className="ia-heading--fixed"
            title={displayTitle(app.title)}
            subtitle={
              <Link className="ia-rt-hero__niche" href={nicheHref}>
                {formatNodes(s.heroRank, { rank: app.rank, count: niche.count, niche: nicheName })}
              </Link>
            }
          />
        </div>
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}

        {/* Facts: the review score (ClarityAppMetric :425-434), the store star, the store count and
            the reviews read; the last cell is left out when unknown (3 cells). */}
        <ul className="ia-rt-facts">
          <li>
            <ScoreMeter score={app.realScore} size="md" />
            <span className="ia-rt-facts__label">
              <span className="sr-only">{reviewScoreValue(app.realScore)} </span>
              {t("из 100 · отзывы")}
            </span>
          </li>
          <li>
            <span className="ia-rt-facts__value">{storeScoreValue(locale, app.storeAvg)}</span>
            <span className="ia-rt-facts__label">{t("из 5 · магазин")}</span>
          </li>
          <li>
            <span className="ia-rt-facts__value">{t.number(app.ratings)}</span>
            <span className="ia-rt-facts__label">{countWord(locale, app.ratings, s.ratingsLabelWord)}</span>
          </li>
          {app.reviewsRead !== null ? (
            <li>
              <span className="ia-rt-facts__value">{t.number(app.reviewsRead)}</span>
              <span className="ia-rt-facts__label">{countWord(locale, app.reviewsRead, s.reviewsReadLabelWord)}</span>
            </li>
          ) : null}
        </ul>

        {/^\d+$/.test(app.id) ? (
          <div className="ia-rt-actions">
            <Button
              variant="ink"
              href={`https://apps.apple.com/app/id${app.id}`}
              external
              target="_blank"
              rel="noopener noreferrer"
              icon={<ExternalIcon size={18} strokeWidth={2.2} aria-hidden="true" />}
            >
              {t("Открыть в App Store")}
              <span className="sr-only"> {s.newTab}</span>
            </Button>
          </div>
        ) : null}

        {app.verdict ? (
          <section className="ia-rt-inset">
            <p className="ia-footnote">{t("Редакционный анализ сохранённых отзывов")}</p>
            <p className="ia-rt-inset__text" lang={textLang}>
              {app.verdict}
            </p>
          </section>
        ) : null}

        {app.shots.length > 0 ? (
          <section id="screenshots" className="ia-rt-section" aria-labelledby="rating-shots-title">
            <div className="ia-section-head">
              <h2 id="rating-shots-title" className="ia-section-title ia-section-title--bold">
                {s.shotsTitle}
              </h2>
              <span className="ia-section-head__count" aria-hidden="true">
                {t.number(app.shots.length)}
              </span>
            </div>
            <I18nProvider locale={locale} strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(locale) }}>
              <RatingGallery paths={app.shots} app={displayTitle(app.short)} />
            </I18nProvider>
          </section>
        ) : null}

        {app.whoFor ? (
          <section className="ia-rt-section" aria-labelledby="rating-whofor">
            <h2 id="rating-whofor" className="ia-section-title ia-section-title--bold">
              {t("Для каких задач используют")}
            </h2>
            <p className="ia-rt-prose" lang={textLang}>
              {app.whoFor}
            </p>
          </section>
        ) : null}

        {pair.length > 0 ? (
          <div className="ia-rt-pair">
            {pair.map(({ id, title, text, points: list, Icon }) => (
              <Card key={id} as="section" aria-labelledby={id}>
                <div className="ia-rt-pair__head">
                  <span className="ia-rt-pair__icon" aria-hidden="true">
                    <Icon size={18} strokeWidth={2} />
                  </span>
                  <h2 id={id} className="ia-subheading">
                    {title}
                  </h2>
                </div>
                {list.length > 1 ? (
                  <ul className="ia-rt-bullets" lang={textLang}>
                    {list.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="ia-rt-prose" lang={textLang}>
                    {text}
                  </p>
                )}
              </Card>
            ))}
          </div>
        ) : null}

        {quotes.length > 0 ? (
          <section className="ia-rt-proof" aria-labelledby="rating-proof-title">
            <h2 id="rating-proof-title" className="ia-section-title ia-section-title--bold">
              {t("Опыт пользователей")}
            </h2>
            {/* W2: the app key «%1$@ фрагментов из разбора. …» has no plural forms. */}
            <p className="ia-footnote">{format(s.quotesNote, { count: counted(locale, quotes.length, s.quotesWord) })}</p>
            {quotes.map((q, i) => (
              <QuoteBlock key={i} lang={langOf(q.lang)}>
                {q.text}
              </QuoteBlock>
            ))}
          </section>
        ) : null}

        {tasks.length > 0 ? (
          <section className="ia-rt-section" aria-labelledby="rating-app-tasks">
            <h2 id="rating-app-tasks" className="ia-section-title ia-section-title--bold">
              {s.appTasksTitle}
            </h2>
            <Card>
              <RatingTaskList tasks={tasks} niche={slug} locale={locale} dataLang={textLang} variant="compact" />
            </Card>
          </section>
        ) : null}

        {/* The top 3 and the rank neighbours: the chain links every app page of the niche. */}
        <section className="ia-rt-section" aria-labelledby="rating-alternatives">
          <h2 id="rating-alternatives" className="ia-section-title ia-section-title--bold">
            {s.alternativesTitle}
          </h2>
          {neighbours.length > 0 ? (
            <Card>
              <ul className="ia-rt-minis">
                {neighbours.map((a) => (
                  <RatingMiniRow
                    key={a.slug}
                    href={routes.ratingApp(locale, slug, a.slug)}
                    rank={a.rank}
                    icon={a.icon}
                    title={displayTitle(a.short)}
                    meta={storeMetaText(locale, a.storeAvg, a.ratings, s)}
                    score={a.realScore}
                    locale={locale}
                  />
                ))}
              </ul>
            </Card>
          ) : null}
          <RowCard
            href={nicheHref}
            glyph={<RatingIcon {...ROW_GLYPH} />}
            title={formatNodes(s.wholeNicheTitle, { name: nicheName })}
            subtitle={format(s.wholeNicheBody, { apps: counted(locale, niche.count, s.appsWord) })}
          />
        </section>

        {otherNiches.length > 0 ? (
          <section className="ia-rt-section" aria-labelledby="rating-other-niches">
            <h2 id="rating-other-niches" className="ia-section-title ia-section-title--bold">
              {s.otherNichesTitle}
            </h2>
            <Card>
              <ul className="ia-rt-minis">
                {otherNiches.map((n) => (
                  <RatingMiniRow
                    key={n.niche}
                    href={routes.ratingApp(locale, n.niche, n.appSlug)}
                    title={n.name}
                    titleLang={langOf(n.nameLang)}
                    meta={format(s.otherNicheLine, { rank: n.rank, count: n.count })}
                    score={n.realScore}
                    locale={locale}
                  />
                ))}
              </ul>
            </Card>
          </section>
        ) : null}

        {topic ? (
          <RowCard
            href={topic.href}
            glyph={<SourceIcon {...ROW_GLYPH} />}
            title={t("Что можно улучшить в этой нише")}
            subtitle={t("Читать исследование пользователей и продуктов")}
          />
        ) : null}
        {app.hasReviews ? (
          <RowCard
            href={routes.reviewsApp(locale, slug, app.id)}
            glyph={<ReviewsIcon {...ROW_GLYPH} />}
            title={rs.appReviewsTitle}
            subtitle={rs.appReviewsBody}
          />
        ) : null}

        <p className="ia-footnote">
          {t("Это материал из архива inApp. Перед установкой проверь текущие условия и возможности приложения в магазине.")}
        </p>
      </div>
    </>
  );
}
