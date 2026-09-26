import { publicHref } from "@/lib/oldHref";
import { CategoryPulseHero } from "@/site/features/pulse/CategoryPulseHero";
import { allNeedsPhrase, categoryNeeds } from "@/site/features/pulse/query";
import { pulseStrings } from "@/site/features/pulse/strings";
import { getPulseDemand } from "@/site/sitedata/pulse";
import "@/site/features/pulse/pulse-kit.css";
import "@/site/features/pulse/category-pulse-hero.css";

/**
 * The old site's bridge into «Пульс» on the pages still served in place (old topic pages and
 * NicheDossier): the same «Пульс категории» card as the new topic pages (CategoryPulseHero,
 * whose CSS is self-contained: this layout has no site.css) — that category's needs, and
 * nothing when it has none. Links leave the old site on purpose (publicHref, reviewed below), as
 * plain <a>. The review archive (/reviews, /reviews/<slug>) is a new-site section since
 * 2026-09-24: its pages carry CategoryPulse / PulseTop themselves, and its archived old copies
 * under /<ru|en>/old/reviews/** have no block.
 *
 * `stats` are the figures the host page itself prints next to the block (the topic's
 * «reviews scanned», the dossier's «отзывов в архиве»): the subtitle repeats them, never the
 * Pulse file's own count (it drops a few duplicate texts: 45 975), so one screen never shows
 * two nearly equal numbers for one category.
 */
export async function LegacyPulseLink({
  locale,
  slug,
  stats,
}: {
  locale: "ru" | "en";
  slug: string;
  stats: { reviewCount: number; appCount: number };
}) {
  const data = await getPulseDemand();
  const all = categoryNeeds(data, slug);
  if (!all.length) return null;
  const s = pulseStrings[locale];
  const allHref = publicHref(locale, `/pulse?category=${encodeURIComponent(slug)}`); // old-links: allow — deliberate bridge to the new Pulse tab.
  const needHref = (id: string) => publicHref(locale, `/pulse/${id}`); // old-links: allow — deliberate bridge to the new Pulse need page.
  return (
    <CategoryPulseHero
      needs={all}
      locale={locale}
      strings={s}
      id="category-pulse"
      categoryId={slug}
      heading={s.embedTitle}
      stats={stats}
      allLabel={allNeedsPhrase(locale, s, all.length)}
      allHref={allHref}
      needHref={needHref}
      plainLinks
      className="my-8"
    />
  );
}
