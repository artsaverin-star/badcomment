import insights from "@/data/insights.json";

// "Ready" = the app has an actual разбор shipped in insights.json. The home and
// segment pages render ready apps/categories in full colour and everything else
// (no разбор yet) in greyscale, so the catalog visibly shows what's done.

const READY = new Set(
  (insights as Array<{ productId?: string; insights?: unknown[] }>)
    .filter((p) => p.productId && Array.isArray(p.insights) && p.insights.length > 0)
    .map((p) => p.productId as string),
);

export function hasInsight(productId: string | null | undefined): boolean {
  return !!productId && READY.has(productId);
}

export function isCategoryReady(apps: Array<{ productId: string | null }>): boolean {
  return apps.some((a) => hasInsight(a.productId));
}
