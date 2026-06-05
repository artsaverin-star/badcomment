import { Header } from "@saverin/ui-web";
import Link from "next/link";
import { t, type Locale } from "@/lib/i18n";
import { getSlugByProductId } from "@/lib/appSlugs";
import type { SegmentInsightsView, SegmentInsightTheme } from "@/lib/segmentInsights";

// Cross-app "Top problems" view powered by the qualitative-extraction insights
// (not taxonomy-classified reviews). One collapsible row per meta-theme: the
// summary shows how many apps hit it as a top complaint + total mentions; the
// open panel lists every app with its mention count and that app's most-cited
// matching insight title — linking to the app's full insights page.

export default function SegmentInsightGap({ view, locale }: { view: SegmentInsightsView; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title={tr.gapsHeading} />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          {tr.gapsCaption} {tr.scanned(view.reviewsScanned)}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        {view.themes.map((th) => (
          <ThemeRow key={th.key} theme={th} max={view.maxFail} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function ThemeRow({ theme, max, locale }: { theme: SegmentInsightTheme; max: number; locale: Locale }) {
  const tr = t(locale).market2;
  const open = theme.failApps / theme.totalApps >= 0.4;
  const pct = Math.max(3, Math.round((theme.failApps / max) * 100));
  const barColor = open ? "var(--color-accent-danger)" : "var(--color-text-tertiary)";

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-1.5 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
          <span className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="text-[14px] font-semibold text-[var(--color-text-primary)] sm:truncate">
                {theme.label}
              </span>
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
              {tr.painIn(theme.failApps, theme.totalApps)}
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
              {theme.mentions} {tr.demand}
            </span>
          </span>
        </summary>

        {theme.apps.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[var(--color-border-subtle)] px-3.5 py-3">
            <p className="text-[12px] leading-[18px] text-[var(--color-text-tertiary)]">{theme.desc}</p>
            <div className="flex flex-col gap-1">
              {theme.apps.map((a) => (
                <Link
                  key={a.productId}
                  href={getSlugByProductId(a.productId) ? `/${getSlugByProductId(a.productId)}` : "/"}
                  className="flex items-start gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 transition-colors hover:bg-[var(--color-bg-muted)]"
                >
                  {a.appIcon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.appIcon} alt="" className="mt-0.5 h-7 w-7 shrink-0 rounded-md" />
                  ) : (
                    <div className="mt-0.5 h-7 w-7 shrink-0 rounded-md bg-[var(--color-surface-card-subtle)]" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                        {a.appName || a.productId}
                      </span>
                      <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
                        {a.mentions}
                      </span>
                    </span>
                    {a.topInsightTitle && (
                      <span className="text-[12px] leading-[17px] text-[var(--color-text-secondary)]">
                        {a.topInsightTitle}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </details>
    </div>
  );
}
