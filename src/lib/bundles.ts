import { getCategoryBySlug } from "./researchCategories";
import { getSlugByProductId } from "./appSlugs";
import { listIdeas } from "./ideas";

// The members of a category bundle: every app slug and idea slug that belongs to
// the genre. Unlocking the category grants all of these (see tokens.unlockItem).
export function categoryMembers(categorySlug: string): { apps: string[]; ideas: string[] } {
  const cat = getCategoryBySlug(categorySlug, "ru");
  const apps = cat
    ? cat.apps
        .map((a) => (a.productId ? getSlugByProductId(a.productId) : null))
        .filter((s): s is string => !!s)
    : [];
  const ideas = listIdeas()
    .filter((i) => i.category === categorySlug)
    .map((i) => i.slug);
  return { apps: [...new Set(apps)], ideas: [...new Set(ideas)] };
}
