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

// Pick a magazine-style pull quote for a section: a vivid, medium-length real
// review (prefer the loudest rating).
function pickQuote(section: SegmentSummary["sections"][number]) {
  const all = section.items.flatMap((i) => i.evidence);
  const good = all.filter((e) => e.quote.length >= 40 && e.quote.length <= 200);
  return (good.length ? good : all).sort((a, b) => b.rating - a.rating)[0] ?? null;
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
        <p className={`${embedded ? "" : "mt-4"} text-[17px] leading-[1.7] text-[var(--color-text-secondary)]`}>
          {summary.lead}
        </p>
        <p className="mt-4 text-caption text-[var(--color-text-tertiary)]">
          {summary.appsCount} приложений · {summary.reviewsScanned.toLocaleString("ru-RU")} отзывов · обновлено {summary.asOf}
        </p>

        <div className="mt-10 flex flex-col gap-8">
          {summary.sections.map((section) => {
            const pull = pickQuote(section);
            return (
              <details key={section.id} open className="no-anim group/sec">
                <summary
                  onClick={keepInView}
                  className="-mx-3 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--color-surface-card-subtle)] [&::-webkit-details-marker]:hidden"
                >
                  <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
                    {section.heading}
                  </h3>
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/sec:rotate-90">
                    <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                      <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </summary>
                {section.dek && (
                  <p className="mt-2 px-0 text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">{section.dek}</p>
                )}
                {pull && (
                  <figure className="my-6 border-l-2 border-[var(--color-text-brand)] pl-5">
                    <blockquote className="text-[19px] font-medium leading-[1.45] tracking-[-0.01em] text-[var(--color-text-primary)]">
                      «{pull.quote}»
                    </blockquote>
                    <figcaption className="mt-2.5 flex flex-wrap items-center gap-2 text-caption text-[var(--color-text-tertiary)]">
                      <span className="tabular-nums tracking-wide text-[#f5b301]">
                        {"★".repeat(pull.rating)}
                        {"☆".repeat(Math.max(0, 5 - pull.rating))}
                      </span>
                      <span>{pull.app}</span>
                    </figcaption>
                  </figure>
                )}
                <div className="mt-3 flex flex-col">
                  {section.items.map((item) => (
                    <CategoryInsightRow key={item.id} item={item} />
                  ))}
                </div>
              </details>
            );
          })}
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
          <span className="text-[16px] font-semibold leading-snug text-[var(--color-text-primary)]">
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
        <span className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{item.body}</span>
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
