"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  Card,
  Header,
  IconButton,
  Tag,
  TextBlock,
  buttonVariants,
  cn,
} from "@saverin/ui-web";
import ProductDetailView from "./ProductDetailView";
import type { FeedCard } from "@/lib/deck";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, type Locale } from "@/lib/i18n";

const CTA_CLASS = "h-[54px] w-full text-[17px] leading-[22px]";
const EASE = "ease-[cubic-bezier(0.22,1,0.36,1)]";

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 13.6667 17" fill="none" aria-hidden="true">
      <path
        d="M12.6667 16L6.83333 11.8333L1 16V2.66667C1 2.22464 1.17559 1.80072 1.48816 1.48816C1.80072 1.17559 2.22464 1 2.66667 1H11C11.442 1 11.866 1.17559 12.1785 1.48816C12.4911 1.80072 12.6667 2.22464 12.6667 2.66667V16Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg viewBox="0 0 10.5003 11.667" fill="none" aria-hidden="true">
      <path
        d="M9.91683 11.0835V9.91683C9.91683 9.29799 9.671 8.7045 9.23342 8.26692C8.79583 7.82933 8.20234 7.5835 7.5835 7.5835H2.91683C2.29799 7.5835 1.7045 7.82933 1.26692 8.26692C0.829333 8.7045 0.5835 9.29799 0.5835 9.91683V11.0835M7.5835 2.91683C7.5835 4.2055 6.53883 5.25017 5.25017 5.25017C3.9615 5.25017 2.91683 4.2055 2.91683 2.91683C2.91683 1.62817 3.9615 0.5835 5.25017 0.5835C6.53883 0.5835 7.5835 1.62817 7.5835 2.91683Z"
        stroke="currentColor"
        strokeWidth="1.167"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 12.8337 12.262" fill="none" aria-hidden="true">
      <path
        d="M6.41685 0.5835L8.21935 4.23517L12.2502 4.82433L9.33352 7.66517L10.0219 11.6785L6.41685 9.78267L2.81185 11.6785L3.50018 7.66517L0.583517 4.82433L4.61435 4.23517L6.41685 0.5835Z"
        stroke="currentColor"
        strokeWidth="1.167"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Figma "Promo card" (collapsed 2172:21360, expanded 2172:21592): one card that
