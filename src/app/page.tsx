import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import { listIdeas } from "@/lib/ideas";
import { ideaCard } from "@/lib/regenCards";
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
    .flatMap((d) => d.categories.map((c) => ({ ...c, domain: d.slug })))
    .filter((c) => c.live)
    .slice(0, 16)
    .map((c) => ({ name: c.name, slug: c.slug, count: c.appsCount, domain: c.domain }));
  const catToDomain = new Map<string, string>();
  for (const d of domains) for (const c of d.categories) catToDomain.set(c.slug, d.slug);
  const ideas = listIdeas()
    .slice(0, 10)
    .map((i) => {
      const ov = ideaCard(i.slug, locale);
      return {
        title: ov?.title ?? i.title,
        slug: i.slug,
        categoryName: i.categoryName,
        oneLiner: ov?.oneLiner ?? i.oneLiner,
        domain: catToDomain.get(i.category) ?? "",
        stats: i.stats,
      };
    });
  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Landing
        apps={apps}
        categories={categories}
        ideas={ideas}
        locale={locale}
        totalReviews={totalReviews}
        loggedIn={loggedIn}
      />
    </main>
  );
}
