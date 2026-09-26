import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { getPulseDemand } from "@/site/sitedata/pulse";
import { CategoryPulseHero } from "./CategoryPulseHero";
import { allNeedsPhrase, categoryNeeds } from "./query";
import { pulseStrings } from "./strings";
import "./pulse-kit.css";
import "./category-pulse-hero.css";

/**
 * «Пульс категории» on a new topic page, right under the hero: in ResearchArticle's `afterHero`
 * slot (readable) and in LockedPreview's (locked, above the Plus card). Renders nothing for a
 * category without needs; the page's TOC entry uses the same test (hasCategoryPulse).
 *
 * `corpus` is the topic's own corpus — the catalogue's, which the article's hero sentence prints
 * («Мы изучили 18 442 отзыва о работе 61 приложения»). The block's subtitle repeats exactly those
 * figures, never the Pulse file's own count (it drops a few duplicate texts: 18 425), so a page
 * never shows two nearly equal numbers for one category.
 */
export async function CategoryPulse({ locale, slug, corpus }: { locale: Locale; slug: string; corpus: { reviews: number; apps: number } }) {
  const data = await getPulseDemand();
  const needs = categoryNeeds(data, slug);
  if (!needs.length) return null;
  const s = pulseStrings[locale];
  return (
    <CategoryPulseHero
      needs={needs}
      locale={locale}
      strings={s}
      id="category-pulse"
      categoryId={slug}
      heading={s.embedTitle}
      stats={{ reviewCount: corpus.reviews, appCount: corpus.apps }}
      allLabel={allNeedsPhrase(locale, s, needs.length)}
      allHref={routes.pulse(locale, { category: slug })}
      needHref={(id) => routes.pulseNeed(locale, id)}
    />
  );
}
