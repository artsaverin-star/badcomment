import ultra from "@/data/ultraCategories.json";

// "Ultra" = a category whose breakdown, ideas and per-app teardown were rebuilt
// on the full 100-app people's-rating dataset (the highest quality tier).
const ULTRA = new Set(ultra as string[]);

export function isUltra(slug: string): boolean {
  return ULTRA.has(slug);
}

// Categories that have a published people's rating page (/rating/<slug>).
export const PEOPLES_RATING_SLUGS = ["astrology", "dating-apps", "ai-avatars-headshots", "meditation-mindfulness", "photo-editing", "notes-pkm"] as const;
const RATED = new Set<string>(PEOPLES_RATING_SLUGS);

export function hasPeoplesRating(slug: string): boolean {
  return RATED.has(slug);
}
