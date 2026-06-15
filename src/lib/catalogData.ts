import { listDomains } from "./researchCategories";
import { hasInsight } from "./readyApps";
import { getSlugByProductId } from "./appSlugs";
import { getProductInsights } from "./insights";
import { isFreeCategory } from "./premium";
import segmentInsights from "@/data/segment-insights.json";
import type { Locale } from "./i18n";
import type { BrowseDomain, BrowseAppItem } from "@/components/CatalogBrowser";

// A category is "live" once its synthesis is published (≥10 разборов).
const LIVE = new Set(Object.keys(segmentInsights as Record<string, unknown>));

// Shared catalog data for the «Категории/Приложения» pages and the «Главная»
// landing (which only needs a slice + total).
export function getCatalogData(locale: Locale, premium: boolean): {
  domains: BrowseDomain[];
  catalogApps: BrowseAppItem[];
  totalReviews: number;
} {
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

  const freeProducts = new Set<string>();
  for (const d of domainViews) {
    for (const c of d.categories) {
      if (!isFreeCategory(c.slug)) continue;
      for (const a of c.apps) if (a.productId) freeProducts.add(a.productId);
    }
  }

  const bySlug = new Map<string, BrowseAppItem>();
  const seen = new Set<string>();
  for (const d of domainViews) {
    for (const c of d.categories) {
      for (const a of c.apps) {
        if (!a.icon || seen.has(a.name)) continue;
        seen.add(a.name);
        if (!(a.productId && hasInsight(a.productId))) continue;
        const slug = getSlugByProductId(a.productId);
        if (!slug || bySlug.has(slug)) continue;
        bySlug.set(slug, {
          name: a.name,
          icon: a.icon,
          slug,
          reviews: getProductInsights(a.productId)?.reviewsScanned ?? 0,
          free: freeProducts.has(a.productId),
        });
      }
    }
  }
  const catalogApps = [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const totalReviews = catalogApps.reduce((s, a) => s + a.reviews, 0);
  return { domains, catalogApps, totalReviews };
}
