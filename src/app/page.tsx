import { Header } from "@saverin/ui-web";
import { listDomains } from "@/lib/researchCategories";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { isPremium, isFreeCategory } from "@/lib/premium";
import segmentInsights from "@/data/segment-insights.json";
import CatalogBrowser, { type BrowseDomain } from "@/components/CatalogBrowser";

export const dynamic = "force-dynamic";

// A category is "live" once its synthesis is published (≥10 разборов). Others
// show a «Скоро» status. Live categories outside the free set are premium-locked.
const LIVE = new Set(Object.keys(segmentInsights as Record<string, unknown>));

export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const premium = await isPremium();
  const domains: BrowseDomain[] = listDomains(locale).map((d) => ({
    slug: d.slug,
    name: d.name,
    categories: d.categories.map((c) => {
      const live = LIVE.has(c.slug);
      return {
        slug: c.slug,
        name: c.name,
        appsCount: c.apps.length,
        apps: c.apps.map((a) => ({ name: a.name, icon: a.icon ?? null })),
        live,
        free: isFreeCategory(c.slug),
        locked: live && !premium && !isFreeCategory(c.slug),
      };
    }),
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
      <CatalogBrowser domains={domains} premium={premium} />
    </main>
  );
}
