"use client";

import { themeLabel, type SegmentSummary } from "@/lib/segmentSummary";
import type { Theme } from "@/lib/insights";
import InsightCard from "./InsightCard";

// Category-level synthesis as a grid of concise insight cards (title + dek + a
// «N наблюдений» button that opens the verbatim reviews). Product signal first;
// the billing/stability/account "hygiene" is collapsed below — it's table
// stakes, not what makes a category interesting.

// Pure money/account hygiene stays collapsed; reliability is product-relevant
// (a broken core feature is an insight), so it surfaces as a card.
const HYGIENE: Theme[] = ["payment", "support"];
// Product-signal themes, in display priority.
const PRODUCT_ORDER: Theme[] = ["strategy", "content", "ui", "playback"];

function rank(theme: Theme): number {
  const i = PRODUCT_ORDER.indexOf(theme);
  return i === -1 ? PRODUCT_ORDER.length : i;
}

export default function SegmentSummaryView({
  summary,
  embedded = false,
}: {
  summary: SegmentSummary;
  embedded?: boolean;
}) {
  const product = summary.items
    .filter((it) => !HYGIENE.includes(it.theme))
    .sort((a, b) => rank(a.theme) - rank(b.theme) || b.observationCount - a.observationCount);
  const hygiene = summary.items
    .filter((it) => HYGIENE.includes(it.theme))
    .sort((a, b) => b.observationCount - a.observationCount);
  const hygieneTotal = hygiene.reduce((s, it) => s + it.observationCount, 0);

  return (
    <section className={embedded ? "" : "mt-14 border-t border-[var(--color-border-subtle)] pt-10"}>
      <div className="mx-auto max-w-[760px]">
        <div className="mb-6 text-center">
          <p className="text-caption font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            Инсайты категории
          </p>
          <p className="mt-2 text-caption text-[var(--color-text-tertiary)]">
            {summary.appsCount} приложений · {summary.reviewsScanned.toLocaleString("ru-RU")} отзывов · обновлено {summary.asOf}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {product.map((it) => (
            <InsightCard
              key={it.id}
              card
              title={it.title}
              body={it.body}
              count={it.observationCount}
              kicker={themeLabel(it.theme)}
              evidence={it.evidence}
            />
          ))}
        </div>

        {hygiene.length > 0 && (
          <details className="no-anim group/hyg mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-col">
                <span className="text-callout font-semibold text-[var(--color-text-primary)]">
                  База: оплата, стабильность, аккаунт
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  Базовая гигиена категории — {hygieneTotal} наблюдений
                </span>
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/hyg:rotate-90">
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <div className="px-5 pb-2">
              {hygiene.map((it) => (
                <InsightCard
                  key={it.id}
                  title={it.title}
                  body={it.body}
                  count={it.observationCount}
                  kicker={themeLabel(it.theme)}
                  evidence={it.evidence}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
