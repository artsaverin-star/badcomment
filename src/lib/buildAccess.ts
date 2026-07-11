import type { Access } from "./access";

// The builder's free ladder: exactly two hand-picked ideas are free. The
// showcase one is open to everyone with no account, the second opens after a
// free sign-in, everything else takes the single lifetime purchase. Both are
// genuinely solo-buildable products with the full asset kit (cover, design
// spec, persona covers, live ASO), so the free run shows the builder at its
// best.
export const FREE_BUILD_IDEAS: { idea: string; category: string }[] = [
  { idea: "flashcards-6", category: "flashcards" }, // витрина, открыта без входа
  { idea: "baby-tracking-2", category: "baby-tracking" }, // за бесплатную регистрацию
];
export const DEMO_BUILD_IDEA = FREE_BUILD_IDEAS[0];
export const REGA_BUILD_IDEA = FREE_BUILD_IDEAS[1];

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
