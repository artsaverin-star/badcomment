import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getCards, getCatalog, getManifest, getResearch, getUI } from "@/site/content";
import { mediaAbsoluteUrl } from "@/site/content/media";
import { ideaCategoryName } from "@/site/content/text";
import { ArticleToolbar, LockedToolbar, TocRail } from "@/site/features/research/ArticleChrome";
import { RESEARCH_ARTICLE_UI_KEYS } from "@/site/features/research/keys";
import { LockedPreview } from "@/site/features/research/LockedPreview";
import { ResearchArticle, articleIdeaSlugs, type ArticleIdea } from "@/site/features/research/ResearchArticle";
import {
  OG_LOCALE,
  ORGANIZATION,
  TOPIC_ROBOTS,
  breadcrumbList,
  clampDescription,
  jsonLd,
  localeAlternates,
  topicTitle,
  withBrand,
} from "@/site/features/research/seo";
import { researchStrings } from "@/site/features/research/strings";
import { TopicExtras } from "@/site/features/research/TopicExtras";
import { hasCategoryPulse } from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import "@/site/features/research/research.css";
import { I18nProvider } from "@/site/i18n/client";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { isLaunchCategory } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { getPulseDemand } from "@/site/sitedata/pulse";

// A research topic (spec 01 §5–§6, spec 04 §5.3/§5.6, spec 09 G8–G10). SERVER GATE FIRST:
// the article file is read only when the viewer can read the topic; otherwise the app's
// locked preview is built from public catalogue fields. Site-only blocks (apps of the topic,
// old-site links, App Store promo) follow on both.
// Unknown or non-launch slugs never get here (the proxy serves the old page); 404 defensively.

type Props = { params: Promise<{ lang: string; slug: string }> };

async function publicTopic(lang: Locale, slug: string) {
  if (!isLaunchCategory(slug)) return null;
  const catalog = await getCatalog(lang);
  const category = catalog.categories.find((c) => c.slug === slug);
  return category ? { catalog, category } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isLocale(lang)) return {};
  const topic = await publicTopic(lang, slug);
  if (!topic) return {};
  const { category } = topic;
  // Public fields only (name, summary, cover) — the same for readable and locked viewers.
  // <title> keeps the keywords the old topic pages ranked for (review seo S2); the H1 stays the
  // app's topic name. The description is the app's summary, clamped for snippets (S10).
  const title = topicTitle(researchStrings[lang], category.name);
  const description = clampDescription(category.summary, lang);
  const alternates = localeAlternates(lang, `segment/${slug}`);
  const image = {
    url: mediaAbsoluteUrl(category.cover, SITE_URL, 1200),
    width: category.cover.width,
    height: category.cover.height,
    alt: category.cover.alt,
  };
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
      images: [image],
    },
    twitter: { card: "summary_large_image", title: withBrand(title, lang), description, images: [image.url] },
    // Free and locked topics are both indexable: the preview shows only public fields (spec 09 G9).
    robots: TOPIC_ROBOTS,
  };
}

