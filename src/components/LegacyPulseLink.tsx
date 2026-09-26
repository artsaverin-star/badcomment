import { publicHref } from "@/lib/oldHref";
import { CategoryPulseHero } from "@/site/features/pulse/CategoryPulseHero";
import { allNeedsPhrase, categoryNeeds } from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import { getPulseDemand } from "@/site/sitedata/pulse";
import "@/site/features/pulse/pulse-kit.css";
import "@/site/features/pulse/category-pulse-hero.css";

/**
 * The old archive's bridge into «Пульс» (review hub /reviews, /reviews/<slug>, old topic pages
 * and NicheDossier): the same «Пульс категории» card as the new topic pages (CategoryPulseHero,
 * whose CSS is self-contained: this layout has no site.css). With `slug` — that category's
 * needs, and nothing when it has none; without — the strongest needs across categories, with
 * their category names. Links leave the old site on purpose (publicHref, reviewed below), as
 * plain <a>.
 *
 * `stats` are the figures the host page itself prints next to the block (the archive header
 * «100 приложений · 46 072 отзывов», the dossier's «отзывов в архиве», the hub's totals): the
 * subtitle repeats them, never the Pulse file's own count (it drops a few duplicate texts:
 * 45 975), so one screen never shows two nearly equal numbers for one category.
 */
export async function LegacyPulseLink({
  locale,
  slug,
  stats,
}: {
  locale: "ru" | "en";
  slug?: string;
  stats: { reviewCount: number; appCount: number };
}) {
  const data = await getPulseDemand();
  const all = slug ? categoryNeeds(data, slug) : data.needs;
  if (!all.length) return null;
  const s = pulseStrings[locale];
  const names = slug ? undefined : new Map(data.categories.map((c) => [c.id, c.name[locale] || c.name.en]));
  const allHref = slug
    ? publicHref(locale, `/pulse?category=${encodeURIComponent(slug)}`) // old-links: allow — deliberate bridge to the new Pulse tab.
    : publicHref(locale, "/pulse"); // old-links: allow — deliberate bridge to the new Pulse tab.
  const needHref = (id: string) => publicHref(locale, `/pulse/${id}`); // old-links: allow — deliberate bridge to the new Pulse need page.
  return (
    <CategoryPulseHero
      needs={all}
      locale={locale}
      strings={s}
      id={slug ? "category-pulse" : "pulse-top"}
      categoryId={slug}
      heading={slug ? s.embedTitle : s.title}
      stats={stats}
      allLabel={allNeedsPhrase(locale, s, all.length)}
      allHref={allHref}
      needHref={needHref}
      categoryNames={names}
      plainLinks
      className="my-8"
    />
  );
}
