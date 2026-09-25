"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@/site/ui/Toolbar";
import { SearchIcon } from "@/site/ui/icons";

// The niche page's toolbar shortcut to «Найти в этой теме» (spec 11 §4.2.2, D6): a circle (44 px,
// the toolbar's height budget: rating.css) with the magnifier that appears once the search field (#rating-search, RatingNicheList) has
// scrolled away above the sticky bars, and brings it back: scroll the field to the top, focus
// it. Hidden while the field is in view or still below it (the first screen on a phone). Client.
//
//   <DetailToolbar … trailing={<RatingSearchShortcut label={t("Найти в этой теме")} />} />

/** The niche list's search input (SearchField passes the id to the <input>). */
const FIELD_ID = "rating-search";

function field(): HTMLElement | null {
  const input = document.getElementById(FIELD_ID);
  return input?.closest<HTMLElement>(".ia-search") ?? input;
}

export function RatingSearchShortcut({ label }: { label: string }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const box = field();
    if (!box) return;
    let io: IntersectionObserver | null = null;
    let bars = -1;
    // The sticky top bar and the detail toolbar cover the top of the viewport: the html
    // scroll-padding-top that every in-page jump already respects. It changes at the desktop
    // breakpoint, so the observer is rebuilt when it does.
    const observe = () => {
      const next = Math.round(Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);
      if (next === bars) return;
      bars = next;
      io?.disconnect();
      io = new IntersectionObserver(
        ([entry]) => {
          const top = entry.rootBounds?.top ?? bars;
          setShown(!entry.isIntersecting && entry.boundingClientRect.bottom <= top);
        },
        { rootMargin: `-${bars}px 0px 0px 0px` },
      );
      io.observe(box);
    };
    observe();
    window.addEventListener("resize", observe);
    return () => {
      window.removeEventListener("resize", observe);
      io?.disconnect();
    };
  }, []);

  return (
    <IconButton
      variant="circle"
      className="ia-rt-search-shortcut"
      label={label}
      hidden={!shown}
      onClick={() => {
        const box = field();
        if (!box) return;
        box.scrollIntoView({ block: "start" });
        document.getElementById(FIELD_ID)?.focus({ preventScroll: true });
      }}
    >
      <SearchIcon size={18} strokeWidth={2} aria-hidden="true" />
    </IconButton>
  );
}
