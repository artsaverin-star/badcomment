"use client";

import { useState } from "react";
import IdeaCardDeck from "./IdeaCardDeck";
import type { IdeaCard } from "@/lib/queries";
import type { Locale } from "@/lib/i18n";

// The homepage feed: a single centered 608px column of promo cards (Figma node
// 2172:21356). Tapping a card's CTA expands it in place — the card itself grows
// its screenshots and unfolds the breakdown inside. Only one card stays open at
// a time.
export default function IdeaFeed({
  cards,
  locale,
}: {
  cards: IdeaCard[];
  locale: Locale;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

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
    </div>
  );
}
