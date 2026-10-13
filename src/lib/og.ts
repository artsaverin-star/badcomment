import { ratingSlugs } from "@/lib/peoplesRating";

// og:image cache-buster. Telegram (and most crawlers) cache a preview image by
// its URL, effectively forever, so a stale card keeps showing after the catalog
// grows. Appending a version derived from the niche count changes the URL
// whenever a wave lands, which forces those caches to re-fetch the current card.

export function ogImage(ru: boolean, slug?: string): string {
  const base = `https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`;
  return `${base}${slug ? `&slug=${slug}` : ""}&v=${ratingSlugs().length}`;
}
