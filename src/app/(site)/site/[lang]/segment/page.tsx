import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { getCatalog, getSearchIndex } from "@/site/content";
import { searchResearch } from "@/site/content/search";
import { matchesQuery } from "@/site/content/text";
import { AppPromo } from "@/site/features/research/AppPromo";
import { CatalogCard } from "@/site/features/research/CatalogCard";
import { CatalogSearch } from "@/site/features/research/CatalogSearch";
import { OG_LOCALE, localeAlternates } from "@/site/features/research/seo";
import { researchStrings } from "@/site/features/research/strings";
import "@/site/features/research/research.css";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { routes } from "@/site/routing";
import { getSoonTopics } from "@/site/sitedata";
import { Card, Heading, SectionTitle } from "@/site/ui";

// Tab «Разборы» (spec 01 §3–§4, spec 04 §5.2): the 35 launch topics in LaunchEdition order,
// server-side search over ?q= with the app's rules (locked bodies may match; only catalogue
// fields are rendered), then the old site's other topics («Скоро в новом формате») and an
// App Store promo.

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
};

const queryOf = (q: string | string[] | undefined) => (Array.isArray(q) ? (q[0] ?? "") : (q ?? "")).slice(0, 200);

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [t, sp] = await Promise.all([getT(lang), searchParams]);
  const title = t("Разборы");
  const description = t("Что людям важно в приложениях и чего им не хватает.");
  const alternates = localeAlternates(lang, "segment");
  return {
    title,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: `${title} — inApp`,
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    // Search result pages are not indexed; the catalog itself is (spec 09 G9).
    robots: queryOf(sp.q) ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ResearchCatalogPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [sp, t, viewer, catalog] = await Promise.all([searchParams, getT(lang), getViewer(), getCatalog(lang)]);
  const query = queryOf(sp.q);
  const s = researchStrings[lang];

  // Matching needs the locked bodies → server only; the page gets slugs back.
  const slugs = query === "" ? catalog.categories.map((c) => c.slug) : searchResearch(await getSearchIndex(lang), catalog.categories, query, lang);
  const bySlug = new Map(catalog.categories.map((c) => [c.slug, c]));
  const results = slugs.map((slug) => bySlug.get(slug)).filter((c) => c !== undefined);

  // Old topics: all of them for an empty query, else those whose name matches.
  const soon = getSoonTopics(lang).filter((topic) => query.trim() === "" || matchesQuery(query, [topic.name], topic.lang, true));

  return (
    <div className="ia-page ia-page--grid ia-rs-catalog">
      <Heading id="research-top" title={t("Разборы")} subtitle={t("Что людям важно в приложениях и чего им не хватает.")} />
      <CatalogSearch query={query} placeholder={t("Категория или потребность")} clearLabel={t("Очистить поиск")}>
        {query !== "" ? (
          <p className="ia-rs-count" role="status">
            {t("Найдено: %1$@", [t.number(results.length)])}
          </p>
        ) : null}
        {results.length === 0 ? (
          <Card className="ia-rs-empty" id="clarity-catalog-empty">
            <h2 className="ia-rs-empty__title">{t("Пока ничего не нашлось")}</h2>
            <p className="ia-rs-empty__body">{t("Попробуй название категории или более короткий запрос.")}</p>
          </Card>
        ) : (
          <ul className="ia-grid ia-rs-grid" aria-label={t("Разборы")}>
            {results.map((category, i) => (
              <li key={category.slug}>
                <CatalogCard
                  category={category}
                  href={routes.topic(lang, category.slug)}
                  locked={!viewer.canReadResearch(category.slug)}
                  lockLabel={t("Полный разбор в Plus")}
                  freeLabel={t("Бесплатный разбор")}
                  eager={i < 3}
                />
              </li>
            ))}
          </ul>
        )}
        {soon.length > 0 ? (
          <section className="ia-rs-soon" aria-labelledby="research-soon" id="clarity-research-coming-soon">
            <SectionTitle id="research-soon">{s.soonTitle}</SectionTitle>
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
