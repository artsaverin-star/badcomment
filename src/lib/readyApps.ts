import insights from "@/data/insights.json";

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
