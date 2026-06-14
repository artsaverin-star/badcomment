"use client";

import { useRef } from "react";
import { themeLabel, type SegmentSummary } from "@/lib/segmentSummary";

// Category-level editorial synthesis ("инсайты категории"), rendered at the end
// of a segment page as a magazine-style long-read: a lede, then narrative
// cross-app sections (authored heading + dek), each followed by the mechanisms
// as hairline rows. Every figure traces to real reviews — see
// scripts/build-segment-insights.ts.

// Keep the clicked section header in the same viewport position across a
// collapse/expand so the page doesn't jump (sections collapse instantly via the
// .no-anim CSS override, so one rAF sees the settled layout).
function keepInView(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const before = el.getBoundingClientRect().top;
  requestAnimationFrame(() => {
    const delta = el.getBoundingClientRect().top - before;
    if (delta) window.scrollBy(0, delta);
  });
}

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
    <section className={embedded ? "" : "mt-14 border-t border-[var(--color-border-subtle)] pt-10"}>
      <div className="mx-auto max-w-[680px]">
        {!embedded && (
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            Инсайты категории
          </p>
        )}
        <p className={`${embedded ? "" : "mt-4"} text-[20px] leading-[1.7] text-[var(--color-text-secondary)]`}>
          {summary.lead}
        </p>
        <p className="mt-4 text-caption text-[var(--color-text-tertiary)]">
          {summary.appsCount} приложений · {summary.reviewsScanned.toLocaleString("ru-RU")} отзывов · обновлено {summary.asOf}
        </p>

        <div className="mt-12 flex flex-col gap-12">
          {summary.sections.map((section) => (
            <details key={section.id} open className="no-anim group/sec">
              <summary
                onClick={keepInView}
                className="flex cursor-pointer list-none items-start justify-between gap-4 [&::-webkit-details-marker]:hidden"
              >
                <h3 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)]">
                  {section.heading}
                </h3>
                <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/sec:rotate-90">
                  <svg width="12" height="12" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              {section.dek && (
                <p className="mt-4 text-[18px] leading-[1.7] text-[var(--color-text-secondary)]">{section.dek}</p>
              )}
              <div className="mt-6 flex flex-col">
                {section.items.map((item) => (
                  <CategoryInsightRow key={item.id} item={item} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryInsightRow({ item }: { item: SegmentSummary["items"][number] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = item.observationCount;
  const open = () => {
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="group/row flex w-full flex-col gap-1.5 border-t border-[var(--color-border-subtle)] py-5 text-left first:border-t-0"
      >
        <span className="flex items-start justify-between gap-4">
          <span className="text-[17px] font-semibold leading-snug text-[var(--color-text-primary)] transition-colors group-hover/row:text-[var(--color-text-brand)]">
            {item.title}
          </span>
          <span className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-bg-muted)] px-2.5 py-1 text-[12px] font-medium tabular-nums text-[var(--color-text-secondary)] transition-colors group-hover/row:bg-[var(--color-surface-pressed)] group-hover/row:text-[var(--color-text-primary)]">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7.2v3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="5.1" r="0.9" fill="currentColor" />
            </svg>
            {count} {pluralizeNabludenie(count)}
          </span>
        </span>
        <span className="text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">{item.body}</span>
        <span className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-tertiary)]">
          {item.apps.join(" · ")}
        </span>
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
