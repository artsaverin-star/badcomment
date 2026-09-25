import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { PlusButton } from "@/site/features/plus/PlusButton";
import { dataAlternates, dataLang } from "@/site/features/rating/seo";
import { ratingStrings } from "@/site/features/rating/strings";
import "@/site/features/research/research.css";
import { OG_LOCALE, breadcrumbList, jsonLd, withBrand } from "@/site/features/research/seo";
import { FreeSampleLink } from "@/site/features/reviews/FreeSampleLink";
import { REVIEWS_UI_KEYS } from "@/site/features/reviews/keys";
import { ReviewBrowser } from "@/site/features/reviews/ReviewBrowser";
import { reviewsStrings } from "@/site/features/reviews/strings";
import "@/site/features/reviews/reviews.css";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { ratingAppSlug } from "@/site/sitedata/rating";
import { FREE_REVIEW_NICHE, firstReviews, getReviewApp, getReviewNiche } from "@/site/sitedata/reviews";
import { BackButton, Card, DetailToolbar, Heading, LockIcon, RatingIcon, ROW_GLYPH, RowCard } from "@/site/ui";

// Every review of one app (/<L>/reviews/<niche>/<app id>): rating, source text and the topics of
// each review, with topic / star / text filters. SERVER GATE FIRST: review texts are read only
// for viewers who can read the category (viewer.canReadReviews); the others get the locked card.
// The rest of the list is fetched by the browser from GET /api/reviews/<niche>/<id> (same rule).
// Layout (redesign spec §4.3): one 680 column, gap 20 — the app title over the niche name, the
// sizes, the review browser (or the content-gate lock card), then the row to the app's rating
// breakdown (W7).

type Props = {
  params: Promise<{ lang: string; slug: string; id: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

const FIRST_SCREEN = 40;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug, id } = await params;
  if (!isLocale(lang)) return {};
  const app = getReviewApp(lang, slug, id);
  if (!app) return {};
  const s = reviewsStrings[lang];
  const title = format(s.appMetaTitle, { app: app.title });
  const description = format(s.appMetaDescription, { app: app.title, reviews: counted(lang, app.reviews, s.reviewsWord) });
  const alternates = dataAlternates(lang, `reviews/${slug}/${id}`);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "article",
      siteName: "inApp",
      title: withBrand(title, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: "summary", title: withBrand(title, lang), description },
  };
}

export default async function ReviewAppPage({ params, searchParams }: Props) {
  const { lang, slug, id } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const app = getReviewApp(locale, slug, id);
  if (!app) notFound();
  const [t, viewer, sp] = await Promise.all([getT(locale), getViewer(), searchParams]);
  const s = reviewsStrings[locale];
  const lang2 = dataLang(locale);
  const open = viewer.canReadReviews(slug);
  const concrete = app.topics.filter((tp) => !tp.general).length;
  const reviews = counted(locale, app.reviews, s.reviewsWord);
  const ratingSlug = ratingAppSlug(slug, id);
  const nicheHref = routes.reviewsNiche(locale, slug);
  const canonical = `${SITE_URL}${routes.reviewsApp(locale, slug, id)}`;
  const q = Array.isArray(sp.q) ? (sp.q[0] ?? "") : (sp.q ?? "");
  // Gate first: texts only for readers.
  const first = open ? firstReviews(slug, id, FIRST_SCREEN) : null;
  const free = open ? null : getReviewNiche(locale, FREE_REVIEW_NICHE);
  const nicheLang = app.niche.nameLang === locale ? undefined : app.niche.nameLang;

  return (
    <I18nProvider locale={locale} strings={t.pick(REVIEWS_UI_KEYS)}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Dataset",
                "@id": `${canonical}#dataset`,
                name: format(s.appMetaTitle, { app: app.title }),
                description: format(s.appMetaDescription, { app: app.title, reviews }),
                url: canonical,
                inLanguage: locale,
                isPartOf: { "@id": `${SITE_URL}${nicheHref}#dataset` },
                variableMeasured: ["review text", "star rating", "topics"],
                isAccessibleForFree: slug === FREE_REVIEW_NICHE,
              },
              breadcrumbList(`${canonical}#breadcrumb`, [
                ["inApp", `${SITE_URL}/${locale}`],
                [s.title, `${SITE_URL}${routes.reviews(locale)}`],
                [app.niche.titleName, `${SITE_URL}${nicheHref}`],
                [app.title, canonical],
              ]),
            ],
          }),
        }}
      />
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={nicheHref} />}
        title={s.title}
      />
      <div className="ia-page ia-page--catalog ia-page--stack">
        <Heading
          className="ia-heading--fixed"
          title={app.title}
          subtitle={<span lang={nicheLang}>{app.niche.name}</span>}
        />
        <p className="ia-footnote">
          {reviews} · {counted(locale, concrete, s.topicsWord)}
        </p>
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}

        {first ? (
          <ReviewBrowser
            niche={slug}
            id={id}
            topics={app.topics.map((tp) => ({ key: tp.key, label: tp.label, count: tp.count, general: tp.general }))}
            total={first.total || app.reviews}
            counts={first.counts}
            initial={first.first}
            initialQuery={q.slice(0, 160)}
            dataLang={lang2}
            s={{
              topicLabel: s.topicLabel,
              topicSearch: s.topicSearch,
              topicPickerOpen: s.topicPickerOpen,
              allTopics: s.allTopics,
              ratingLabel: s.ratingLabel,
              allRatings: s.allRatings,
              textSearch: s.textSearch,
              worstFirst: s.worstFirst,
              bestFirst: s.bestFirst,
              listTitle: s.listTitle,
              loadingAll: s.loadingAll,
              loadFailed: s.loadFailed,
              showMore: s.showMore,
              stars: s.stars,
              reviewsWord: s.reviewsWord,
              ratingPill: s.ratingPill,
              optionCount: s.optionCount,
              emptyBody: s.emptyBody,
            }}
          />
        ) : (
          <Card className="ia-rs-lock-card">
            <p className="ia-rs-lock-card__label">
              <LockIcon size={17} strokeWidth={2} aria-hidden="true" />
              {s.lockTitle}
            </p>
            <p className="ia-rs-lock-card__body">{format(s.lockAppBody, { app: app.title, reviews })}</p>
            <PlusButton source="reviews_locked" variant="primary" label={t("Открыть все материалы")} />
            {free ? <FreeSampleLink locale={locale} template={s.lockSample} name={free.name} nameLang={free.nameLang} /> : null}
          </Card>
        )}

        {ratingSlug ? (
          <RowCard
            href={routes.ratingApp(locale, slug, ratingSlug)}
            glyph={<RatingIcon {...ROW_GLYPH} />}
            title={ratingStrings[locale].appRatingTitle}
            subtitle={ratingStrings[locale].appRatingBody}
          />
        ) : null}
      </div>
    </I18nProvider>
  );
}