export default async function ResearchTopicPage({ params }: Props) {
  const { lang, slug } = await params;
  if (!isLocale(lang)) notFound();
  const [topic, t, viewer, manifest] = await Promise.all([publicTopic(lang, slug), getT(lang), getViewer(), getManifest()]);
  if (!topic) notFound();
  const { catalog, category } = topic;
  const readable = viewer.canReadResearch(slug);
  const canonical = `${SITE_URL}/${lang}/segment/${slug}`;
  const coverUrl = mediaAbsoluteUrl(category.cover, SITE_URL, 1200);
  const backHref = routes.research(lang);
  const clientStrings = t.pick(RESEARCH_ARTICLE_UI_KEYS);
  // JSON-LD shared by both branches (review seo S9): content dates from the manifest (collection
  // date of the app's content, last import), breadcrumb inApp › Разборы › topic.
  const dates = { datePublished: manifest.collectionDate, dateModified: manifest.contentBuiltAt };
  const breadcrumbId = `${canonical}#breadcrumb`;
  const breadcrumb = breadcrumbList(breadcrumbId, [
    ["inApp", `${SITE_URL}/${lang}`],
    [t("Разборы"), `${SITE_URL}/${lang}/segment`],
    [category.name, canonical],
  ]);

  if (!readable) {
    return (
      <I18nProvider locale={lang} strings={clientStrings}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLd({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebPage",
                  "@id": canonical,
                  url: canonical,
                  name: category.name,
                  description: category.summary,
                  inLanguage: lang,
                  primaryImageOfPage: { "@type": "ImageObject", url: coverUrl },
                  ...dates,
                  isPartOf: { "@id": `${SITE_URL}/#website` },
                  breadcrumb: { "@id": breadcrumbId },
                },
                breadcrumb,
              ],
            }),
          }}
        />
        {/* The locked gate sits on `paper`, not reading paper (ClarityContentAccess.swift:115). */}
        <div className="ia-rs-locked-page">
          <LockedToolbar backHref={backHref} />
          <div className="ia-page ia-page--reading">
            <LockedPreview locale={lang} category={category} t={t} />
          </div>
          <div className="ia-page ia-page--reading">
            <TopicExtras locale={lang} slug={slug} />
          </div>
        </div>
      </I18nProvider>
    );
  }

  // Readable: load the gated article (and the UI pack for the corpus sentence).
  const [research, ui, pulse] = await Promise.all([getResearch(lang, slug), getUI(lang), getPulseDemand()]);
  if (!research) notFound();
  // «Пульс категории» (TopicExtras → CategoryPulse) renders under exactly this test.
  const toc = hasCategoryPulse(pulse, slug)
    ? [...research.toc, { id: "category-pulse", title: pulseStrings[lang].embedTitle, depth: 0 as const }]
    : research.toc;

  // Idea cards: readable ideas carry their card copy; paid ones only {slug, cover}.
  const slugs = articleIdeaSlugs(research);
  const covers = new Map(catalog.ideas.map((idea) => [idea.slug, idea.cover]));
  const readableIdeas = slugs.filter((id) => viewer.canReadIdea(id));
  const cards = readableIdeas.length > 0 ? await getCards(lang) : null;
  const ideas = new Map<string, ArticleIdea>();
  for (const id of slugs) {
    const cover = covers.get(id);
    if (!cover) continue;
    const copy = viewer.canReadIdea(id) ? cards?.ideas[id] : undefined;
    ideas.set(
      id,
      copy
        ? {
            slug: id,
            locked: false,
            cover,
            title: copy.title,
            description: copy.description,
            // ClarityIdeaCard always shows the category line, in the article too.
            categoryName: ideaCategoryName(catalog, id),
          }
        : { slug: id, locked: true, cover },
    );
  }

  return (
    <I18nProvider locale={lang} strings={clientStrings}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Article",
                "@id": `${canonical}#article`,
                mainEntityOfPage: { "@type": "WebPage", "@id": canonical, breadcrumb: { "@id": breadcrumbId } },
                url: canonical,
                headline: research.name,
                description: research.summary,
                image: [coverUrl],
                inLanguage: lang,
                ...dates,
                isAccessibleForFree: research.free,
                author: ORGANIZATION,
                publisher: ORGANIZATION,
                isPartOf: { "@id": `${SITE_URL}/#website` },
              },
              breadcrumb,
            ],
          }),
        }}
      />
      <div className="ia-reading-page">
        <ArticleToolbar slug={slug} title={research.name} toc={toc} backHref={backHref} />
        <div className="ia-rs-layout">
          <div className="ia-rs-main">
            <div className="ia-page ia-page--reading">
              <ResearchArticle research={research} ui={ui} locale={lang} t={t} ideas={ideas} />
              <TopicExtras locale={lang} slug={slug} />
            </div>
          </div>
          <TocRail toc={toc} />
        </div>
      </div>
    </I18nProvider>
  );
}
