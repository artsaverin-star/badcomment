import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getCards, getCatalog } from "@/site/content";
import { mediaSrc } from "@/site/content/media";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, LOCALES, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { SAVED_UI_KEYS } from "@/site/features/library/keys";
import { parseSavedFilter, type SavedIndex } from "@/site/features/library/saved-model";
import { SavedScreen } from "@/site/features/library/SavedScreen";
import { routes } from "@/site/routing";

// «Сохранённое» (tab 3, spec 02 §6; ?filter=all|research|ideas|notes&q=). The library is
// the viewer's browser data (+ account sync), so the server only provides a public index:
// topic names and covers, idea covers, and idea titles ONLY for ideas this viewer can read.
// noindex (spec 09 §2.1, G9).

type Params = { lang: string };
type Search = { filter?: string | string[]; q?: string | string[] };

/** Thumbnails are 88×66 CSS px: the smallest pre-encoded width covers 2× screens. */
const THUMB_WIDTH = 176;

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = await getT(lang);
  const url = (l: Locale) => `${SITE_URL}${routes.saved(l)}`;
  return {
    title: t("Сохранённое"),
    description: t("Материалы и личные заметки"),
    alternates: {
      canonical: url(lang),
      languages: { ...Object.fromEntries(LOCALES.map((l) => [l, url(l)])), "x-default": url("en") },
    },
    robots: { index: false, follow: true },
  };
}

export default async function SavedPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<Search>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const sp = await searchParams;
  const [t, viewer, catalog, cards] = await Promise.all([getT(lang), getViewer(), getCatalog(lang), getCards(lang)]);

  // Gate on the server before serializing: a locked idea is {category, thumb} only.
  const index: SavedIndex = { topics: {}, ideas: {} };
  for (const c of catalog.categories) index.topics[c.slug] = { name: c.name, thumb: mediaSrc(c.cover, THUMB_WIDTH) };
  for (const idea of catalog.ideas) {
    const title = viewer.canReadIdea(idea.slug) ? cards.ideas[idea.slug]?.title : undefined;
    index.ideas[idea.slug] = {
      category: idea.category,
      thumb: mediaSrc(idea.cover, THUMB_WIDTH),
      ...(title ? { title } : {}),
    };
  }

  const initialFilter = parseSavedFilter(sp.filter);
  const initialQuery = (Array.isArray(sp.q) ? sp.q[0] : sp.q) ?? "";

  return (
    <I18nProvider locale={lang} strings={t.pick(SAVED_UI_KEYS)}>
      <SavedScreen locale={lang} index={index} initialFilter={initialFilter} initialQuery={initialQuery} />
    </I18nProvider>
  );
}
