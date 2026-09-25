"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/site/ui/icons";
import { cx } from "@/site/ui/cx";

// A horizontal screenshot track with previous/next arrows (spec 11 §3.4): the leader stage
// (RatingStage) and the app page gallery (RatingGallery). The shots are the children (server
// nodes on the stage); this only scrolls them.
//
//   <ShotScroller className="ia-rt-stage" trackClassName="ia-rt-stage__track" label={shotsLabel}>
//     {shots}
//   </ShotScroller>
//
// The track is a labelled region (role="region", aria-label): swiping, the trackpad and — when
// `focusable` — the arrow keys scroll it natively, with x-proximity snapping (rating.css). The
// arrows are 36 px glass circles at the track edges for mouse users only (rating.css shows them
// under `(hover: hover) and (pointer: fine)`); each is `hidden` while its direction cannot
// scroll (`data-at-start` / `data-at-end` on the root follow scroll and resize). A click moves by
// 80 % of the visible width, smoothly unless the reader prefers reduced motion.
//   stage    arrows are decorative (aria-hidden, tabindex -1): the focusable region scrolls with keys
//   gallery  `prevLabel` / `nextLabel` make them real buttons; the shot links are the tab stops,
//            so the region itself is not focusable (`focusable={false}`)
// Server HTML renders both arrows hidden (the overflow is unknown there); they appear after
// hydration when there is somewhere to go.

export function ShotScroller({
  label,
  prevLabel,
  nextLabel,
  focusable = true,
  className,
  trackClassName,
  children,
}: {
  /** Accessible name of the region (`s.shotsLabel`). */
  label: string;
  /** Real, labelled arrow buttons (gallery); omitted → decorative arrows (stage). */
  prevLabel?: string;
  nextLabel?: string;
  /** Make the track a tab stop (default). Off when the children are focusable links. */
  focusable?: boolean;
  className?: string;
  trackClassName?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = el.scrollWidth - el.clientWidth;
      const left = Math.abs(el.scrollLeft);
      const next = { start: left <= 1, end: left >= max - 1 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    schedule();
    el.addEventListener("scroll", schedule, { passive: true });
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", schedule);
      ro.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // 80 % of the visible width, rounded down to whole shots (pitch = shot + gap), so a track that
  // rests on a shot edge lands on one again and the proximity snap has nothing to correct.
  const scrollBy = (dir: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const [a, b] = el.children as unknown as HTMLElement[];
    const pitch = a && b ? b.offsetLeft - a.offsetLeft : 0;
    const step = pitch > 0 ? Math.max(1, Math.floor((el.clientWidth * 0.8) / pitch)) * pitch : el.clientWidth * 0.8;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * step, behavior: reduce ? "instant" : "smooth" });
  };

  const real = prevLabel !== undefined && nextLabel !== undefined;
  const arrow = (dir: -1 | 1) => (
    <button
      type="button"
      className={cx("ia-rt-arrow", dir < 0 ? "ia-rt-arrow--prev" : "ia-rt-arrow--next")}
      hidden={dir < 0 ? edges.start : edges.end}
      onClick={() => scrollBy(dir)}
      aria-label={real ? (dir < 0 ? prevLabel : nextLabel) : undefined}
      title={real ? (dir < 0 ? prevLabel : nextLabel) : undefined}
      aria-hidden={real ? undefined : true}
      tabIndex={real ? undefined : -1}
    >
      {dir < 0 ? <ChevronLeftIcon size={18} strokeWidth={2.2} aria-hidden="true" /> : <ChevronRightIcon size={18} strokeWidth={2.2} aria-hidden="true" />}
    </button>
  );

  return (
    <div className={cx("ia-rt-scroller", className)} data-at-start={edges.start || undefined} data-at-end={edges.end || undefined}>
      <div ref={track} className={trackClassName} role="region" aria-label={label} tabIndex={focusable ? 0 : undefined}>
        {children}
      </div>
      {arrow(-1)}
      {arrow(1)}
    </div>
  );
}
