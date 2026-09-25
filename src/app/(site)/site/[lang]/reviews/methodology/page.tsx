import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/site/config";
import "@/site/features/research/research.css";
import { OG_LOCALE, ORGANIZATION, breadcrumbList, jsonLd, localeAlternates, withBrand } from "@/site/features/research/seo";
import { methodologyStrings } from "@/site/features/reviews/methodology";
import { reviewsStrings } from "@/site/features/reviews/strings";
import "@/site/features/reviews/reviews.css";
import { counted } from "@/site/i18n/count";
import { INTL_LOCALE, isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { FREE_REVIEW_NICHE, getReviewNiche, reviewTotals } from "@/site/sitedata/reviews";
import { BackButton, Card, DetailToolbar } from "@/site/ui";

// How the review archive is labelled (/<L>/reviews/methodology): the corpus, the three labelling
// layers, how to read the numbers and the limits — a reading page with the live corpus figures.
// Fully translated, so all five locales are canonical (unlike the data pages of the archive).
// Layout (redesign spec §4.4): the reader pattern (ClarityReader.swift:731-800) — the article
// hero (Georgia 30 + Georgia 20 secondary, gap 18), ArticleSections (hairline + 4, title, then
// Georgia 19 text, gap 20), the layers as method-sheet cards (ClarityRatings.swift:452-459),
// the limits as ArticleBullets. A reader: «Назад» stays ink, the title appears on scroll.

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const m = methodologyStrings[lang];
  const alternates = localeAlternates(lang, "reviews/methodology");
  return {
    title: m.metaTitle,
    description: m.metaDescription,
    alternates,
    openGraph: {
      type: "article",
      siteName: "inApp",
      title: withBrand(m.metaTitle, lang),
      description: m.metaDescription,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: "summary", title: withBrand(m.metaTitle, lang), description: m.metaDescription },
  };
}

export default async function ReviewMethodologyPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const t = await getT(locale);
  const m = methodologyStrings[locale];
  const s = reviewsStrings[locale];
  const totals = reviewTotals();
  const intl = INTL_LOCALE[locale];
  const nf = new Intl.NumberFormat(intl);
  const pct = (value: number) =>
    new Intl.NumberFormat(intl, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value / 100);
  const date = new Intl.DateTimeFormat(intl, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${totals.updatedAt}T00:00:00Z`));
  const free = getReviewNiche(locale, FREE_REVIEW_NICHE);
  const canonical = `${SITE_URL}/${locale}/reviews/methodology`;

  const definitions: [string, string][] = [
    [m.defSignal, m.defSignalBody],
    [m.defDirection, m.defDirectionBody],
    [
      m.defSpecific,
      format(m.defSpecificBody, {
        specific: counted(locale, totals.specificReviews, m.uniqueReviewsWord),
        pct: pct(totals.specificCoveragePct),
      }),
    ],
    [
      m.defCoverage,
      format(m.defCoverageBody, {
        reviews: counted(locale, totals.reviews, m.reviewsGenWord),
        niches: counted(locale, totals.niches, m.nichesGenWord),
        deep: nf.format(totals.deepApps),
        planned: counted(locale, totals.deepAppsPlanned, m.appsGenWord),
        pct: pct(totals.deepReviewsPct),
      }),
    ],
  ];

  return (
    <div className="ia-reading-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "TechArticle",
                "@id": `${canonical}#article`,
                headline: m.title,
                description: m.metaDescription,
                inLanguage: locale,
                dateModified: totals.updatedAt,
                author: ORGANIZATION,
                publisher: ORGANIZATION,
                mainEntityOfPage: canonical,
              },
              breadcrumbList(`${canonical}#breadcrumb`, [
                ["inApp", `${SITE_URL}/${locale}`],
                [s.title, `${SITE_URL}${routes.reviews(locale)}`],
                [m.title, canonical],
              ]),
            ],
          }),
        }}
      />
      <DetailToolbar leading={<BackButton label={t("Назад")} fallbackHref={routes.reviews(locale)} />} title={m.title} revealTitle />
      <article className="ia-page ia-page--reading ia-rv-method">
        <header className="ia-rs-hero">
          <h1 className="ia-rs-hero__title">{m.title}</h1>
          <p className="ia-rs-hero__desc">{m.lead}</p>
          <p className="ia-footnote">{format(m.version, { date })}</p>
        </header>

        <section className="ia-rs-section" aria-labelledby="method-corpus">
          <h2 className="ia-rs-section__title" id="method-corpus">
            {m.corpusTitle}
          </h2>
          <div className="ia-rs-text">
            <p>
              {format(m.corpus1, {
                reviews: counted(locale, totals.reviews, m.reviewsWord),
                apps: counted(locale, totals.apps, m.aboutAppsWord),
                niches: counted(locale, totals.niches, m.inNichesWord),
              })}
            </p>
            <p>{format(m.corpus2, { assignments: nf.format(totals.themeAssignments) })}</p>
          </div>
        </section>

        <section className="ia-rs-section" aria-labelledby="method-access">
          <h2 className="ia-rs-section__title" id="method-access">
            {m.accessTitle}
          </h2>
          <div className="ia-rs-text">
            <p>{format(m.access, { free: free?.name ?? "" })}</p>
          </div>
        </section>

        <section className="ia-rs-section" aria-labelledby="method-layers">
          <h2 className="ia-rs-section__title" id="method-layers">
            {m.layersTitle}
          </h2>
          <ul className="ia-stack">
            {[
              [m.layer1Title, m.layer1Body],
              [m.layer2Title, m.layer2Body],
              [m.layer3Title, m.layer3Body],
            ].map(([title, body]) => (
              <li key={title}>
                <Card className="ia-rt-method-card">
                  <h3 className="ia-subheading">{title}</h3>
                  <p>{body}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>

        <section className="ia-rs-section" aria-labelledby="method-read">
          <h2 className="ia-rs-section__title" id="method-read">
            {m.readTitle}
          </h2>
          <dl className="ia-rv-defs">
            {definitions.map(([term, body]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="ia-rs-section" aria-labelledby="method-limits">
          <h2 className="ia-rs-section__title" id="method-limits">
            {m.limitsTitle}
          </h2>
          <ul className="ia-bullets">
            {[m.limit1, m.limit2, m.limit3, m.limit4].map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>

        <Card className="ia-rt-method-card">
          <h2 className="ia-subheading">{m.checkTitle}</h2>
          <p>{m.checkBody}</p>
          <Link className="ia-rs-text-link" href={routes.reviews(locale)}>
            {m.checkLink}
          </Link>
        </Card>
      </article>
    </div>
  );
}
