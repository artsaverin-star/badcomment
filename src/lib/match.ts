// Derive a canonical slug from a store listing title so the same product on
// Google Play and the App Store collapses to one entity. We take the part of
// the title before the first separator (":", "-", "—", "|") — store titles
// are usually "Brand: tagline" / "Brand - tagline" — then strip everything
// that isn't a letter or digit. Cyrillic is preserved.
export function productSlug(title: string): string {
  const head = title.split(/[:\-–—|]/)[0];
  const slug = head
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
  // Fall back to the whole title if the head collapsed to nothing.
  return slug || title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}
