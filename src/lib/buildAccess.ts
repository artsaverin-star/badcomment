import type { Access } from "./access";

// The builder's free ladder: one showcase idea is open to everyone, a free
// sign-in opens four hand-picked super ideas, the single lifetime purchase
// opens every niche. The four are curated by hand — the most product-shaped
// ideas of the catalog with the full asset kit (cover, design spec, persona
// covers, live ASO), so the free run shows the builder at its best.
export const FREE_BUILD_IDEAS: { idea: string; category: string }[] = [
  { idea: "workout-fitness-4", category: "workout-fitness" }, // витрина, открыта без входа
  { idea: "focus-productivity-5", category: "focus-productivity" },
  { idea: "recipes-meal-planning-2", category: "recipes-meal-planning" },
  { idea: "baby-tracking-2", category: "baby-tracking" },
];
export const DEMO_BUILD_IDEA = FREE_BUILD_IDEAS[0];

// The free idea slugs open at this viewer's tier of the ladder.
export function openFreeIdeas(access: Access): Set<string> {
  if (access.loggedIn) return new Set(FREE_BUILD_IDEAS.map((f) => f.idea));
  return new Set([DEMO_BUILD_IDEA.idea]);
}

// May this viewer walk the wizard for this idea?
export function canBuild(access: Access, categorySlug: string, ideaSlug: string): boolean {
  if (access.unlimited) return true;
  if (access.has("category", categorySlug) || access.has("chapter", categorySlug) || access.has("idea", ideaSlug)) return true;
  return openFreeIdeas(access).has(ideaSlug);
}
