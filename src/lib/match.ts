// Split a store title into its brand "head" so the same product on Google
// Play and the App Store collapses to one entity. Store titles are usually
// "Brand: tagline" or "Brand - tagline", so we cut at a colon or a
// space-padded dash/pipe. We deliberately keep tight hyphens (e.g. "T-Mobile",
// "X-Plane") intact instead of splitting on every "-".
const SEPARATOR = /:|\s[–—|-]\s/;

export function productName(title: string): string {
  return title.split(SEPARATOR)[0].trim() || title.trim();
}

// Canonical slug = the brand head, lowercased with everything that isn't a
// letter or digit stripped. Cyrillic is preserved.
export function productSlug(title: string): string {
  const slug = productName(title)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return slug || title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
