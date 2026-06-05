"use client";

import { useRef } from "react";
import type { Insight } from "@/lib/insights";

// Compact insight row: title + mention count, click → modal with the full
// evidence (verbatim review quotes). Density tuned to match the segment
// "Top problems" rhythm so the page scans like a list, not a feed.

function Stars({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-[11px] text-[var(--color-text-tertiary)]">
      {"★".repeat(n)}
      {"☆".repeat(Math.max(0, 5 - n))}
    </span>
  );
}

export default function InsightRow({ insight }: { insight: Insight; max: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = insight.observationCount ?? insight.evidence.length;
  const word = count === 1 ? "наблюдение" : count >= 2 && count <= 4 ? "наблюдения" : "наблюдений";

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex w-full items-baseline justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-card-subtle)]"
      >
        <span className="text-[13px] leading-[18px] text-[var(--color-text-primary)]">{insight.title}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {count} {word}
        </span>
      </button>

      <dialog
        ref={ref}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="mx-0 mb-0 mt-auto w-full max-w-none rounded-[var(--radius-xl)] rounded-b-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-[var(--color-text-primary)] backdrop:bg-black/60 sm:mx-auto sm:mb-auto sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-b-[var(--radius-xl)]"
      >
        <div className="flex max-h-[85vh] flex-col sm:max-h-[80vh]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
            <span className="text-[15px] font-semibold">{insight.title}</span>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              aria-label="Закрыть"
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-3 overflow-y-auto p-4">
            {insight.evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <Stars n={e.rating} />
                  <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>
                </span>
                <p className="text-[13px] leading-[19px] text-[var(--color-text-secondary)]">{e.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
