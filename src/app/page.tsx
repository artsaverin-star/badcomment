import { Header } from "@saverin/ui-web";
import { listDomains } from "@/lib/researchCategories";
import { isCategoryReady } from "@/lib/readyApps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import CatalogBrowser, { type BrowseDomain } from "@/components/CatalogBrowser";

export const dynamic = "force-dynamic";

// Homepage: searchable, filterable catalog of every life-domain and its
// sub-categories of leader apps. Each sub-category links to /segment/<slug>.
export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const domains: BrowseDomain[] = listDomains(locale).map((d) => ({
    slug: d.slug,
    name: d.name,
    categories: d.categories.map((c) => ({
      slug: c.slug,
      name: c.name,
      appsCount: c.apps.length,
      apps: c.apps.map((a) => ({ name: a.name, icon: a.icon ?? null })),
      ready: !c.deprioritized && isCategoryReady(c.apps),
      deprioritized: !!c.deprioritized,
    })),
  }));

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-8 items-center text-center"
        title={tr.market2.title}
        description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
      />
      <CatalogBrowser domains={domains} />
    </main>
  );
}
