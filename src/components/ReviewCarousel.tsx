"use client";

import { useEffect, useRef, useState } from "react";

export type ReviewQuote = { rating: number; quote: string; app: string };

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[12px] tracking-tight text-[var(--color-text-tertiary)]">
      {"★".repeat(rating)}
      <span className="opacity-30">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

// Coverflow-style review carousel: a centre-snapping scroller where the centred
// card scales up and the rest recede. Left/right arrows step one card at a time.
// No outer card — the quotes float on the page.
export default function ReviewCarousel({ items }: { items: ReviewQuote[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    const center = el.scrollLeft + el.clientWidth / 2;
    let best = 0;
    let bestDist = Infinity;
    Array.from(el.children).forEach((c, i) => {
      const child = c as HTMLElement;
      const cc = child.offsetLeft + child.offsetWidth / 2;
      const d = Math.abs(cc - center);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    setActive(best);
  };

  useEffect(() => {
    update();
  }, []);

  const goTo = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(items.length - 1, i));
    const child = el.children[clamped] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - (el.clientWidth - child.offsetWidth) / 2, behavior: "smooth" });
  };

  const arrow =
    "absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-colors hover:border-[var(--color-border-strong)] disabled:opacity-30";

  return (
    <div className="relative">
      <button type="button" aria-label="Назад" onClick={() => goTo(active - 1)} disabled={active === 0} className={`${arrow} left-1`}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Вперёд"
        onClick={() => goTo(active + 1)}
        disabled={active >= items.length - 1}
        className={`${arrow} right-1`}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        ref={ref}
        onScroll={update}
        className="flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-[calc(50%-140px)] py-10 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((q, i) => {
          const on = i === active;
          return (
            <figure
              key={i}
              onClick={() => goTo(i)}
              className={`flex w-[280px] shrink-0 cursor-pointer snap-center flex-col gap-3 rounded-2xl border p-5 transition-all duration-300 ease-out ${
                on
                  ? "scale-100 border-[var(--color-border-strong)] bg-[var(--color-surface-card)] opacity-100 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.7)]"
                  : "scale-[0.86] border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] opacity-50"
              }`}
            >
              <Stars rating={q.rating} />
              <blockquote className={`leading-snug text-[var(--color-text-primary)] ${on ? "text-[15px]" : "text-[13px]"}`}>
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-auto pt-1 text-[11px] text-[var(--color-text-tertiary)]">{q.app}</figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-1 flex justify-center gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Отзыв ${i + 1}`}
            onClick={() => goTo(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-[var(--color-text-brand)]" : "w-1.5 bg-[var(--color-border-strong)]"}`}
          />
        ))}
      </div>
    </div>
  );
}
