import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { formatNodes, storeMetaText, reviewScoreValue } from "@/site/features/rating/format";
import { RATING_UI_KEYS } from "@/site/features/rating/keys";
import { MZ_ORIGIN } from "@/site/features/rating/media";
import { RatingAppCard } from "@/site/features/rating/RatingAppCard";
import { RatingImageGuard } from "@/site/features/rating/RatingImageGuard";
import { RatingMethod } from "@/site/features/rating/RatingMethod";
import { RatingMiniRow } from "@/site/features/rating/RatingMiniRow";
import { RatingNicheCard } from "@/site/features/rating/RatingNicheCard";
import { RatingNicheList } from "@/site/features/rating/RatingNicheList";
import { RatingSearchShortcut } from "@/site/features/rating/RatingSearchShortcut";
import { RatingTaskList } from "@/site/features/rating/RatingTaskList";
import { nicheJsonLd } from "@/site/features/rating/schema";
import { dataAlternates, dataLang, h1Name, nicheDescription, nicheTitle } from "@/site/features/rating/seo";
import { ratingClientStrings, ratingStrings } from "@/site/features/rating/strings";
import { displayTitle } from "@/site/features/rating/text";
import "@/site/features/rating/rating.css";
import { OG_LOCALE, TOPIC_ROBOTS, jsonLd, withBrand } from "@/site/features/research/seo";
import { reviewsStrings } from "@/site/features/reviews/strings";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { INTL_LOCALE, isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { getRatingNiche, ratingShareImage, ratingTaskCards, relatedNiches, type RatingNiche } from "@/site/sitedata/rating";
import { nicheTopicLink } from "@/site/sitedata/topics";
import { BackButton, DetailToolbar, Heading, ReviewsIcon, ROW_GLYPH, RowCard, SourceIcon } from "@/site/ui";

// One niche of the rating (/<L>/rating/<niche>; spec 11 §4.2, D3–D6, D12): the main surface.
// The keyword H1 («Лучшие приложения для трекинга привычек») with the topic name and the counts
// under it, the intro with the top 3 as links, the Top-5 card (in-page anchors), then the list
// (RatingNicheList): search, sort chips and legend; «Тройка лидеров» (research-card leaders with
// a screenshot stage), the tasks card («Для чего тебе приложение?», every readable task with its
// gap and apps), «Места 4–N» (row cards with icon, 3 screenshots, verdict, praise, complaints,
// for whom). Then «Об оценках» (the method, on the page), «Похожие темы», the rows to the
// niche's breakdown and (web-only, W6) its reviews. Every card and text is in the server HTML
// (RR6); nothing reads the viewer — the whole rating is free (D2). The old page's URL and
// canonical stay; the JSON-LD ItemList lists plain ListItems by rank (schema.ts).

type Props = { params: Promise<{ lang: string; slug: string }> };

/** The Top-5 card. */
const TOP = 5;
/** «Похожие темы» shows when at least this many related topics exist. */
const MIN_RELATED = 2;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const niche = getRatingNiche(lang, slug);
  if (!niche) return {};
  const title = nicheTitle(lang, niche);
  const description = nicheDescription(lang, niche);
  const alternates = dataAlternates(lang, `rating/${slug}`);
  const image = ratingShareImage(lang, slug);
  return {
    title,
    description,
    alternates,
    robots: TOPIC_ROBOTS,
    openGraph: {
      type: "website",
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

/**
 * «Самая высокая оценка по текстам отзывов — у Hevy (91 из 100), Way of Life (88) и Awesome
 * Habits (84).» — the first 3 apps as links to their pages, joined the locale's way.
 */
function nicheLead(locale: Locale, niche: RatingNiche) {
  const s = ratingStrings[locale];
  const top = niche.apps.slice(0, 3);
  if (top.length === 0) return null;
  const labels = top.map((a, i) => format(i === 0 ? s.topFirst : s.topNext, { app: displayTitle(a.short), score: reviewScoreValue(a.realScore) }));
  const parts = new Intl.ListFormat(INTL_LOCALE[locale], { type: "conjunction" }).formatToParts(labels);
  let next = 0;
  const links = parts.map((part, i) => {
    if (part.type !== "element") return part.value;
    const app = top[next++];
    return (
      <Link key={i} href={routes.ratingApp(locale, niche.slug, app.slug)}>
        {part.value}
      </Link>
    );
  });
  return formatNodes(s.nicheLead, { top: <>{links}</> });
}

export default async function RatingNichePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const niche = getRatingNiche(locale, slug);
  if (!niche) notFound();
  preconnect(MZ_ORIGIN);
  const t = await getT(locale);
  const s = ratingStrings[locale];
  const rs = reviewsStrings[locale];
  const topic = nicheTopicLink(locale, slug);
  const textLang = dataLang(locale);
  const nameLang = niche.nameLang === locale ? undefined : niche.nameLang;
  const name = nameLang ? <span lang={nameLang}>{niche.name}</span> : niche.name;
  // ru/en: the search head term in the data language; de/fr/ja: the topic name (§6.1). A plain
  // string when it can be (one text node: the smoke test greps the H1).
  const h1 =
    locale === "ru" || locale === "en" || !nameLang
      ? format(s.nicheH1, { name: h1Name(locale, niche) })
      : formatNodes(s.nicheH1, { name });
  const tasks = ratingTaskCards(niche);
  const related = relatedNiches(locale, slug, 4);

  // Raw order = rank order (D3). Every app as a row (the flat views), the first 3 as leaders too.
  const ranked = niche.apps;
  const rows = Object.fromEntries(
    ranked.map((a) => [
      a.slug,
      <RatingAppCard key={a.slug} app={a} href={routes.ratingApp(locale, slug, a.slug)} locale={locale} dataLang={textLang} variant="row" />,
    ]),
  );
  const leaders = ranked
    .slice(0, 3)
    .map((a) => (
      <RatingAppCard
        key={a.slug}
        app={a}
        href={routes.ratingApp(locale, slug, a.slug)}
        locale={locale}
        dataLang={textLang}
        variant="leader"
        eager={a.rank === 1}
      />
    ));
  const tasksNode =
    tasks.length > 0 ? (
      <section id="rating-tasks" className="ia-card ia-card--utility ia-rt-tasks" aria-labelledby="rating-tasks-title">
        <h2 id="rating-tasks-title" className="ia-section-title ia-section-title--bold">
          {t("Для чего тебе приложение?")}
        </h2>
        <RatingTaskList tasks={tasks} niche={slug} locale={locale} dataLang={textLang} variant="full" />
      </section>
    ) : null;

  return (
    <>
      <RatingImageGuard />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(nicheJsonLd(locale, t, niche)) }} />
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={routes.rating(locale)} />}
        title={name}
        revealTitle
        trailing={<RatingSearchShortcut label={t("Найти в этой теме")} />}
      />
      <div className="ia-page ia-page--catalog ia-page--stack">
        <Heading
          title={h1}
          subtitle={formatNodes(s.nicheSubtitle, {
            name,
            apps: counted(locale, niche.count, s.appsWord),
            reviews: counted(locale, niche.totalReviews, s.reviewsReadWord),
          })}
        />
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}
        <p className="ia-rt-intro">
          {niche.intro ? (
            <>
              {textLang ? <span lang={textLang}>{niche.intro}</span> : niche.intro}{" "}
            </>
          ) : null}
          {nicheLead(locale, niche)}
        </p>
        <section id="rating-top" className="ia-card ia-card--utility ia-rt-top" aria-labelledby="rating-top-title">
          <h2 id="rating-top-title" className="ia-subheading">
            {format(s.topTitle, { count: Math.min(TOP, ranked.length) })}
          </h2>
          <ul className="ia-rt-minis">
            {ranked.slice(0, TOP).map((a) => (
              <RatingMiniRow
                key={a.slug}
                href={`#app-${a.slug}`}
                rank={a.rank}
                icon={a.icon}
                iconEager
                title={displayTitle(a.short)}
                meta={storeMetaText(locale, a.storeAvg, a.ratings, s)}
                score={a.realScore}
                locale={locale}
              />
            ))}
          </ul>
        </section>
        <I18nProvider locale={locale} strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(locale) }}>
          <RatingNicheList
            niche={slug}
            items={ranked.map((a) => ({
              slug: a.slug,
              rank: a.rank,
              title: a.title,
              realScore: a.realScore,
              storeAvg: a.storeAvg,
              ratings: a.ratings,
            }))}
            rows={rows}
            leaders={leaders}
            tasks={tasksNode}
          />
        </I18nProvider>
        <RatingMethod locale={locale} t={t} niche={niche} />
        {related.length >= MIN_RELATED ? (
          <section id="rating-related" className="ia-rt-section" aria-labelledby="rating-related-title">
            <h2 id="rating-related-title" className="ia-section-title ia-section-title--bold">
              {s.relatedTitle}
            </h2>
            <ul className="ia-rt-related">
              {related.map((card) => (
                <RatingNicheCard key={card.slug} niche={card} locale={locale} variant="compact" />
              ))}
            </ul>
          </section>
        ) : null}
        {topic ? (
          <RowCard
            href={topic.href}
            glyph={<SourceIcon {...ROW_GLYPH} />}
            title={t("Изучить весь разбор")}
            subtitle={t("Задачи людей, сильные стороны продуктов и нерешённые проблемы")}
          />
        ) : null}
        {/* Web-only W6. Every rating niche has a review corpus (hasRatingNiche requires one). */}
        <RowCard
          href={routes.reviewsNiche(locale, slug)}
          glyph={<ReviewsIcon {...ROW_GLYPH} />}
          title={rs.nicheReviewsTitle}
          subtitle={rs.nicheReviewsBody}
        />
        <p className="ia-footnote ia-footnote--gap">
          {t("Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.")}
        </p>
      </div>
    </>
  );
}
