import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { dataAlternates } from "@/site/features/rating/seo";
import "@/site/features/research/research.css";
import { OG_LOCALE, breadcrumbList, jsonLd, withBrand } from "@/site/features/research/seo";
import { REVIEWS_UI_KEYS } from "@/site/features/reviews/keys";
import { ReviewNiches } from "@/site/features/reviews/ReviewNiches";
import { reviewsStrings } from "@/site/features/reviews/strings";
import "@/site/features/reviews/reviews.css";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { FREE_REVIEW_NICHE, listReviewNiches, reviewTotals } from "@/site/sitedata/reviews";
import { AboutIcon, Heading, ROW_GLYPH, RowCard } from "@/site/ui";

// «Отзывы» (web-only section, DECISIONS «Web-only sections»): the review archive — every
// category of the source corpus (the old /reviews in the new design). Category names and sizes
// are public; the free sample category is open to everyone, the rest need Plus
// (viewer.canReadReviews, the same rule as GET /api/reviews/…). Same URL and canonical as before.
// Layout (redesign spec §4.1): one 680 column, gap 20 (ClarityRatings.swift:79) — heading, the
// corpus size, the searchable category rows, then the methodology row.

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = reviewsStrings[lang];
  const totals = reviewTotals();
  const description = format(s.metaDescription, {
    reviews: counted(lang, totals.reviews, s.reviewsWord),
    apps: counted(lang, totals.apps, s.aboutAppsWord),
  });
  const alternates = dataAlternates(lang, "reviews");
  return {
    title: s.metaTitle,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: withBrand(s.metaTitle, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: "summary", title: withBrand(s.metaTitle, lang), description },
  };
}

export default async function ReviewsArchivePage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const [t, viewer] = await Promise.all([getT(locale), getViewer()]);
  const s = reviewsStrings[locale];
  const totals = reviewTotals();
  const niches = listReviewNiches(locale);
  const canonical = `${SITE_URL}/${locale}/reviews`;
  const summary = [
    counted(locale, totals.niches, s.nichesWord),
    counted(locale, totals.apps, s.appsWord),
    counted(locale, totals.reviews, s.reviewsWord),
  ].join(" · ");

  return (
    <I18nProvider locale={locale} strings={t.pick(REVIEWS_UI_KEYS)}>
      <div className="ia-page ia-page--catalog ia-page--stack">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Dataset",
                  // The old page's dataset id: the category pages point at it (isPartOf).
                  "@id": "https://inapp.pro/reviews#dataset",
                  name: s.metaTitle,
                  description: format(s.metaDescription, {
                    reviews: counted(locale, totals.reviews, s.reviewsWord),
                    apps: counted(locale, totals.apps, s.aboutAppsWord),
                  }),
                  url: canonical,
                  inLanguage: locale,
                  creator: { "@type": "Organization", "@id": `${SITE_URL}/#org`, name: "inApp", url: SITE_URL },
                  variableMeasured: ["review text", "star rating", "topics"],
                },
                breadcrumbList(`${canonical}#breadcrumb`, [
                  ["inApp", `${SITE_URL}/${locale}`],
                  [s.title, canonical],
                ]),
              ],
            }),
          }}
        />
        <Heading className="ia-heading--fixed" title={s.title} subtitle={s.subtitle} />
        <p className="ia-footnote">{summary}</p>
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}
        <ReviewNiches
          niches={niches.map((n) => ({
            slug: n.slug,
            href: routes.reviewsNiche(locale, n.slug),
            name: n.name,
            nameLang: n.nameLang,
            meta: `${counted(locale, n.apps, s.appsWord)} · ${counted(locale, n.reviews, s.reviewsWord)}`,
            locked: !viewer.canReadReviews(n.slug),
            free: n.slug === FREE_REVIEW_NICHE,
          }))}
          s={{ locked: s.locked, freeBadge: s.freeBadge }}
        />
        <RowCard
          href={routes.reviewsMethodology(locale)}
          glyph={<AboutIcon {...ROW_GLYPH} />}
          title={s.methodology}
          subtitle={s.methodologyBody}
        />
      </div>
    </I18nProvider>
  );
}
