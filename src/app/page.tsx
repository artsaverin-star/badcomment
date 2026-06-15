import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import { listIdeas } from "@/lib/ideas";
import quoteRu from "@/data/quote-ru.json";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

// «Главная» — лендинг про продукт (для всех). Каталог живёт на /catalog.
export default async function Home() {
  const locale = await getLocale();
  const premium = await isPremium();
  const loggedIn = !!(await getSessionUser());
  const { domains, catalogApps, totalReviews } = getCatalogData(locale, premium);
  const apps = catalogApps
    .slice(0, 48)
    .map((a) => ({ name: a.name, icon: a.icon ?? "", slug: a.slug, reviews: a.reviews, free: a.free }));
  const categories = domains
    .flatMap((d) => d.categories)
    .filter((c) => c.live)
    .slice(0, 6)
    .map((c) => ({ name: c.name, slug: c.slug, count: c.appsCount }));
  const allIdeas = listIdeas();
  const ideas = allIdeas.slice(0, 4).map((i) => ({ title: i.title, slug: i.slug, categoryName: i.categoryName }));
  const liveCats = domains.flatMap((d) => d.categories).filter((c) => c.live).length;
  const stats = {
    reviews: totalReviews,
    apps: catalogApps.length,
    categories: liveCats,
    ideas: allIdeas.length,
  };
  // Несколько реальных цитат из отзывов (RU) — социальное доказательство.
  const quotes = Object.values(quoteRu as Record<string, string>)
    .filter((q) => q.length >= 50 && q.length <= 150)
    .slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Landing
        apps={apps}
        categories={categories}
        ideas={ideas}
        stats={stats}
        quotes={quotes}
        locale={locale}
        totalReviews={totalReviews}
        loggedIn={loggedIn}
      />
    </main>
  );
}
