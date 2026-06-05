"use client";

import { useRef } from "react";
import type { Insight } from "@/lib/insights";

// Compact insight row in the same visual grammar as AppNeeds.NeedRow: title,
// mention count, relative bar, click → modal with verbatim review(s). Metadata
// (feature area, persona, trial path) is preserved in JSON for downstream use
// but not surfaced on the row — keeps the page reading like the tag-aggregation
// view.

function Stars({ n }: { n: number }) {
  return (
    <span className="tabular-nums text-[12px] text-[var(--color-text-tertiary)]">
      {"★".repeat(n)}
      {"☆".repeat(Math.max(0, 5 - n))}
    </span>
  );
}

export default function InsightRow({ insight, max }: { insight: Insight; max: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const pct = Math.max(3, Math.round((insight.evidence.length / max) * 100));

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex w-full flex-col gap-2 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 text-left transition-colors hover:bg-[var(--color-surface-card-subtle)]"
      >
        <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{insight.title}</span>
          <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
            {insight.evidence.length} {insight.evidence.length === 1 ? "наблюдение" : "наблюдений"}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-2">
          <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
            <span
              className="block h-full rounded-full"
              style={{ width: `${pct}%`, background: "var(--color-accent-danger)" }}
            />
          </span>
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
