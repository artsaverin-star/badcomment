"use client";

import { useCallback, useEffect, useState } from "react";

export default function IdeaDeck({
  slides,
  prevLabel,
  nextLabel,
}: {
  slides: React.ReactNode[];
  prevLabel: string;
  nextLabel: string;
}) {
  const [index, setIndex] = useState(0);
  // Bumps on every move so the stage remounts and replays the scatter CSS.
  const [tick, setTick] = useState(0);
  const [dir, setDir] = useState<"next" | "prev">("next");
  const count = slides.length;

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setDir(delta > 0 ? "next" : "prev");
      setIndex((i) => (i + delta + count) % count);
      setTick((t) => t + 1);
    },
    [count]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Arrows live in their own side columns flanking the card and stay pinned to
  // the viewport's vertical centre while a tall card scrolls (sticky, not fixed,
  // so they never pile up in the corner).
  const arrowClass =
    "sticky top-[50vh] z-30 flex h-11 w-11 shrink-0 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/90 text-2xl text-neutral-700 shadow-lg backdrop-blur transition hover:border-red-300 hover:text-red-600 disabled:opacity-30 dark:border-white/15 dark:bg-neutral-900/90 dark:text-neutral-200";

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-start gap-2 sm:gap-4">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={prevLabel}
          className={arrowClass}
          disabled={count <= 1}
        >
          ‹
        </button>

        <div className="relative min-w-0 flex-1">
          <div key={tick} className={`deck-stage deck-${dir}`}>
            {slides[Math.min(index, count - 1)]}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          aria-label={nextLabel}
          className={arrowClass}
          disabled={count <= 1}
        >
          ›
        </button>
      </div>

      <span className="mt-5 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-sm tabular-nums text-neutral-500 shadow-sm dark:border-white/15 dark:bg-neutral-900/80">
        {index + 1} / {count}
      </span>
    </div>
  );
}
