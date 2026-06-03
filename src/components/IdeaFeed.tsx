"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import IdeaCardDeck from "./IdeaCardDeck";
import { loadDeckPage } from "@/app/actions";
import type { FeedCard } from "@/lib/deck";
import type { Locale } from "@/lib/i18n";

// The homepage feed: a single centered 608px column of promo cards. The first
// page arrives server-rendered; the rest stream in as the user scrolls — a
// sentinel near the bottom asks the server for the next slice of the cached
// deck. Only one card stays expanded at a time.
export default function IdeaFeed({
  cards: initial,
  locale,
  cat,
  type,
  seg,
  initialNextOffset,
}: {
  cards: FeedCard[];
  locale: Locale;
  cat: string | null;
  type: string | null;
  seg: string | null;
  initialNextOffset: number | null;
}) {
  const [cards, setCards] = useState(initial);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || nextOffset === null) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || pending || nextOffset === null) return;
        startTransition(async () => {
          const res = await loadDeckPage(locale, cat, type, seg, nextOffset);
          setCards((prev) => [...prev, ...res.cards]);
          setNextOffset(res.nextOffset);
        });
      },
      // Start fetching well before the sentinel is on screen so the next cards
      // are usually ready by the time the user reaches them.
      { rootMargin: "800px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nextOffset, pending, locale, cat, type, seg]);

  return (
    <div className="mx-auto flex max-w-[608px] flex-col items-stretch gap-4">
      {cards.map((card) => (
        <IdeaCardDeck
          key={card.id}
          card={card}
          locale={locale}
          expanded={openId === card.id}
          othersOpen={openId !== null && openId !== card.id}
          onOpen={() => setOpenId((prev) => (prev === card.id ? null : card.id))}
        />
      ))}
      {nextOffset !== null && <div ref={sentinelRef} className="h-1 w-full" />}
    </div>
  );
}