// grows in place. Tapping the CTA enlarges the store-screenshot strip (130×280 →
// it bleeds to the card edges and grows to 422 tall) and unfolds the full
// breakdown — reviews, what's loved, how to beat — right inside the same card,
// above a "Свернуть" CTA. All detail content comes from the IdeaCard already in
// memory, so opening is instant.
export default function IdeaCardDeck({
  card,
  locale,
  onOpen,
  expanded,
  othersOpen,
}: {
  card: FeedCard;
  locale: Locale;
  onOpen: () => void;
  expanded: boolean;
  othersOpen: boolean;
}) {
  const tr = t(locale);
  const s = card.summary;
  const installLabel = card.installs
    ? `${formatCount(card.installs)}+`
    : card.ratingCount
      ? formatCount(card.ratingCount)
      : null;

  // mounted keeps the detail in the DOM through the closing transition; shown is
  // the animation target. They diverge so the panel can animate shut, then
  // unmount on transitionEnd.
  const [mounted, setMounted] = useState(expanded);
  const [shown, setShown] = useState(expanded);
  const rootRef = useRef<HTMLDivElement>(null);

  // Switching to another card: this one is being closed *because* a sibling
  // opened. Collapse it with no animation so the layout settles in a single
  // synchronous step — that lets the click handler measure the real post-switch
  // position and pin the viewport (see handleClick).
  const collapsingForSwitch = othersOpen && !expanded;

  // Keep the tapped card's top exactly where it was on screen. Opening a card
  // below an already-open one makes that open card collapse above it, which would
  // otherwise shift this card up and dump the viewport near its end. flushSync
  // commits the open+sibling-collapse synchronously, so measuring top before and
  // after gives the exact shift to undo. The card then grows downward in place.
  const handleClick = () => {
    const el = rootRef.current;
    if (!el) {
      onOpen();
      return;
    }
    const before = el.getBoundingClientRect().top;
    flushSync(() => onOpen());
    const after = el.getBoundingClientRect().top;
    if (after !== before) window.scrollBy(0, after - before);
  };

  useEffect(() => {
    if (!expanded) {
      // When another card is being opened, collapse this one instantly instead of
      // running the 500ms close animation — otherwise this card shrinks above the
      // newly-opened one while that card scrolls to top, and the moving layout
      // makes the scroll overshoot downward.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShown(false);
      if (othersOpen) {
        setMounted(false);
      }
      return;
    }
    // Mount collapsed, then flip open next frame so grid-rows transitions.
    // No scrollIntoView: the card grows in place and overflow-anchor:none keeps
    // the viewport put, so nothing yanks the page.
    setMounted(true);
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setShown(true);
      });
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [expanded, othersOpen]);

  return (
    <Card ref={rootRef} className="w-full gap-4 border-transparent p-4 shadow-none sm:p-8">
      {/* Brand block: topbar (logo + name + bookmark) and the full-width tagline */}
      <div className="flex w-full flex-col gap-2">
        <div className="flex w-full items-start gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {card.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.icon}
                alt=""
                className="size-10 shrink-0 rounded-[var(--radius-lg)] object-cover"
              />
            ) : (
              <div className="size-10 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-card-subtle)]" />
            )}
            <Header
              size="M"
              as="h2"
              className="min-w-0"
              title={<span className="block truncate">{card.name}</span>}
            />
          </div>
          <IconButton
            variant="secondary"
            size="M"
            aria-label={tr.nav.seeAllReviews}
            icon={<BookmarkIcon />}
          />
        </div>
        {s?.tagline && (
          <p className="[font-family:var(--brand-font-family)] text-[17px] leading-[22px] text-[var(--color-text-secondary)]">
            {s.tagline}
          </p>
        )}
      </div>

      {/* Info tags: category, install volume, average rating */}
      <div className="flex w-full flex-wrap gap-2">
        {card.category && (
          <Tag tone="neutral" size="M">
            {categoryLabelL(locale, card.category)}
          </Tag>
        )}
        {installLabel && (
          <Tag tone="neutral" size="M" iconLeft={<PersonIcon />}>
            {installLabel}
          </Tag>
        )}
        {card.avgRating != null && (
          <Tag tone="neutral" size="M" iconLeft={<StarIcon />}>
            {card.avgRating.toFixed(1)}
          </Tag>
        )}
      </div>

      {/* Store screenshots — grow and bleed to the card edges when expanded */}
      {card.screenshots.length > 0 && (
        <div
          className={cn(
            "flex w-full items-center justify-center gap-2",
            collapsingForSwitch ? "" : cn("transition-[height] duration-500", EASE),
            expanded ? "h-[422px]" : "h-[280px]",
          )}
        >
          {card.screenshots.slice(0, 4).map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="aspect-[195/420] h-full shrink-0 rounded-[var(--radius-sm)] object-cover object-top"
            />
          ))}
        </div>
      )}

      {/* The single insight: verdict + the opening */}
      {(s?.verdict || s?.opportunity) && (
        <TextBlock
          size="M"
          className="w-full"
          title={s?.verdict || s?.tagline || card.name}
          description={s?.opportunity}
        />
      )}

      {/* The breakdown, unfolded inline */}
      {mounted && !collapsingForSwitch && (
        <div
          className={cn("grid transition-[grid-template-rows] duration-500", EASE)}
          style={{ gridTemplateRows: shown ? "1fr" : "0fr" }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "grid-template-rows" && !shown) setMounted(false);
          }}
        >
          <div className="min-h-0 overflow-hidden">
            <div
              className={cn(
                "transition-opacity duration-500 ease-out",
                shown ? "opacity-100" : "opacity-0",
              )}
            >
              <ProductDetailView card={card} locale={locale} />
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleClick}
        aria-expanded={expanded}
        className={cn(buttonVariants({ variant: "primary", size: "L" }), CTA_CLASS)}
      >
        {expanded ? tr.nav.collapse : tr.nav.more}
      </button>
    </Card>
  );
}
