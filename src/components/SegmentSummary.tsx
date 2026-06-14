"use client";

import { themeLabel, type SegmentSummary } from "@/lib/segmentSummary";
import InsightCard from "./InsightCard";

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
  return (
    <InsightCard
      title={item.title}
      body={item.body}
      apps={item.apps}
      count={item.observationCount}
      kicker={themeLabel(item.theme)}
      evidence={item.evidence}
    />
  );
}
