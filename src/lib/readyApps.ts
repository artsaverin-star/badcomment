import categoriesData from "@/data/categories.json";
import { dataFile } from "./dataFile";
import { insightFacts } from "./insights";

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

// Hand-authored gem разборы (Calm-style, pre-balanced-flag) live in these two
// catalog categories. They are content-balanced (built on all 1-5★ reviews)
// but predate the `balanced` stamp, so direct pages stay publishable for them.
const GEM_CATEGORIES = new Set(["meditation-mindfulness", "sleep-audio"]);

// Computed on first use from the small per-product facts (not from the 40 MB file itself).
let sets: { ready: Set<string>; gems: Set<string> } | null = null;
function readySets() {
  if (sets) return sets;
  const ready = new Set<string>();
  for (const [pid, [balanced, count, scanned]] of Object.entries(insightFacts())) {
    if (balanced && count > 0 && scanned >= MIN_REVIEWS) ready.add(pid);
  }
  const meta = dataFile<Record<string, { productId?: string }>>("categories-meta.json");
  const gems = new Set<string>();
  for (const d of categoriesData as Array<{ categories: Array<{ slug: string; apps?: string[] }> }>) {
    for (const c of d.categories) {
      if (!GEM_CATEGORIES.has(c.slug)) continue;
      for (const a of c.apps ?? []) {
        const m = meta[`${c.slug}:${a}`] ?? meta[a];
        if (m?.productId) gems.add(m.productId);
      }
    }
  }
  return (sets = { ready, gems });
}

export function hasInsight(productId: string | null | undefined): boolean {
  return !!productId && readySets().ready.has(productId);
}

export function isCategoryReady(apps: Array<{ productId: string | null }>): boolean {
  return apps.some((a) => hasInsight(a.productId));
}

// Direct /<slug> pages: publishable = (balanced разбор OR hand-authored gem)
// AND the 500-review sample standard. Legacy negative-only and thin разборы
// 404 until re-fed or the app is replaced in the catalog.
export function isPublishable(productId: string | null | undefined): boolean {
  if (!productId) return false;
  if ((insightFacts()[productId]?.[2] ?? 0) < MIN_REVIEWS) return false;
  const { ready, gems } = readySets();
  return ready.has(productId) || gems.has(productId);
}
