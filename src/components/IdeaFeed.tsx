"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
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

// The homepage feed: a grid of promo cards where tapping "Подробнее" expands the
// full breakdown inline (instead of routing to /product/[id]). The expanded panel
// is inserted as a full-width row right after the row that holds the tapped card,
// then animated open with a grid-template-rows 0fr→1fr transition. All detail
// content comes from the IdeaCard already in memory, so opening is instant.
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
  const [cols, setCols] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const apply = () => setCols(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

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

  const openIndex = openId ? cards.findIndex((c) => c.id === openId) : -1;
  const insertAfter =
    openIndex < 0
      ? -1
      : Math.min(Math.floor(openIndex / cols) * cols + (cols - 1), cards.length - 1);
  const openCard = openIndex >= 0 ? cards[openIndex] : null;

  return (
    <div className="mx-auto grid max-w-[784px] grid-cols-1 items-start gap-4 sm:grid-cols-2">
      {cards.map((card, i) => (
        <Fragment key={card.id}>
          <IdeaCardDeck
            card={card}
            locale={locale}
            onOpen={() => toggle(card.id)}
            expanded={openId === card.id}
          />
          {openCard && i === insertAfter && (
            <div
              className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:col-span-2"
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
                  <ProductDetailView card={openCard} locale={locale} />
                </div>
              </div>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  );
}
