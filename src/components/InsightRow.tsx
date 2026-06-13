"use client";

import { useRef } from "react";
import type { Insight } from "@/lib/insights";

// Editorial insight entry: a typographic row (no card chrome) whose only
// affordances are the title and a quiet observation-count figure. Click opens
// a modal with the verbatim review quotes.

function Stars({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-caption text-[var(--color-text-tertiary)]">
      {"★".repeat(n)}
      {"☆".repeat(Math.max(0, 5 - n))}
    </span>
  );
}

export default function InsightRow({ insight }: { insight: Insight; max?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = insight.observationCount ?? insight.evidence.length;

  const open = () => {
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group flex w-full items-baseline justify-between gap-4 border-b border-[var(--color-border-subtle)] py-3 text-left last:border-0"
      >
        <span className="text-callout text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)]">
          {insight.title}
        </span>
        <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{count}</span>
      </button>

      <dialog
        ref={ref}
        onClose={() => {
          document.body.style.overflow = "";
        }}
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
        className="mx-0 mb-0 mt-auto w-full max-w-none rounded-[var(--radius-xl)] rounded-b-none border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0 text-[var(--color-text-primary)] backdrop:bg-black/60 sm:mx-auto sm:mb-auto sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-b-[var(--radius-xl)]"
      >
        <div className="flex max-h-[85vh] flex-col sm:max-h-[80vh]">
          <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-subtle)] p-4">
            <span className="text-lead font-semibold leading-snug">{insight.title}</span>
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
                  <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">{e.date}</span>
                </span>
                <p className="text-footnote text-[var(--color-text-secondary)]">{e.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </dialog>
    </>
  );
}
