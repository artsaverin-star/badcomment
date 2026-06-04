import Link from "next/link";
import { Tag } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { SegmentCard } from "@/lib/segmentCards";

export default function SegmentCards({ cards, locale }: { cards: SegmentCard[]; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {cards.map((c) => (
        <Link
          key={c.slug}
          href={`/market2?seg=${c.slug}`}
          className="flex flex-col gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 transition-colors hover:border-[var(--color-text-tertiary)]"
        >
          <div className="flex items-center justify-between gap-2">
            {c.icons.length > 0 ? (
              <div className="flex -space-x-2">
                {c.icons.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="size-8 rounded-[var(--radius-md)] object-cover ring-2 ring-[var(--color-surface-card)]"
                  />
                ))}
              </div>
            ) : (
              <span />
            )}
            <Tag tone={c.classified ? "brand" : "neutral"} size="S">
              {c.classified ? tr.segClassified : tr.segPending}
            </Tag>
          </div>
          <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">{c.name}</span>
          <span className="text-[13px] tabular-nums text-[var(--color-text-tertiary)]">
            {tr.segReviewsApps(c.reviewCount, c.appCount)}
          </span>
        </Link>
      ))}
    </div>
  );
}
