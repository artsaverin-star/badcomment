import { listDomains } from "./researchCategories";
import { hasInsight } from "./readyApps";
import { getSlugByProductId } from "./appSlugs";
import { getProductInsights } from "./insights";
import { isFreeCategory } from "./premium";
import { isActiveCategory } from "./categoryVisibility";
import segmentInsights from "@/data/segment-insights.json";
import hidden from "@/data/hidden-categories.json";
import type { Locale } from "./i18n";
import type { BrowseDomain, BrowseAppItem } from "@/components/CatalogBrowser";
import { totals } from "./reviews";

// A category is "live" once its synthesis is published (≥10 разборов).
const LIVE = new Set(Object.keys(segmentInsights as Record<string, unknown>));

// Catalog clean-up: whole domains and individual categories the user retired
// from the catalog (were stale «Скоро» placeholders). Filtered out everywhere
// catalog data is read (catalog pages + home landing).
const HIDDEN_DOMAINS = new Set(hidden.domains);
const HIDDEN_CATEGORIES = new Set(hidden.categories);

// Shared catalog data for the «Категории/Приложения» pages and the «Главная»
// landing (which only needs a slice + total).
export function getCatalogData(locale: Locale, premium: boolean): {
  domains: BrowseDomain[];
  catalogApps: BrowseAppItem[];
  totalReviews: number;
} {
  const domainViews = listDomains(locale).filter((d) => !HIDDEN_DOMAINS.has(d.slug));
  const domains: BrowseDomain[] = domainViews
    .map((d) => ({
    slug: d.slug,
    name: d.name,
    categories: d.categories.filter((c) => !HIDDEN_CATEGORIES.has(c.slug)).map((c) => {
      // "Скоро" for everything except the active (rebuilt) categories.
      const live = LIVE.has(c.slug) && isActiveCategory(c.slug);
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
    }))
    .filter((d) => d.categories.length > 0);

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
      if (!isActiveCategory(c.slug)) continue;
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
  // The public scale number follows the complete review archive. The people's
  // rating is an editorial sample and intentionally keeps its own, smaller count.
  const totalReviews = totals().sourceReviews;
  return { domains, catalogApps, totalReviews };
}
