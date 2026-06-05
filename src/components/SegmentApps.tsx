import Link from "next/link";
import { Header } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import { getSlugByProductId } from "@/lib/appSlugs";
import type { SegmentApp } from "@/lib/segmentCards";

// Apps grid for a segment page. Apps with an authored slug (insight pipeline
// ran) link through to /<slug>; the rest render as plain tiles — visible
// research targets, not yet analyzed.
export default function SegmentApps({ apps, locale }: { apps: SegmentApp[]; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <section className="mb-6 flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title={tr.appsHeading} />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">{tr.appsCaption}</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4">
        {apps.map((a) => {
          const slug = getSlugByProductId(a.id);
          const baseClass =
            "flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1 pl-1 pr-2.5";
          const inner = (
            <>
              {a.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.icon} alt="" className="size-6 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="size-6 shrink-0 rounded-full bg-[var(--color-bg-muted)]" />
              )}
              <span className="truncate text-[12px] text-[var(--color-text-primary)]">{a.name}</span>
              <span className="ml-auto shrink-0 text-[12px] font-medium tabular-nums text-[var(--color-accent-danger)]">
                {a.negative}
              </span>
            </>
          );
          return slug ? (
            <Link
              key={a.id}
              href={`/${slug}`}
              className={`${baseClass} transition-colors hover:border-[var(--color-text-tertiary)]`}
            >
              {inner}
            </Link>
          ) : (
            <div key={a.id} className={baseClass}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
