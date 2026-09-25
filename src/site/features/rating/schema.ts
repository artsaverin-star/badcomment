import { SITE_URL } from "../../config";
import { toOldLocale, type Locale } from "../../i18n/locales";
import { format } from "../../i18n/strings";
import type { T } from "../../i18n/translate";
import { isLaunchCategory } from "../../manifest.generated";
import type { RatingAppEntry, RatingNiche, RatingNicheCard, RatingScenarioView } from "../../sitedata/rating";
import { ORGANIZATION, breadcrumbList } from "../research/seo";
import { iconLd, shotLd } from "./media";
import { dataCanonical, h1Name } from "./seo";
import { ratingStrings } from "./strings";

// JSON-LD of the rating pages (spec 11 §6.4), within Google's structured-data rules:
//   • lists are ItemLists of plain ListItems (position, name, url): no nested SoftwareApplication
//     (without `offers` those are invalid "Software App" items) and no rating markup on lists;
//   • no App Store `aggregateRating` anywhere: it is another site's rating ("Don't aggregate
//     reviews or ratings from other websites"); an app page carries inApp's own editorial
//     Review on the 0–100 scale instead;
//   • every url / @id / breadcrumb item is the page's canonical (dataCanonical: de/fr/ja → the
//     /en/… page); names stay in the page locale.
// Each builder returns the object for `<script type="application/ld+json">`; serialize it with
// research/seo.ts `jsonLd()` (escapes "<").

const CONTEXT = "https://schema.org";
/** Screenshots in an app's MobileApplication node. */
const LD_SHOTS = 5;

/** inApp › Рейтинги, the head of every rating breadcrumb. */
function trail(locale: Locale, t: T): Array<readonly [string, string]> {
  return [
    ["inApp", dataCanonical(locale, "")],
    [t("Рейтинги"), dataCanonical(locale, "rating")],
  ];
}

/** The catalogue (/<L>/rating): CollectionPage → ItemList of the niches in display order. */
export function catalogueJsonLd(locale: Locale, t: T, niches: ReadonlyArray<Pick<RatingNicheCard, "slug" | "name">>) {
  const s = ratingStrings[locale];
  const canonical = dataCanonical(locale, "rating");
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": canonical,
        url: canonical,
        name: s.catalogTitle,
        description: s.metaDescription,
        inLanguage: locale,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        breadcrumb: { "@id": `${canonical}#breadcrumb` },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: niches.length,
          itemListElement: niches.map((n, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: n.name,
            url: dataCanonical(locale, `rating/${n.slug}`),
          })),
        },
      },
      breadcrumbList(`${canonical}#breadcrumb`, trail(locale, t)),
    ],
  };
}

/** A niche (/<L>/rating/<niche>): ItemList of every app by rank (position = rank), BreadcrumbList. */
export function nicheJsonLd(
  locale: Locale,
  t: T,
  niche: Pick<RatingNiche, "slug" | "name" | "seoName"> & { apps: ReadonlyArray<Pick<RatingAppEntry, "slug" | "title" | "rank">> },
) {
  const path = `rating/${niche.slug}`;
  const canonical = dataCanonical(locale, path);
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "ItemList",
        "@id": `${canonical}#list`,
        name: format(ratingStrings[locale].nicheH1, { name: h1Name(locale, niche) }),
        numberOfItems: niche.apps.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: niche.apps.map((a) => ({
          "@type": "ListItem",
          position: a.rank,
          name: a.title,
          url: dataCanonical(locale, `${path}/${a.slug}`),
        })),
      },
      breadcrumbList(`${canonical}#breadcrumb`, [...trail(locale, t), [niche.name, canonical]]),
    ],
  };
}

/**
 * An app of a niche (/<L>/rating/<niche>/<app>): MobileApplication with its App Store icon, up to
 * 5 screenshots, the store link and inApp's editorial Review (the verdict, the review score of
 * 0–100), BreadcrumbList. No aggregateRating, no applicationCategory (a per-niche category would
 * give one app different categories on different URLs), no offers (no price data).
 */
export function appJsonLd(
  locale: Locale,
  t: T,
  niche: Pick<RatingNiche, "slug" | "name">,
  app: Pick<RatingAppEntry, "id" | "slug" | "title" | "realScore" | "verdict" | "icon" | "shots">,
) {
  const nichePath = `rating/${niche.slug}`;
  const canonical = dataCanonical(locale, `${nichePath}/${app.slug}`);
  const store = /^\d+$/.test(app.id) ? `https://apps.apple.com/app/id${app.id}` : null;
  return {
    "@context": CONTEXT,
    "@graph": [
      {
        "@type": "MobileApplication",
        "@id": `${canonical}#app`,
        name: app.title,
        url: canonical,
        operatingSystem: "iOS",
        ...(app.icon ? { image: iconLd(app.icon) } : {}),
        ...(app.shots.length > 0 ? { screenshot: app.shots.slice(0, LD_SHOTS).map(shotLd) } : {}),
        ...(store ? { installUrl: store, sameAs: store } : {}),
        ...(app.verdict && app.realScore !== null
          ? {
              review: {
                "@type": "Review",
                author: ORGANIZATION,
                publisher: { "@id": ORGANIZATION["@id"] },
                reviewBody: app.verdict,
                inLanguage: toOldLocale(locale),
                reviewRating: { "@type": "Rating", ratingValue: app.realScore, bestRating: 100, worstRating: 0 },
              },
            }
          : {}),
      },
      breadcrumbList(`${canonical}#breadcrumb`, [
        ...trail(locale, t),
        [niche.name, dataCanonical(locale, nichePath)],
        [app.title, canonical],
      ]),
    ],
  };
}

/**
 * A task of a niche (/<L>/rating/<niche>/tasks/<n>): ItemList of the rated apps the research names
 * for it (unordered: «Порядок списка не означает рейтинг пригодности»), BreadcrumbList. A task of
 * a non-launch niche exists in Russian only, so its canonical is the ru page.
 */
export function taskJsonLd(
  locale: Locale,
  t: T,
  view: Pick<RatingScenarioView, "niche" | "scenario"> & { apps: ReadonlyArray<Pick<RatingAppEntry, "slug" | "title">> },
) {
  const { niche, scenario, apps } = view;
  const nichePath = `rating/${niche.slug}`;
  const canonical = dataCanonical(locale, `${nichePath}/tasks/${scenario.n}`, { en: isLaunchCategory(niche.slug) });
  return {
    "@context": CONTEXT,
    "@graph": [
      ...(apps.length > 0
        ? [
            {
              "@type": "ItemList",
              "@id": `${canonical}#list`,
              name: scenario.job,
              numberOfItems: apps.length,
              itemListOrder: "https://schema.org/ItemListUnordered",
              itemListElement: apps.map((a, i) => ({
                "@type": "ListItem",
                position: i + 1,
                name: a.title,
                url: dataCanonical(locale, `${nichePath}/${a.slug}`),
              })),
            },
          ]
        : []),
      breadcrumbList(`${canonical}#breadcrumb`, [
        ...trail(locale, t),
        [niche.name, dataCanonical(locale, nichePath)],
        [scenario.job, canonical],
      ]),
    ],
  };
}
