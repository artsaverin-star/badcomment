import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

// «Главная» — лендинг про продукт (для всех). Каталог живёт на /catalog.
export default async function Home() {
  const locale = await getLocale();
  const premium = await isPremium();
  const loggedIn = !!(await getSessionUser());
  const { catalogApps, totalReviews } = getCatalogData(locale, premium);
  const apps = catalogApps
    .slice(0, 48)
    .map((a) => ({ name: a.name, icon: a.icon ?? "", slug: a.slug, reviews: a.reviews, free: a.free }));

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Landing apps={apps} locale={locale} totalReviews={totalReviews} loggedIn={loggedIn} />
    </main>
  );
}
