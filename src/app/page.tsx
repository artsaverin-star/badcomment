import { Header } from "@saverin/ui-web";
import { listDomains } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { getProductInsights } from "@/lib/insights";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import { isPremium, isFreeCategory } from "@/lib/premium";
import segmentInsights from "@/data/segment-insights.json";
import CatalogBrowser, { type BrowseDomain, type BrowseAppItem } from "@/components/CatalogBrowser";
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
        apps: c.apps.map((a) => ({ name: a.name, icon: a.icon ?? null, ready: hasInsight(a.productId) })),
        live,
        free: isFreeCategory(c.slug),
        locked: live && !premium && !isFreeCategory(c.slug),
      };
    }),
  }));

  // Products that sit in at least one free category are free for everyone.
  const freeProducts = new Set<string>();
  for (const d of domainViews) {
    for (const c of d.categories) {
      if (!isFreeCategory(c.slug)) continue;
      for (const a of c.apps) if (a.productId) freeProducts.add(a.productId);
    }
  }

  // Landing data (logged-out only): app icons + real per-app review counts.
  const landingApps: LandingApp[] = [];
  const seen = new Set<string>();
  for (const d of domainViews) {
    for (const c of d.categories) {
      for (const a of c.apps) {
        if (a.icon && !seen.has(a.name)) {
          seen.add(a.name);
          const ready = !!(a.productId && hasInsight(a.productId));
          const slug = ready ? getSlugByProductId(a.productId!) : null;
          const reviews = ready ? getProductInsights(a.productId!)?.reviewsScanned ?? 0 : 0;
          const free = !!(a.productId && freeProducts.has(a.productId));
          landingApps.push({ name: a.name, icon: a.icon, slug, reviews, free });
        }
      }
    }
  }
  // Analyzed apps (with a разбор page) for the catalog "Приложения" view,
  // deduped by slug (the same app can appear in several categories).
  const bySlug = new Map<string, BrowseAppItem>();
  for (const a of landingApps) {
    if (a.slug && !bySlug.has(a.slug)) {
      bySlug.set(a.slug, { name: a.name, icon: a.icon, slug: a.slug, reviews: a.reviews ?? 0, free: a.free ?? false });
    }
  }
  const catalogApps = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  // Real grand total of reviews analyzed across the published deck.
  const totalReviews = catalogApps.reduce((s, a) => s + a.reviews, 0);

  return (
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      {!loggedIn ? (
        <>
          <Landing apps={landingApps} locale={locale} totalReviews={totalReviews} />
          <h2 className="mb-6 mt-12 text-[22px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">
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
