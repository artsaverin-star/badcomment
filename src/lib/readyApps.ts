import insights from "@/data/insights.json";
import categoriesData from "@/data/categories.json";
import metaData from "@/data/categories-meta.json";

// "Ready" = the app has an actual разбор shipped in insights.json. The home and
// segment pages render ready apps/categories in full colour and everything else
// (no разбор yet) in greyscale, so the catalog visibly shows what's done.

// "Done" now means rebuilt by the polarity-balanced pipeline (`balanced: true`),
// not merely "has any insights". Older negative-only разборы stay greyscale until
// re-extracted with positives.
const READY = new Set(
  (insights as Array<{ productId?: string; insights?: unknown[]; balanced?: boolean }>)
    .filter((p) => p.balanced === true && p.productId && Array.isArray(p.insights) && p.insights.length > 0)
    .map((p) => p.productId as string),
);

export function hasInsight(productId: string | null | undefined): boolean {
  return !!productId && READY.has(productId);
}

export function isCategoryReady(apps: Array<{ productId: string | null }>): boolean {
  return apps.some((a) => hasInsight(a.productId));
}

// Hand-authored gem разборы (Calm-style, pre-balanced-flag) live in these two
// catalog categories. They are content-balanced (built on all 1-5★ reviews)
// but predate the `balanced` stamp, so direct pages stay publishable for them.
const GEM_CATEGORIES = new Set(["meditation-mindfulness", "sleep-audio"]);
const GEM_PIDS = new Set<string>();
for (const d of categoriesData as Array<{ categories: Array<{ slug: string; apps?: string[] }> }>) {
  for (const c of d.categories) {
    if (!GEM_CATEGORIES.has(c.slug)) continue;
    for (const a of c.apps ?? []) {
      const m =
        (metaData as Record<string, { productId?: string }>)[`${c.slug}:${a}`] ??
        (metaData as Record<string, { productId?: string }>)[a];
      if (m?.productId) GEM_PIDS.add(m.productId);
    }
  }
}

// Direct /<slug> pages: publishable = balanced разбор OR hand-authored gem.
// Legacy negative-only разборы 404 until re-extracted.
export function isPublishable(productId: string | null | undefined): boolean {
  return !!productId && (READY.has(productId) || GEM_PIDS.has(productId));
}
