import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { getCards, getCatalog, getManifest, getSearchIndex } from "@/site/content";
import { orderIdeas } from "@/site/content/search";
import { AppPromo } from "@/site/features/ideas/AppPromo";
import { IdeasCatalog, type CatalogCard } from "@/site/features/ideas/IdeasCatalog";
import { IDEAS_CATALOG_UI_KEYS } from "@/site/features/ideas/keys";
import { alternatesFor, ideasCatalogMeta, OG_LOCALE } from "@/site/features/ideas/seo";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { FREE_IDEAS, isLaunchCategory, LAUNCH_CATEGORIES } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { Heading } from "@/site/ui";

// Tab «Идеи» (spec 02 §2): the 293 launch ideas in the app's order (free ideas first for
// viewers without Plus, then rank), search (?q=) and the category filter (?category=<slug>).
// GATE BEFORE SERIALIZING (spec 04 §7.6, 09 G10): a locked card is {slug} only (the cover is
// derived from the slug) and has no search haystack, so a locked idea never matches a query and
// its copy never leaves the server.
// SEO (review seo S3/S7): the H1 and subtitle are the app's; <title> and the description are
// keyword copy with counts from data («Идеи приложений из реальных отзывов», the old /ru/ideas
// ranked with a similar title at sitemap priority 0.95).

type Params = { lang: string };
type Search = { q?: string | string[]; category?: string | string[] };

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const [t, catalog] = await Promise.all([getT(lang), getCatalog(lang)]);
  const { title, description } = ideasCatalogMeta(
    lang,
    {
      ideas: catalog.ideas.filter((i) => isLaunchCategory(i.category)).length,
      topics: LAUNCH_CATEGORIES.length,
      free: FREE_IDEAS.length,
    },
    { number: (n) => t.number(n), countIdea: (n) => t.count("идея", n) },
  );
  const alternates = alternatesFor(lang, (l) => routes.ideas(l));
  return {
    title,
    description,
    alternates,
    openGraph: {
      title: `${title} — inApp`,
      description,
      type: "website",
      url: alternates.canonical,
      locale: OG_LOCALE[lang],
      siteName: "inApp",
    },
    // No catalog card image yet (review seo S5): the small card, not a large one without an image.
    twitter: { card: "summary", title: `${title} — inApp`, description },
  };
}

export default async function IdeasCatalogPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const [t, viewer, manifest, catalog, cards, index] = await Promise.all([
    getT(lang),
    getViewer(),
    getManifest(),
    getCatalog(lang),
    getCards(lang),
    getSearchIndex(lang),
  ]);

  const names = new Map(catalog.categories.map((c) => [c.slug, c.name]));
  const ordered = orderIdeas(
    catalog.ideas.filter((i) => isLaunchCategory(i.category)),
    { plus: viewer.plus, freeIdeas: manifest.free.ideas },
  );

  const list: CatalogCard[] = [];
  const haystacks: Record<string, string[]> = {};
  for (const idea of ordered) {
    const copy = viewer.canReadIdea(idea.slug) ? cards.ideas[idea.slug] : undefined;
    if (!copy) {
      list.push({ locked: true, slug: idea.slug });
      continue;
    }
    list.push({
      locked: false,
      slug: idea.slug,
      title: copy.title,
      description: copy.description,
      categoryName: names.get(idea.category) ?? "",
    });
    const haystack = index.ideas[idea.slug];
    if (haystack) haystacks[idea.slug] = haystack;
  }

  const rawCategory = first(sp.category);
  const category = rawCategory && names.has(rawCategory) ? rawCategory : null;

  return (
    // Top 20 like the app's ideas screen (.padding(20), ClarityCatalogs.swift:218); items 14 apart.
    <div className="ia-page ia-page--grid flex flex-col gap-3.5 pt-5">
      <Heading
        title={t("Идеи")}
        subtitle={viewer.plus ? t("Что можно создать или улучшить.") : t("5 идей бесплатно. Остальные — в Plus.")}
      />
      <I18nProvider locale={lang} strings={t.pick(IDEAS_CATALOG_UI_KEYS)}>
        <IdeasCatalog
          cards={list}
          haystacks={haystacks}
          categories={catalog.categories.map((c) => ({ slug: c.slug, name: c.name }))}
          initialQuery={first(sp.q).slice(0, 200)}
          initialCategory={category}
        />
      </I18nProvider>
      <AppPromo locale={lang} className="ia-ideas__promo" />
    </div>
  );
}
