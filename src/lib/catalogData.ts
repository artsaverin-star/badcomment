import { listDomains } from "./researchCategories";
import { hasInsight } from "./readyApps";
import { getSlugByProductId } from "./appSlugs";
import { insightFacts } from "./insights";
import { isFreeCategory } from "./premium";
import { isActiveCategory } from "./categoryVisibility";
import hidden from "@/data/hidden-categories.json";
import type { Locale } from "./i18n";
import { totals } from "./reviews";
import { dataFile } from "./dataFile";

// The catalogue shapes the retired old site's CatalogBrowser rendered (moved here with it gone).
export type BrowseApp = { name: string; icon: string | null; ready?: boolean };
export type BrowseAppItem = { name: string; icon: string | null; slug: string; reviews: number; free: boolean };
export type BrowseCategory = {
  slug: string;
  name: string;
  appsCount: number;
  apps: BrowseApp[];
  live: boolean; // synthesis published (≥10 разборов)
  free: boolean; // free for everyone (the flagship set)
  locked: boolean; // live but premium-gated for this viewer
};
export type BrowseDomain = { slug: string; name: string; categories: BrowseCategory[] };

// A category is "live" once its synthesis is published (≥10 разборов).
let live: Set<string> | null = null;
const isLive = (slug: string) => (live ??= new Set(Object.keys(dataFile<Record<string, unknown>>("segment-insights.json")))).has(slug);

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
      const live = isLive(c.slug) && isActiveCategory(c.slug);
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
          reviews: insightFacts()[a.productId]?.[2] ?? 0,
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
