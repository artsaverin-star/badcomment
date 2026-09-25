import type { Metadata } from "next";
import Link from "next/link";
import { pulseStrings } from "@/site/features/pulse/strings";
import "@/site/features/pulse/pulse.css";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getCatalog, getSearchIndex } from "@/site/content";
import { mediaAbsoluteUrl } from "@/site/content/media";
import { searchResearch } from "@/site/content/search";
import { compareNames, matchesQuery } from "@/site/content/text";
import { AppPromo } from "@/site/features/research/AppPromo";
import { CatalogCard } from "@/site/features/research/CatalogCard";
import { CatalogSearch } from "@/site/features/research/CatalogSearch";
import { OG_LOCALE, breadcrumbList, jsonLd, localeAlternates, topicsCount, withBrand } from "@/site/features/research/seo";
import { researchStrings } from "@/site/features/research/strings";
import "@/site/features/research/research.css";
import { format } from "@/site/i18n/strings";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { FREE_CATEGORY } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { getSoonTopics } from "@/site/sitedata";
import { Card, Heading } from "@/site/ui";

// Tab «Разборы» (spec 01 §3–§4, spec 04 §5.2): the 35 launch topics in LaunchEdition order,
// server-side search over ?q= with the app's rules (locked bodies may match; only catalogue
// fields are rendered), then the old site's other topics («Скоро в новом формате») and an
// App Store promo.

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

const queryOf = (q: string | string[] | undefined) => (Array.isArray(q) ? (q[0] ?? "") : (q ?? "")).slice(0, 200);

/** Web-only <title>/description with the search keywords (review seo S3); H1 and subtitle stay the app's. */
async function catalogMeta(lang: Locale) {
  const [t, catalog] = await Promise.all([getT(lang), getCatalog(lang)]);
  const s = researchStrings[lang];
  const topics = topicsCount(s, lang, catalog.categories.length, t.number);
  return { t, catalog, title: s.catalogMetaTitle, description: format(s.catalogMetaDescription, { topics }) };
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [{ catalog, title, description }, sp] = await Promise.all([catalogMeta(lang), searchParams]);
  const alternates = localeAlternates(lang, "segment");
  // Until a composed 1200×630 card exists (review seo S5), share the free topic's cover.
  const cover = catalog.categories.find((c) => c.slug === FREE_CATEGORY)?.cover;
  const image = cover
    ? { url: mediaAbsoluteUrl(cover, SITE_URL, 1200), width: cover.width, height: cover.height, alt: title }
    : null;
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
      ...(image ? { images: [image] } : {}),
    },
    twitter: image
      ? { card: "summary_large_image", title: withBrand(title, lang), description, images: [image.url] }
      : { card: "summary", title: withBrand(title, lang), description },
    // Search result pages are not indexed; the catalog itself is (spec 09 G9).
    robots: queryOf(sp.q) ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ResearchCatalogPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [sp, { t, catalog, title, description }, viewer] = await Promise.all([searchParams, catalogMeta(lang), getViewer()]);
  const query = queryOf(sp.q);
  const s = researchStrings[lang];
  // The app tests the untrimmed query (ClarityCatalogs.swift:15,47,67): spaces only = every topic
  // at equal relevance, i.e. by name, and no coming-soon block.
  const blank = query !== "" && query.trim() === "";

  // Matching needs the locked bodies → server only; the page gets slugs back.
  const slugs =
    query === ""
      ? catalog.categories.map((c) => c.slug)
      : blank
        ? [...catalog.categories].sort((a, b) => compareNames(a.name, b.name, lang)).map((c) => c.slug)
        : searchResearch(await getSearchIndex(lang), catalog.categories, query, lang);
  const bySlug = new Map(catalog.categories.map((c) => [c.slug, c]));
  const results = slugs.map((slug) => bySlug.get(slug)).filter((c) => c !== undefined);

  // Old topics: all of them for an empty query, else those whose name matches.
  const soon = blank ? [] : getSoonTopics(lang).filter((topic) => query === "" || matchesQuery(query, [topic.name], topic.lang, true));

  const canonical = `${SITE_URL}/${lang}/segment`;
  return (
    <div className="ia-page ia-page--grid ia-rs-catalog">
      {query === "" ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "CollectionPage",
                  "@id": canonical,
                  url: canonical,
                  name: title,
                  description,
                  inLanguage: lang,
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                  breadcrumb: { "@id": `${canonical}#breadcrumb` },
                  mainEntity: {
                    "@type": "ItemList",
                    numberOfItems: catalog.categories.length,
                    itemListElement: catalog.categories.map((c, i) => ({
                      "@type": "ListItem",
                      position: i + 1,
                      url: `${SITE_URL}${routes.topic(lang, c.slug)}`,
                      name: c.name,
                    })),
                  },
                },
                breadcrumbList(`${canonical}#breadcrumb`, [
                  ["inApp", `${SITE_URL}/${lang}`],
                  [t("Разборы"), canonical],
                ]),
              ],
            }),
          }}
        />
      ) : null}
      <Heading id="research-top" title={t("Разборы")} subtitle={t("Что людям важно в приложениях и чего им не хватает.")} />
      <Link className="ia-pulse-link" href={routes.pulse(lang)}>{pulseStrings[lang].title} · {pulseStrings[lang].subtitle} →</Link>
      <CatalogSearch query={query} placeholder={t("Категория или потребность")} clearLabel={t("Очистить поиск")}>
        {/* Always mounted, so screen readers announce the count when it changes (a11y m9). */}
        <p className="ia-rs-count" role="status">
          {query !== "" ? t("Найдено: %1$@", [t.number(results.length)]) : ""}
        </p>
        {results.length === 0 ? (
          <Card className="ia-rs-empty" id="clarity-catalog-empty">
            <h2 className="ia-rs-empty__title">{t("Пока ничего не нашлось")}</h2>
            <p className="ia-rs-empty__body">{t("Попробуй название категории или более короткий запрос.")}</p>
          </Card>
        ) : (
          <ul className="ia-grid ia-grid--research ia-rs-grid" aria-label={t("Разборы")}>
            {results.map((category, i) => (
              <li key={category.slug}>
                <CatalogCard
                  category={category}
                  href={routes.topic(lang, category.slug)}
                  locked={!viewer.canReadResearch(category.slug)}
                  lockLabel={t("Полный разбор в Plus")}
                  freeLabel={t("Бесплатный разбор")}
                  eager={i < 3}
                  priority={i === 0}
                />
              </li>
            ))}
          </ul>
        )}
        {soon.length > 0 ? (
          <section className="ia-rs-soon" aria-labelledby="research-soon" id="clarity-research-coming-soon">
            {/* The app's coming-soon block uses the 17/600 subheading (ClarityCatalogs.swift:69). */}
            <h2 className="ia-subheading" id="research-soon">
              {s.soonTitle}
            </h2>
            <p className="ia-rs-soon__body">{s.soonBody}</p>
            <ul className="ia-rs-soon__list">
              {soon.map((topic) => (
                <li key={topic.slug}>
                  {/* Old page in place (another root layout): a plain link. */}
                  <a
                    className="ia-rs-soon__link"
                    href={topic.href}
                    lang={topic.lang === lang ? undefined : topic.lang}
                    hrefLang={topic.lang}
                  >
                    {topic.name}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CatalogSearch>
      <AppPromo locale={lang} />
    </div>
  );
}
