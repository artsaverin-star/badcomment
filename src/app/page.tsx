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
      // Plain, human one-liner for a first-time visitor — what this card is and
      // why it's useful. No store app-names (they're messy: "App: Subtitle, ...").
      const reviews = summary.reviewsScanned;
      const blurb = ru
        ? `Прочитали ${reviews.toLocaleString("ru-RU")} реальных отзывов на ${c.appsCount} приложений и разобрали, что людям нравится, на что они злятся и каких приложений им не хватает — готовый разбор ниши, если думаете сделать своё.`
        : `We read ${reviews.toLocaleString("en-US")} real reviews of ${c.appsCount} apps and broke down what people love, what frustrates them, and which apps are missing — a ready niche breakdown if you're thinking of building your own.`;
      return {
        slug: c.slug,
        name: c.name,
        icons: c.apps.map((a) => a.icon).filter((x): x is string => !!x),
        apps: c.appsCount,
        reviews,
        observations: summary.items.reduce((s, i) => s + i.observationCount, 0),
        ideas: listIdeas().filter((i) => i.category === c.slug).length,
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
