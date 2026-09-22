import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getCatalog, getIdea, getManifest } from "@/site/content";
import { mediaAbsoluteUrl, mediaSrc, mediaSrcSet, MEDIA_SIZES_ARTICLE } from "@/site/content/media";
import { AppPromo } from "@/site/features/ideas/AppPromo";
import { IdeaArticle } from "@/site/features/ideas/IdeaArticle";
import { IdeaReader, LockedIdea } from "@/site/features/ideas/IdeaReader";
import { IDEA_READER_UI_KEYS } from "@/site/features/ideas/keys";
import { alternatesFor, clampDescription, ideaSeoTitle, jsonLd, OG_LOCALE, ORG_REF } from "@/site/features/ideas/seo";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { FREE_CATEGORY, FREE_IDEAS, isLaunchIdea } from "@/site/manifest.generated";
import { routes } from "@/site/routing";

// An idea (spec 02 §3): full page on a direct URL (the web has no intercepting modal yet).
// SERVER GATE FIRST (spec 02 §1.4, 04 §7.6, 09 G10): the IdeaFile is read only when the viewer
// can read the idea. A locked idea renders the app's preview — artwork only — and its
// metadata carries no title/description/category either (generic «Идея в Plus», noindex).
// Like the app, without Plus only the card's artwork is public (DECISIONS §9; the owner accepted
// the search-traffic trade-off), so no topic link or text is added to the locked page.
// Non-launch ids never reach this page (the proxy serves the old page); unknown → 404 (G8).

type Params = { lang: string; id: string };

const free: ReadonlySet<string> = new Set(FREE_IDEAS);

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { lang, id } = await params;
  if (!isLocale(lang) || !isLaunchIdea(id)) return {};
  const [t, viewer, catalog] = await Promise.all([getT(lang), getViewer(), getCatalog(lang)]);
  const cover = catalog.ideas.find((i) => i.slug === id)?.cover;
  const image = cover ? [{ url: mediaAbsoluteUrl(cover, SITE_URL, 1200), width: 1200, height: 800, alt: "" }] : undefined;
  const alternates = alternatesFor(lang, (l) => routes.idea(l, id));
  const url = alternates.canonical;

  const idea = viewer.canReadIdea(id) ? await getIdea(lang, id) : null;
  if (!idea) {
    const title = t("Идея в Plus");
    const description = t("Подробности идеи доступны в Plus.");
    return {
      title,
      description,
      alternates,
      robots: { index: false, follow: true },
      openGraph: {
        title: `${title} — inApp`,
        description,
        type: "website",
        url,
        locale: OG_LOCALE[lang],
        siteName: "inApp",
        images: image,
      },
      twitter: { card: "summary_large_image", title: `${title} — inApp`, description },
    };
  }
  // <title>: the card title + "app idea" (review seo S11); the H1 stays the card title.
  const title = ideaSeoTitle(lang, idea.title);
  const description = clampDescription(idea.description, lang);
  return {
    title,
    description,
    alternates,
    // Crawlers are guests: only the free layer has a public, readable version.
    robots: free.has(id)
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
      : { index: false, follow: true },
    openGraph: {
      title: `${title} — inApp`,
      description,
      type: "article",
      url,
      locale: OG_LOCALE[lang],
      siteName: "inApp",
      section: idea.categoryName,
      images: image,
    },
    twitter: { card: "summary_large_image", title: `${title} — inApp`, description },
  };
}

export default async function IdeaPage({ params }: { params: Promise<Params> }) {
  const { lang, id } = await params;
  if (!isLocale(lang) || !isLaunchIdea(id)) notFound();
  const [t, viewer, catalog] = await Promise.all([getT(lang), getViewer(), getCatalog(lang)]);
  const entry = catalog.ideas.find((i) => i.slug === id);
  if (!entry) notFound();

  const url = `${SITE_URL}${routes.idea(lang, id)}`;
  const strings = t.pick(IDEA_READER_UI_KEYS);
  const promo = <AppPromo locale={lang} />;

  const idea = viewer.canReadIdea(id) ? await getIdea(lang, id) : null;

  if (!idea) {
    const title = t("Идея в Plus");
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@type": "WebPage",
              name: title,
              url,
              inLanguage: lang,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              primaryImageOfPage: mediaAbsoluteUrl(entry.cover, SITE_URL, 1200),
            }),
          }}
        />
        <I18nProvider locale={lang} strings={strings}>
          <LockedIdea
            slug={id}
            promo={promo}
            freeTopicHref={routes.topic(lang, FREE_CATEGORY)}
            art={
              // eslint-disable-next-line @next/next/no-img-element -- pre-encoded webp with srcset (public/media)
              <img
                className="ia-idea__cover"
                src={mediaSrc(entry.cover, 800)}
                srcSet={mediaSrcSet(entry.cover)}
                sizes={MEDIA_SIZES_ARTICLE}
                width={entry.cover.width}
                height={entry.cover.height}
                alt=""
                fetchPriority="high"
              />
            }
          />
        </I18nProvider>
      </>
    );
  }

  const manifest = await getManifest();
  const isFree = free.has(id);
  const article = {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: idea.title,
    description: idea.description,
    image: mediaAbsoluteUrl(idea.cover, SITE_URL, 1200),
    inLanguage: lang,
    url,
    mainEntityOfPage: url,
    articleSection: idea.categoryName,
    datePublished: manifest.collectionDate,
    dateModified: manifest.contentBuiltAt,
    isAccessibleForFree: isFree,
    author: ORG_REF,
    publisher: ORG_REF,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@type": "Thing", name: idea.categoryName, url: `${SITE_URL}${routes.topic(lang, idea.category)}` },
  };
  // Breadcrumbs only where a crawler can see the page (the free layer): inApp › Идеи › {title}.
  const breadcrumbs = isFree
    ? {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "inApp", item: `${SITE_URL}${routes.home(lang)}` },
          { "@type": "ListItem", position: 2, name: t("Идеи"), item: `${SITE_URL}${routes.ideas(lang)}` },
          { "@type": "ListItem", position: 3, name: idea.title, item: url },
        ],
      }
    : null;

  return (
    <div className="ia-reading-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": breadcrumbs ? [article, breadcrumbs] : [article],
          }),
        }}
      />
      <I18nProvider locale={lang} strings={strings}>
        <IdeaReader slug={id} category={idea.category} title={idea.title} promo={promo}>
          <IdeaArticle locale={lang} idea={idea} />
        </IdeaReader>
      </I18nProvider>
    </div>
  );
}
