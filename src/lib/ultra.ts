import { RATING_BY_SLUG } from "@/data/peoplesRating";

// "Ultra" = a niche whose breakdown, ideas and per-app teardown were rebuilt on
// the full ~100-app people's-rating dataset (the highest quality tier). This is
// the ONE canonical set — the homepage cards, the /ideas feed and the /rating
// list all derive from it, so the three surfaces always match.
const ULTRA = new Set(Object.keys(RATING_BY_SLUG));

export function isUltra(slug: string): boolean {
  return ULTRA.has(slug);
}

// Every ULTRA niche has a published people's-rating page (/rating/<slug>), since
// the rating dataset is exactly what defines the tier.
export const PEOPLES_RATING_SLUGS = Object.keys(RATING_BY_SLUG);

export function hasPeoplesRating(slug: string): boolean {
  return ULTRA.has(slug);
}
