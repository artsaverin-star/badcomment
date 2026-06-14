"use client";

import { useRef } from "react";
import { Header } from "@saverin/ui-web";
import type { SegmentByThemeView, SegmentThemeBucket } from "@/lib/segmentInsightsByTheme";

// Cross-app theme-bucketed segment view. Visually the same chassis as the app
// /<slug> insights page: collapsible theme sections, compact insight rows
// linking to a modal with verbatim quotes. The differences from the app page:
//   - rows aggregate across apps in the segment
//   - each row shows the list of source-app icons
//   - the evidence modal lets you filter by app
//
// productMeta maps productId → { name, icon } so the row can show the
// originating app icon without a DB call here.

export type ProductMetaMap = Record<string, { name: string; icon: string | null }>;

function pluralizeNabludenie(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "наблюдение";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "наблюдения";
  return "наблюдений";
}

function pluralizeInsight(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "инсайт";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "инсайта";
  return "инсайтов";
}

export default function SegmentThemeView({
  view,
  productMeta,
}: {
  view: SegmentByThemeView;
  productMeta: ProductMetaMap;
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title="Топ проблем во всех приложениях" />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          Реальные инсайты по {view.appsCount} приложениям, сгруппированные по темам. Посчитано по {view.reviewsScanned} отзывам.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {view.themes.map((bucket) => (
          <ThemeSection key={bucket.theme} bucket={bucket} productMeta={productMeta} />
        ))}
      </div>
    </section>
  );
}

function ThemeSection({
  bucket,
  productMeta,
}: {
  bucket: SegmentThemeBucket;
  productMeta: ProductMetaMap;
}) {
  return (
    <details
      open
      className="group overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
        <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{bucket.label}</h2>
        <span className="flex shrink-0 items-center gap-2">
          <span className="text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
            {bucket.insights.length} {pluralizeInsight(bucket.insights.length)}
          </span>
          <svg
            width="10"
            height="10"
            viewBox="0 0 10 10"
            className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-90"
            aria-hidden="true"
          >
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2">
        {bucket.insights.map((i, idx) => (
          <InsightRow key={`${i.productId}-${i.id}-${idx}`} insight={i} productMeta={productMeta} />
        ))}
      </div>
    </details>
  );
}

function InsightRow({
  insight,
  productMeta,
}: {
  insight: import("@/lib/segmentInsightsByTheme").SegmentInsight;
  productMeta: ProductMetaMap;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const count = insight.observationCount ?? insight.evidence.length;
  const meta = productMeta[insight.productId];
  const appName = meta?.name ?? "";
  const appIcon = meta?.icon ?? null;

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex w-full items-baseline gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-card-subtle)]"
      >
        {appIcon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={appIcon} alt="" className="size-5 shrink-0 self-center rounded-[3px] object-cover" />
        ) : null}
        <span className="text-[13px] leading-[18px] text-[var(--color-text-primary)]">{insight.title}</span>
        <span className="ml-auto shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
          {count} {pluralizeNabludenie(count)}
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
              <span className="flex items-center gap-2 text-[11px] text-[var(--color-text-tertiary)]">
                {appIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={appIcon} alt="" className="size-4 rounded-[3px] object-cover" />
                ) : null}
                {appName}
              </span>
              <span className="text-[15px] font-semibold">{insight.title}</span>
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
            {insight.evidence.map((e, i) => (
              <div
                key={i}
                className="flex flex-col gap-1.5 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
              >
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="tabular-nums text-[11px] text-[var(--color-text-tertiary)]">
                    {"★".repeat(e.rating)}
                    {"☆".repeat(Math.max(0, 5 - e.rating))}
                  </span>
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
