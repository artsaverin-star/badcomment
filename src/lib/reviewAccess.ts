import type { Access } from "./access";

// The review archive has one complete public sample. Every other category is
// part of the site's paid access. Keep this separate from the older free
// research-category list: the archive is its own product surface.
export const FREE_REVIEW_CATEGORY = "dating-apps";

export function isFreeReviewCategory(slug: string): boolean {
  return slug === FREE_REVIEW_CATEGORY;
}

export function canAccessReviewCategory(access: Access, slug: string): boolean {
  return (
    isFreeReviewCategory(slug) ||
    access.unlimited ||
    // Honour historical paid category/chapter purchases for that niche.
    access.has("category", slug) ||
    access.has("chapter", slug)
  );
}
