import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import type { SegmentCard } from "@/lib/segmentCards";

// Compact segment-directory grid. Many segments are still research stubs (no
// data yet) so the card focuses on the basics — name + scale — and keeps icon
// stacks small so 100 cards stay scannable.
export default function SegmentCards({ cards, locale }: { cards: SegmentCard[]; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.slug}
          href={`/segment/${c.slug}`}
          className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2.5 transition-colors hover:border-[var(--color-text-tertiary)]"
        >
          {c.icons.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0">
              {c.icons.slice(0, 3).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt=""
                  className="size-7 rounded-[var(--radius-sm)] object-cover ring-2 ring-[var(--color-surface-card)]"
                />
              ))}
            </div>
          )}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{c.name}</span>
            <span className="truncate text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
              {tr.segReviewsApps(c.reviewCount, c.appCount)}
            </span>
          </span>
          {c.classified && (
            <span
              className="shrink-0 rounded-full bg-[var(--color-accent-success)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-accent-success)]"
              title="Insights ready"
            >
              ●
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
