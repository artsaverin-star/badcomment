"use client";

import { useRef } from "react";
import { themeLabel, type SegmentSummary } from "@/lib/segmentSummary";

// Category-level editorial synthesis ("инсайты категории"), rendered at the end
// of a segment page as a magazine-style long-read: a lede, then narrative
// cross-app sections (authored heading + dek), each followed by the mechanisms
// as hairline rows. Every figure traces to real reviews — see
// scripts/build-segment-insights.ts.

function pluralizeNabludenie(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

export default function SegmentSummaryView({
  summary,
  embedded = false,
}: {
  summary: SegmentSummary;
  embedded?: boolean;
}) {
  return (
    <section className={embedded ? "" : "mt-12 border-t border-[var(--color-border-strong)] pt-9"}>
      {!embedded && (
        <p className="text-caption font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
          Инсайты категории
        </p>
      )}
      <p className={`${embedded ? "" : "mt-3.5"} max-w-[62ch] text-lead text-[var(--color-text-secondary)]`}>
        {summary.lead}
      </p>
      <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">
        {summary.appsCount} приложений · {summary.reviewsScanned.toLocaleString("ru-RU")} отзывов · обновлено {summary.asOf}
      </p>

      <div className="mt-10 flex flex-col gap-11">
        {summary.sections.map((section) => (
          <details key={section.id} open className="group/sec">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h3 className="text-[21px] font-semibold leading-[27px] text-[var(--color-text-primary)]">
                {section.heading}
              </h3>
              <svg
                width="11"
                height="11"
                viewBox="0 0 10 10"
                className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open/sec:rotate-90"
                aria-hidden="true"
              >
                <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            {section.dek && (
              <p className="mt-2.5 max-w-[60ch] text-callout text-[var(--color-text-secondary)]">
                {section.dek}
              </p>
            )}
            <div className="mt-4 border-t border-[var(--color-border-subtle)]">
              {section.items.map((item) => (
                <CategoryInsightRow key={item.id} item={item} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function CategoryInsightRow({ item }: { item: SegmentSummary["items"][number] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = item.observationCount;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex w-full flex-col gap-1 border-b border-[var(--color-border-subtle)] py-3.5 text-left transition-colors hover:bg-[var(--color-surface-card-subtle)]"
      >
        <span className="flex items-baseline gap-3">
          <span className="text-callout font-semibold leading-snug text-[var(--color-text-primary)]">{item.title}</span>
          <span className="ml-auto shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
            {count} {pluralizeNabludenie(count)}
          </span>
        </span>
        <span className="text-footnote text-[var(--color-text-secondary)]">{item.body}</span>
        <span className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">
          {item.apps.join(" · ")}
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
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-caption text-[var(--color-text-tertiary)]">{themeLabel(item.theme)}</span>
              <span className="text-lead font-semibold">{item.title}</span>
            </span>
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
            {item.evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-caption font-semibold text-[var(--color-text-secondary)]">{e.app}</span>
                  <span className="tabular-nums text-caption text-[var(--color-text-tertiary)]">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(Math.max(0, 5 - e.rating))}
                  </span>
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
