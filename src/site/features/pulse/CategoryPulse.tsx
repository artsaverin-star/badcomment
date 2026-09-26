import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { getPulseCategoryNames, getPulseDemand } from "@/site/sitedata/pulse";
import { CategoryPulseHero } from "./CategoryPulseHero";
import { allNeedsPhrase, categoryNeeds } from "./query";
import { pulseStrings } from "./strings";
import "./pulse-kit.css";
import "./category-pulse-hero.css";

/**
 * «Пульс категории» on a new topic page, right under the hero: in ResearchArticle's `afterHero`
 * slot (readable) and in LockedPreview's (locked, above the Plus card); and on the review
 * archive's category page (/<L>/reviews/<slug>), right under its header (the name and the
 * «100 приложений · 46 072 отзыва» line), before the apps or the lock card. Renders nothing for
 * a category without needs; the topic page's TOC entry uses the same test (hasCategoryPulse).
 *
 * `corpus` is the host page's own figures: on a topic page the topic's corpus — the catalogue's,
 * which the article's hero sentence prints («Мы изучили 18 442 отзыва о работе 61 приложения»);
 * on the archive page the reviews and apps under its name. The block's subtitle repeats exactly
 * those figures, never the Pulse file's own count (it drops a few duplicate texts: 18 425), so a
 * page never shows two nearly equal numbers for one category.
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

/**
 * «Пульс» across categories on the review archive's hub (/<L>/reviews), right under its header:
 * the strongest needs of every category (the file's order), each row naming its category (the
 * feed's names: the product catalogue's, else the file's), and «Все N потребностей →» to the
 * unfiltered feed. `totals` are the hub's own figures (its «71 категория · 4 623 приложения ·
 * 1 451 072 отзыва» line), repeated in the subtitle. Nothing when the Pulse file has no needs.
 */
export async function PulseTop({ locale, totals }: { locale: Locale; totals: { reviews: number; apps: number } }) {
  const data = await getPulseDemand();
  if (!data.needs.length) return null;
  const s = pulseStrings[locale];
  const names = await getPulseCategoryNames(locale, data);
  return (
    <CategoryPulseHero
      needs={data.needs}
      locale={locale}
      strings={s}
      id="pulse-top"
      heading={s.title}
      stats={{ reviewCount: totals.reviews, appCount: totals.apps }}
      allLabel={allNeedsPhrase(locale, s, data.needs.length)}
      allHref={routes.pulse(locale)}
      needHref={(id) => routes.pulseNeed(locale, id)}
      categoryNames={names}
    />
  );
}
