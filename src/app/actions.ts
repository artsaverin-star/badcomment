"use server";

import { getFullDeck, filterDeck, PAGE_SIZE, type FeedCard } from "@/lib/deck";
import { getSegmentMemberIds } from "@/lib/segments";
import type { Locale } from "@/lib/i18n";

// Reachable as a direct POST, so treat inputs as untrusted. All it returns is
// the public deck, but clamp the offset and normalize the locale anyway.
export async function loadDeckPage(
  locale: Locale,
  cat: string | null,
  type: string | null,
  seg: string | null,
  offset: number,
): Promise<{ cards: FeedCard[]; nextOffset: number | null }> {
  const safeLocale: Locale = locale === "en" ? "en" : "ru";
  const start = Math.max(0, Math.floor(Number(offset)) || 0);

  const deck = await getFullDeck(safeLocale);
  const memberIds = seg ? getSegmentMemberIds(seg) : null;
  const filtered = filterDeck(deck, cat || null, type || null, memberIds);

  const cards = filtered.slice(start, start + PAGE_SIZE);
  const next = start + PAGE_SIZE;
  return { cards, nextOffset: next < filtered.length ? next : null };
}
