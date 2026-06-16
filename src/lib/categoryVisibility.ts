import active from "@/data/active-categories.json";

// Allowlist of categories shown in the catalog/home/ideas. While we rebuild the
// content category-by-category, only these are visible everywhere. Empty list =
// everything visible (normal mode).
const SET = new Set(active as string[]);

export function isActiveCategory(slug: string): boolean {
  return SET.size === 0 || SET.has(slug);
}
