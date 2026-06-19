import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import { listIdeas } from "@/lib/ideas";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { getNicheThesis } from "@/lib/nicheThesis";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

// «Главная» — лендинг про продукт (для всех). Каталог живёт на /catalog.
export default async function Home() {
  const locale = await getLocale();
  const ru = locale !== "en";
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
      // Hook = the governing thought (the niche's core insight) — the "затравка"
      // pulled from the breakdown. Blurb = a short plain line about what the card
      // is. No store app-names (they're messy: "App: Subtitle, ...").
      const hook = getNicheThesis(c.slug)?.governing || summary.lead || "";
      const reviews = summary.reviewsScanned;
      const blurb = ru
        ? `Прочитали ${reviews.toLocaleString("ru-RU")} отзывов на ${c.appsCount} приложений: что хвалят, на что злятся и каких не хватает — готовый разбор для тех, кто думает сделать своё.`
        : `We read ${reviews.toLocaleString("en-US")} reviews of ${c.appsCount} apps: what's loved, hated and missing — a ready breakdown for anyone thinking of building their own.`;
      return {
        slug: c.slug,
        name: c.name,
        icons: c.apps.map((a) => a.icon).filter((x): x is string => !!x),
        apps: c.appsCount,
        reviews,
        observations: summary.items.reduce((s, i) => s + i.observationCount, 0),
        ideas: listIdeas().filter((i) => i.category === c.slug).length,
        hook,
        blurb,
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Landing catCards={catCards} locale={locale} totalReviews={totalReviews} loggedIn={loggedIn} />
    </main>
  );
}
