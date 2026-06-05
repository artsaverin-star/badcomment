import slugs from "@/data/app-slugs.json";

// slug ↔ productId lookups for the new short URLs (/calm, /headspace, ...).
// The map is hand-authored in src/data/app-slugs.json — every app shipped
// through the insights pipeline gets a slug; new apps need an entry here.

const SLUG_TO_ID = slugs as Record<string, string>;
const ID_TO_SLUG = Object.fromEntries(Object.entries(SLUG_TO_ID).map(([s, id]) => [id, s]));

export function getProductIdBySlug(slug: string): string | null {
  return SLUG_TO_ID[slug] ?? null;
}

export function getSlugByProductId(productId: string): string | null {
  return ID_TO_SLUG[productId] ?? null;
}

export function listAppSlugs(): string[] {
  return Object.keys(SLUG_TO_ID);
}
