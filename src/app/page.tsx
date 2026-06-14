import { Header } from "@saverin/ui-web";
import { listDomains } from "@/lib/researchCategories";
import { listAppSlugs, getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import { isPremium, isFreeCategory } from "@/lib/premium";
import segmentInsights from "@/data/segment-insights.json";
import CatalogBrowser, { type BrowseDomain } from "@/components/CatalogBrowser";
import Landing, { type LandingApp } from "@/components/Landing";

export const dynamic = "force-dynamic";

// A category is "live" once its synthesis is published (≥10 разборов). Others
// show a «Скоро» status. Live categories outside the free set are premium-locked.
const LIVE = new Set(Object.keys(segmentInsights as Record<string, unknown>));

export default async function Home() {
  const locale = await getLocale();
  const tr = t(locale);
  const premium = await isPremium();
  const loggedIn = !!(await getSessionUser());

  const domainViews = listDomains(locale);
  const domains: BrowseDomain[] = domainViews.map((d) => ({
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

  // Landing data (logged-out only): a sample of app icons + headline stats.
  const landingApps: LandingApp[] = [];
  const seen = new Set<string>();
  for (const d of domainViews) {
    for (const c of d.categories) {
      for (const a of c.apps) {
        if (a.icon && !seen.has(a.name)) {
          seen.add(a.name);
          const slug = a.productId && hasInsight(a.productId) ? getSlugByProductId(a.productId) : null;
          landingApps.push({ name: a.name, icon: a.icon, slug });
        }
      }
    }
  }
  // Analyzed apps (with a разбор page) for the catalog "Приложения" view.
  const catalogApps = landingApps
    .filter((a) => a.slug)
    .map((a) => ({ name: a.name, icon: a.icon, slug: a.slug as string }))
    .sort((a, b) => a.name.localeCompare(b.name, "ru"));

  const stats = {
    apps: listAppSlugs().length,
    reviews: Object.values(segmentInsights as Record<string, { reviewsScanned?: number }>).reduce(
      (s, c) => s + (c.reviewsScanned ?? 0),
      0,
    ),
    categories: LIVE.size,
  };

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      {!loggedIn ? (
        <>
          <Landing apps={landingApps} stats={stats} locale={locale} />
          <h2 className="mb-6 mt-10 text-[26px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            {locale === "en" ? "Catalog" : "Каталог"}
          </h2>
        </>
      ) : (
        <Header
          size="L"
          as="h1"
          className="mb-8 items-center text-center"
          title={tr.market2.title}
          description={<span className="mx-auto block max-w-2xl">{tr.market2.indexSubtitle}</span>}
        />
      )}
      <CatalogBrowser domains={domains} premium={premium} apps={catalogApps} />
    </main>
  );
}
