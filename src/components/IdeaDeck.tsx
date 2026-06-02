"use client";

import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@saverin/ui-web";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
  // the viewport's vertical centre while a tall card scrolls (sticky, not fixed).
  const arrowClass =
    "sticky top-[50vh] z-30 -translate-y-1/2 rounded-full shadow-[0_4px_12px_0_rgba(0,0,0,0.12)]";

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-start gap-2 sm:gap-4">
        <IconButton
          variant="secondary"
          size="L"
          aria-label={prevLabel}
          onClick={() => go(-1)}
          disabled={count <= 1}
          className={arrowClass}
          icon={<Chevron dir="left" />}
        />

        <div className="relative min-w-0 flex-1">
          <div key={tick} className={`deck-stage deck-${dir}`}>
            {slides[Math.min(index, count - 1)]}
          </div>
        </div>

        <IconButton
          variant="secondary"
          size="L"
          aria-label={nextLabel}
          onClick={() => go(1)}
          disabled={count <= 1}
          className={arrowClass}
          icon={<Chevron dir="right" />}
        />
      </div>

      <span className="mt-5 rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 py-1 text-[13px] tabular-nums text-[var(--color-text-tertiary)] [font-family:var(--brand-font-family)]">
        {index + 1} / {count}
      </span>
    </div>
  );
}
