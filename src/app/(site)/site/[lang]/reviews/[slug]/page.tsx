import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import "@/site/features/library/library.css";
import { PlusButton } from "@/site/features/plus/PlusButton";
import { CategoryPulse } from "@/site/features/pulse/CategoryPulse";
import { dataAlternates } from "@/site/features/rating/seo";
import { ratingStrings } from "@/site/features/rating/strings";
import "@/site/features/research/research.css";
import { OG_LOCALE, breadcrumbList, jsonLd, withBrand } from "@/site/features/research/seo";
import { FreeSampleLink } from "@/site/features/reviews/FreeSampleLink";
import { REVIEWS_UI_KEYS } from "@/site/features/reviews/keys";
import { ReviewApps } from "@/site/features/reviews/ReviewApps";
import { reviewsStrings } from "@/site/features/reviews/strings";
import "@/site/features/reviews/reviews.css";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { hasRatingNiche } from "@/site/sitedata/rating";
import { FREE_REVIEW_NICHE, getReviewNiche } from "@/site/sitedata/reviews";
import { nicheTopicLink } from "@/site/sitedata/topics";
import { BackButton, Card, DetailToolbar, Heading, LockIcon, RatingIcon, ROW_GLYPH, RowCard, SourceIcon } from "@/site/ui";

// A review category (/<L>/reviews/<niche>): its apps with topic and review counts, or — without
// access — the locked card with the Plus offer and the way to the open sample. Only public
// catalogue fields are rendered either way; review texts start one level down.
// Layout (redesign spec §4.2): one 680 column, gap 20 — the name (the rating's niche name,
// §10 Q13; <title>s keep the archive's own name), the sizes, «Пульс категории» (public data,
// docs/site-v2/PULSE.md; its subtitle repeats the sizes line's reviews and apps; nothing for a
// category without needs), the apps as Saved rows (ClarityMy.swift:220-231, 272-306) or the
// content-gate lock card (ClarityContentAccess.swift:86-104), then rows to the niche's rating
// (W8) and breakdown.

type Props = { params: Promise<{ lang: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const niche = getReviewNiche(lang, slug);
  if (!niche) return {};
  const s = reviewsStrings[lang];
  const title = format(s.nicheMetaTitle, { name: niche.titleName });
  const description = format(s.nicheMetaDescription, {
    name: niche.titleName,
    apps: counted(lang, niche.apps.length, s.appsWord),
    reviews: counted(lang, niche.reviews, s.reviewsWord),
  });
  const alternates = dataAlternates(lang, `reviews/${slug}`);
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: withBrand(title, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: "summary", title: withBrand(title, lang), description },
  };
}

export default async function ReviewNichePage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const niche = getReviewNiche(locale, slug);
  if (!niche) notFound();
  const [t, viewer] = await Promise.all([getT(locale), getViewer()]);
  const s = reviewsStrings[locale];
  const open = viewer.canReadReviews(slug);
  const apps = counted(locale, niche.apps.length, s.appsWord);
  const reviews = counted(locale, niche.reviews, s.reviewsWord);
  const free = open ? null : getReviewNiche(locale, FREE_REVIEW_NICHE);
  const topic = nicheTopicLink(locale, slug);
  const rated = hasRatingNiche(slug);
  const canonical = `${SITE_URL}/${locale}/reviews/${slug}`;
  const nameLang = niche.nameLang === locale ? undefined : niche.nameLang;

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
                name: format(s.nicheMetaTitle, { name: niche.titleName }),
                description: format(s.nicheMetaDescription, { name: niche.titleName, apps, reviews }),
                url: canonical,
                inLanguage: locale,
                isPartOf: { "@id": "https://inapp.pro/reviews#dataset" },
                variableMeasured: ["review text", "star rating", "topics"],
              },
              breadcrumbList(`${canonical}#breadcrumb`, [
                ["inApp", `${SITE_URL}/${locale}`],
                [s.title, `${SITE_URL}${routes.reviews(locale)}`],
                [niche.titleName, canonical],
              ]),
            ],
          }),
        }}
      />
      <DetailToolbar
        leading={<BackButton className="ia-glass-pill--accent" label={t("Назад")} fallbackHref={routes.reviews(locale)} />}
        title={s.title}
      />
      <div className="ia-page ia-page--catalog ia-page--stack">
        <Heading className="ia-heading--fixed" title={<span lang={nameLang}>{niche.name}</span>} />
        <p className="ia-footnote">
          {apps} · {reviews}
        </p>
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}
        <CategoryPulse locale={locale} slug={slug} corpus={{ reviews: niche.reviews, apps: niche.apps.length }} />

        {open ? (
          <ReviewApps
            apps={niche.apps.map((app) => ({
              id: app.id,
              href: routes.reviewsApp(locale, slug, app.id),
              title: app.title,
              meta: `${counted(locale, app.topics, s.topicsWord)} · ${counted(locale, app.reviews, s.reviewsWord)}`,
              topicNames: app.topicNames,
            }))}
            placeholder={s.appSearch}
          />
        ) : (
          <Card className="ia-rs-lock-card">
            <p className="ia-rs-lock-card__label">
              <LockIcon size={17} strokeWidth={2} aria-hidden="true" />
              {s.lockTitle}
            </p>
            <p className="ia-rs-lock-card__body">{format(s.lockBody, { apps, reviews })}</p>
            <PlusButton source="reviews_locked" variant="primary" label={t("Открыть все материалы")} />
            {free ? <FreeSampleLink locale={locale} template={s.lockSample} name={free.name} nameLang={free.nameLang} /> : null}
          </Card>
        )}

        {rated ? (
          <RowCard
            href={routes.ratingNiche(locale, slug)}
            glyph={<RatingIcon {...ROW_GLYPH} />}
            title={ratingStrings[locale].nicheRatingTitle}
            subtitle={ratingStrings[locale].nicheRatingBody}
          />
        ) : null}
        {topic ? (
          <RowCard
            href={topic.href}
            glyph={<SourceIcon {...ROW_GLYPH} />}
            title={t("Изучить весь разбор")}
            subtitle={t("Задачи людей, сильные стороны продуктов и нерешённые проблемы")}
          />
        ) : null}
      </div>
    </I18nProvider>
  );
}
