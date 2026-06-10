import insights from "@/data/insights.json";
import categoriesData from "@/data/categories.json";
import metaData from "@/data/categories-meta.json";

// "Ready" = the app has an actual разбор shipped in insights.json. The home and
// segment pages render ready apps/categories in full colour and everything else
// (no разбор yet) in greyscale, so the catalog visibly shows what's done.

// "Done" now means rebuilt by the polarity-balanced pipeline (`balanced: true`),
// not merely "has any insights". Older negative-only разборы stay greyscale until
// re-extracted with positives.
// Publication standard: a разбор ships only when it digests the full review
// sample — 500 reviews minimum. Anything thinner is not a credible разбор and
// stays greyscale/unpublished until the app is re-fed or replaced.
const MIN_REVIEWS = 500;
const READY = new Set(
  (insights as Array<{ productId?: string; insights?: unknown[]; balanced?: boolean; reviewsScanned?: number }>)
    .filter(
      (p) =>
        p.balanced === true &&
        p.productId &&
        Array.isArray(p.insights) &&
        p.insights.length > 0 &&
        (p.reviewsScanned ?? 0) >= MIN_REVIEWS,
    )
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

// Direct /<slug> pages: publishable = (balanced разбор OR hand-authored gem)
// AND the 500-review sample standard. Legacy negative-only and thin разборы
// 404 until re-fed or the app is replaced in the catalog.
const SCANNED = new Map(
  (insights as Array<{ productId?: string; reviewsScanned?: number }>).map((p) => [
    p.productId as string,
    p.reviewsScanned ?? 0,
  ]),
);
export function isPublishable(productId: string | null | undefined): boolean {
  if (!productId) return false;
  if ((SCANNED.get(productId) ?? 0) < MIN_REVIEWS) return false;
  return READY.has(productId) || GEM_PIDS.has(productId);
}
