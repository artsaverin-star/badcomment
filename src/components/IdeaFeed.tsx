"use client";

import { Fragment, useCallback, useRef, useState } from "react";
import { IconButton, cn } from "@saverin/ui-web";
import IdeaCardDeck from "./IdeaCardDeck";
import ProductDetailView from "./ProductDetailView";
import type { IdeaCard } from "@/lib/queries";
import { t, type Locale } from "@/lib/i18n";

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6L6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// The homepage feed: a single centered column of promo cards (Figma node
// 2172:21076 is one 608px-wide column). Tapping "Подробнее" expands the full
// breakdown inline right after the tapped card, animated open with a
// grid-template-rows 0fr→1fr transition. All detail content comes from the
// IdeaCard already in memory, so opening is instant.
export default function IdeaFeed({
  cards,
  locale,
}: {
  cards: IdeaCard[];
  locale: Locale;
}) {
  const tr = t(locale);
  // openId = which card's detail is mounted; open = its animation target.
  // They differ during the closing transition so the panel can animate shut
  // before it unmounts.
  const [openId, setOpenId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(
    (id: string) => {
      if (openId === id) {
        close();
        return;
      }
      setOpenId(id);
      // Start from collapsed, then flip to open on the next frame so the
      // grid-rows transition runs even when switching directly between cards.
      setOpen(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setOpen(true);
          panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }),
      );
    },
    [openId, close],
  );

  return (
    <div className="mx-auto flex max-w-[608px] flex-col items-stretch gap-4">
      {cards.map((card) => (
        <Fragment key={card.id}>
          <IdeaCardDeck
            card={card}
            locale={locale}
            onOpen={() => toggle(card.id)}
            expanded={openId === card.id}
          />
          {openId === card.id && (
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
              onTransitionEnd={(e) => {
                if (e.propertyName === "grid-template-rows" && !open) setOpenId(null);
              }}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  ref={panelRef}
                  className={cn(
                    "scroll-mt-20 pt-4 transition-[opacity,transform] duration-500 ease-out",
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  )}
                >
                  <div className="mb-3 flex justify-end">
                    <IconButton
                      variant="secondary"
                      size="S"
                      aria-label={tr.nav.collapse}
                      icon={<CloseIcon />}
                      onClick={close}
                    />
                  </div>
                  <ProductDetailView card={card} locale={locale} />
                </div>
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
