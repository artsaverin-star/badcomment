import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import { listIdeas } from "@/lib/ideas";
import { getSegmentSummary } from "@/lib/segmentSummary";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

// «Главная» — лендинг про продукт (для всех). Каталог живёт на /catalog.
export default async function Home() {
  const locale = await getLocale();
  const premium = await isPremium();
  const loggedIn = !!(await getSessionUser());
  const { domains, totalReviews } = getCatalogData(locale, premium);

  // Beautiful per-category cover cards (salute + selling copy) for live cats.
  const catCards = domains
    .flatMap((d) => d.categories)
    .filter((c) => c.live)
    .map((c) => {
      const summary = getSegmentSummary(c.slug);
      if (!summary) return null;
      const itemAvg = (ev: { rating: number }[]) => (ev.length ? ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length : 5);
      const negs = summary.items.filter((it) => itemAvg(it.evidence) < 3.4);
      const painItem = (negs.length ? negs : summary.items).sort((a, b) => b.observationCount - a.observationCount)[0];
      const painHook = painItem ? painItem.title.split(/\s[—–-]\s/)[0].trim() : "";
      return {
        slug: c.slug,
        name: c.name,
        icons: c.apps.map((a) => a.icon).filter((x): x is string => !!x),
        apps: c.appsCount,
        reviews: summary.reviewsScanned,
        observations: summary.items.reduce((s, i) => s + i.observationCount, 0),
        ideas: listIdeas().filter((i) => i.category === c.slug).length,
        painHook,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Landing catCards={catCards} locale={locale} totalReviews={totalReviews} loggedIn={loggedIn} />
    </main>
  );
}
