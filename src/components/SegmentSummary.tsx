"use client";

import { themeLabel, type SegmentSummary } from "@/lib/segmentSummary";
import type { Theme } from "@/lib/insights";
import type { RegenCard, RegenSet } from "@/lib/regenCards";
import InsightCard from "./InsightCard";

// Category synthesis as a grid of concise, share-worthy insight cards (title +
// what users praise/hate + a «N наблюдений» button → verbatim reviews). Prefers
// the regenerated overlay; falls back to the original synthesis split by theme.

const HYGIENE: Theme[] = ["payment", "reliability"];
const PRODUCT_ORDER: Theme[] = ["strategy", "content", "ui", "playback", "reliability"];
const rank = (theme: Theme) => {
  const i = PRODUCT_ORDER.indexOf(theme);
  return i === -1 ? PRODUCT_ORDER.length : i;
};

function fromSummary(summary: SegmentSummary): RegenSet {
  const toCard = (it: SegmentSummary["items"][number]): RegenCard => ({
    title: it.title,
    body: it.body,
    count: it.observationCount,
    apps: it.apps,
    kicker: themeLabel(it.theme),
    evidence: it.evidence,
  });
  const product = summary.items
    .filter((it) => !HYGIENE.includes(it.theme))
    .sort((a, b) => rank(a.theme) - rank(b.theme) || b.observationCount - a.observationCount)
    .map(toCard);
  const hygiene = summary.items
    .filter((it) => HYGIENE.includes(it.theme))
    .sort((a, b) => b.observationCount - a.observationCount)
    .map(toCard);
  return { product, hygiene };
}

export default function SegmentSummaryView({
  summary,
  cards,
  embedded = false,
  locale = "ru",
}: {
  summary: SegmentSummary;
  cards?: RegenSet | null;
  embedded?: boolean;
  locale?: import("@/lib/i18n").Locale;
}) {
  const ru = locale !== "en";
  const { product, hygiene } = cards ?? fromSummary(summary);
  const hygieneTotal = hygiene.reduce((s, c) => s + c.count, 0);

  return (
    <section className={embedded ? "" : "mt-14 border-t border-[var(--color-border-subtle)] pt-10"}>
      <div className="mx-auto max-w-[760px]">
        <div className="mb-6 text-center">
          <p className="text-caption font-semibold tracking-[0.02em] text-[var(--color-text-tertiary)]">
            {ru ? "Инсайты категории" : "Category insights"}
          </p>
          <p className="mt-2 text-caption text-[var(--color-text-tertiary)]">
            {summary.appsCount} {ru?"приложений":"apps"} · {summary.reviewsScanned.toLocaleString(ru?"ru-RU":"en-US")} {ru?"отзывов":"reviews"} · {ru?"обновлено":"updated"} {summary.asOf}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {product.map((c, i) => (
            <InsightCard
              key={i}
              card
              locale={locale}
              title={c.title}
              body={c.body}
              plus={c.plus}
              minus={c.minus}
              count={c.count}
              kicker={c.kicker}
              evidence={c.evidence}
            />
          ))}
        </div>

        {hygiene.length > 0 && (
          <details className="no-anim group/hyg mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
              <span className="flex flex-col">
                <span className="text-callout font-semibold text-[var(--color-text-primary)]">
                  {ru ? "База: оплата, стабильность, аккаунт" : "Basics: billing, stability, account"}
                </span>
                <span className="text-caption text-[var(--color-text-tertiary)]">
                  {ru ? "Базовая гигиена категории" : "Category housekeeping"} — {hygieneTotal} {ru?"наблюдений":"observations"}
                </span>
              </span>
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/hyg:rotate-180">
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </summary>
            <div className="px-5 pb-2">
              {hygiene.map((c, i) => (
                <InsightCard key={i} locale={locale} title={c.title} body={c.body} count={c.count} kicker={c.kicker} evidence={c.evidence} />
              ))}
            </div>
          </details>
        )}
      </div>
    </section>
  );
}
