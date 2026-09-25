import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { preconnect } from "react-dom";
import { RATING_UI_KEYS } from "@/site/features/rating/keys";
import { MZ_ORIGIN } from "@/site/features/rating/media";
import { RatingCatalog } from "@/site/features/rating/RatingCatalog";
import { RatingImageGuard } from "@/site/features/rating/RatingImageGuard";
import { RatingNicheCard } from "@/site/features/rating/RatingNicheCard";
import { catalogueJsonLd } from "@/site/features/rating/schema";
import { catalogueTitle, dataAlternates } from "@/site/features/rating/seo";
import { ratingClientStrings, ratingStrings } from "@/site/features/rating/strings";
import "@/site/features/rating/rating.css";
import { OG_LOCALE, TOPIC_ROBOTS, jsonLd, withBrand } from "@/site/features/research/seo";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { listRatingGroups, ratingShareImage } from "@/site/sitedata/rating";
import { DetailToolbar, Heading } from "@/site/ui";

// «Рейтинги» (/<L>/rating; web-only section; spec 11 §4.1, D7): the heading with the corpus size,
// the search «Приложение или задача», anchor chips to the 10 groups, then one section per group
// with a grid of niche cards — each an App Library–style folder of its top-4 icons, the topic
// name, the intro, the counts and the leader — and the honesty footnote. The grid is
// server-rendered and handed to the client search as its default content; typing switches to
// apps from every niche (RatingCatalog). Public, like the whole rating (D2). Same URL and
// canonical as the old rating index.

type Props = { params: Promise<{ lang: string }> };

/** Cards whose folder icons load eagerly (the first rows of the grid). */
const EAGER_CARDS = 6;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = ratingStrings[lang];
  const title = catalogueTitle(lang, listRatingGroups(lang).reduce((n, g) => n + g.cards.length, 0));
  const alternates = dataAlternates(lang, "rating");
  const image = ratingShareImage(lang);
  return {
    title,
    description: s.metaDescription,
    alternates,
    robots: TOPIC_ROBOTS,
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: withBrand(title, lang),
      description: s.metaDescription,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
      images: [image],
    },
    twitter: { card: "summary_large_image", title: withBrand(title, lang), description: s.metaDescription, images: [image] },
  };
}

export default async function RatingCatalogPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  preconnect(MZ_ORIGIN);
  const t = await getT(locale);
  const s = ratingStrings[locale];
  const groups = listRatingGroups(locale);
  // The display order (groups, then alphabetical) — also the JSON-LD ItemList order.
  const cards = groups.flatMap((g) => g.cards);
  const apps = cards.reduce((n, c) => n + c.count, 0);
  const eager = new Set(cards.slice(0, EAGER_CARDS).map((c) => c.slug));

  return (
    <>
      <RatingImageGuard />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(catalogueJsonLd(locale, t, cards)) }} />
      {/* The inline navigation title; a section root, so no «Назад». */}
      <DetailToolbar title={t("Рейтинги")} />
      <div className="ia-page ia-page--grid ia-page--stack">
        <Heading
          className="ia-rt-catalog__head"
          title={s.catalogTitle}
          subtitle={format(s.catalogLead, {
            apps: counted(locale, apps, s.appsWord),
            topics: counted(locale, cards.length, s.topicsInWord),
          })}
        />
        {s.dataNote ? <p className="ia-footnote">{s.dataNote}</p> : null}
        <I18nProvider locale={locale} strings={t.pick(RATING_UI_KEYS)} web={{ rating: ratingClientStrings(locale) }}>
          <RatingCatalog>
            <nav className="ia-chips ia-rt-groups" aria-label={s.groupsLabel}>
              {groups.map((g) => (
                <a key={g.id} className="ia-chip ia-chip--surface" href={`#group-${g.id}`}>
                  {s[`group_${g.id}` as const]}
                </a>
              ))}
            </nav>
            <div id="rating-niches">
              {groups.map((g) => (
                <section key={g.id} id={`group-${g.id}`} className="ia-rt-group" aria-labelledby={`group-${g.id}-title`}>
                  <div className="ia-section-head">
                    <h2 id={`group-${g.id}-title`} className="ia-section-title ia-section-title--bold">
                      {s[`group_${g.id}` as const]}
                    </h2>
                    <span className="ia-section-head__count">{t.number(g.cards.length)}</span>
                  </div>
                  <ul className="ia-grid ia-rt-niches">
                    {g.cards.map((card) => (
                      <RatingNicheCard key={card.slug} niche={card} locale={locale} variant="full" eager={eager.has(card.slug)} />
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </RatingCatalog>
        </I18nProvider>
        <p className="ia-footnote ia-footnote--gap">
          {t("Оценки и выводы основаны на сохранённых отзывах. Текущие версии приложений могли измениться.")}
        </p>
      </div>
    </>
  );
}
