import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { SegmentApp } from "@/lib/segmentCards";

export default function SegmentApps({ apps, locale }: { apps: SegmentApp[]; locale: Locale }) {
  const tr = t(locale).market2;
  const max = Math.max(1, ...apps.map((a) => a.negative));
  return (
    <section className="mb-8 flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title={tr.appsHeading} />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">{tr.appsCaption}</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {apps.map((a) => {
          const pct = Math.max(3, Math.round((a.negative / max) * 100));
          return (
            <Link
              key={a.id}
              href={`/product/${a.id}`}
              className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3 transition-colors hover:border-[var(--color-text-tertiary)]"
            >
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" className="size-10 shrink-0 rounded-[var(--radius-md)] object-cover" />
              ) : (
                <div className="size-10 shrink-0 rounded-[var(--radius-md)] bg-[var(--color-bg-muted)]" />
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="truncate text-[14px] text-[var(--color-text-primary)]">{a.name}</span>
                <span className="flex items-center gap-2">
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${pct}%`, background: "var(--color-accent-danger)" }}
                    />
                  </span>
                  <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
                    {tr.negativeCount(a.negative)}
                  </span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
