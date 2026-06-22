import { listIdeas } from "./ideas";
import { PREMIUM_NICHE_SET } from "./premiumNiches";
import { TOP_PER_CATEGORY } from "./tokenConfig";

// «Колода» — the curated best-of: the top-N ideas (by ranking) from each premium
// niche. listIdeas() is already sorted best-first (critic score, then demand), so
// grouping by category and taking the first N per premium niche yields the top-N.
// This is the set a 290₽ deck purchase unlocks forever, and the free meter samples.
export function deckIdeaSlugs(): string[] {
  const perCat = new Map<string, number>();
  const out: string[] = [];
  for (const i of listIdeas()) {
    if (!PREMIUM_NICHE_SET.has(i.category)) continue;
    const n = perCat.get(i.category) ?? 0;
    if (n >= TOP_PER_CATEGORY) continue;
    perCat.set(i.category, n + 1);
    out.push(i.slug);
  }
  return out;
}

let cached: Set<string> | null = null;
export function isDeckIdea(slug: string): boolean {
  if (!cached) cached = new Set(deckIdeaSlugs());
  return cached.has(slug);
}
