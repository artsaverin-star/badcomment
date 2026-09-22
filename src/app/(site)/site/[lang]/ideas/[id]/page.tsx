import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getCatalog, getIdea } from "@/site/content";
import { mediaAbsoluteUrl, mediaSrc, mediaSrcSet, MEDIA_SIZES_ARTICLE } from "@/site/content/media";
import { AppPromo } from "@/site/features/ideas/AppPromo";
import { IdeaArticle } from "@/site/features/ideas/IdeaArticle";
import { IdeaReader, LockedIdea } from "@/site/features/ideas/IdeaReader";
import { IDEA_READER_UI_KEYS } from "@/site/features/ideas/keys";
import { alternatesFor, jsonLd } from "@/site/features/ideas/seo";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { FREE_IDEAS, isLaunchIdea } from "@/site/manifest.generated";
import { routes } from "@/site/routing";

// An idea (spec 02 §3): full page on a direct URL (the web has no intercepting modal yet).
// SERVER GATE FIRST (spec 02 §1.4, 04 §7.6, 09 G10): the IdeaFile is read only when the viewer
// can read the idea. A locked idea renders the app's preview — artwork only — and its
// metadata carries no title/description/category either (generic «Идея в Plus», noindex).
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

  const idea = viewer.canReadIdea(id) ? await getIdea(lang, id) : null;
  if (!idea) {
    const title = t("Идея в Plus");
    const description = t("Подробности идеи доступны в Plus.");
    return {
      title,
      description,
      alternates,
      robots: { index: false, follow: true },
      openGraph: { title: `${title} — inApp`, description, type: "website", locale: lang, siteName: "inApp", images: image },
      twitter: { card: "summary_large_image", title: `${title} — inApp`, description },
    };
  }
  return {
    title: idea.title,
    description: idea.description,
    alternates,
    // Crawlers are guests: only the free layer has a public, readable version.
    robots: free.has(id) ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title: `${idea.title} — inApp`,
      description: idea.description,
      type: "article",
      locale: lang,
      siteName: "inApp",
      section: idea.categoryName,
      images: image,
    },
    twitter: { card: "summary_large_image", title: `${idea.title} — inApp`, description: idea.description },
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
                decoding="async"
              />
            }
          />
        </I18nProvider>
      </>
    );
  }

  return (
    <div className="ia-reading-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: idea.title,
            description: idea.description,
            image: mediaAbsoluteUrl(idea.cover, SITE_URL, 1200),
            inLanguage: lang,
            url,
            mainEntityOfPage: url,
            articleSection: idea.categoryName,
            isAccessibleForFree: free.has(id),
            publisher: { "@id": `${SITE_URL}/#org` },
            isPartOf: { "@id": `${SITE_URL}/#website` },
            about: { "@type": "Thing", name: idea.categoryName, url: `${SITE_URL}${routes.topic(lang, idea.category)}` },
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
