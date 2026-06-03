import { Header, Tag, Quote } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { NeedsGapView, NeedGap } from "@/lib/needsGap";

type M2 = ReturnType<typeof t>["market2"];

export default function NeedsGap({ view, locale }: { view: NeedsGapView; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <Header size="S" as="h2" title={tr.gapsHeading} />
        <div className="flex flex-col gap-3">
          {view.needs.map((need) => (
            <NeedRow key={need.key} need={need} max={view.maxFail} tr={tr} />
          ))}
        </div>
      </section>

      {view.whitespace.length > 0 && (
        <section className="flex flex-col gap-3">
          <Header size="S" as="h2" title={tr.whitespaceHeading} description={tr.whitespaceNote} />
          <div className="flex flex-col gap-2">
            {view.whitespace.map((w, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-xl)] border border-dashed border-[var(--color-border-subtle)] p-4"
              >
                <p className="text-[14px] leading-[20px] text-[var(--color-text-secondary)]">{w}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function NeedRow({ need, max, tr }: { need: NeedGap; max: number; tr: M2 }) {
  const open = need.verdict === "open";
  const tone = open ? "danger" : need.verdict === "narrow" ? "warning" : "neutral";
  const verdictLabel =
    need.verdict === "open" ? tr.verdictOpen : need.verdict === "narrow" ? tr.verdictNarrow : tr.verdictThin;
  const pct = Math.max(3, Math.round((need.failApps / max) * 100));
  const barColor = open ? "var(--color-accent-danger)" : "var(--color-text-tertiary)";

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex items-center gap-2">
              <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{need.label}</span>
              <Tag tone={tone} size="S">
                {verdictLabel}
              </Tag>
            </span>
            <span className="text-[12px] text-[var(--color-text-tertiary)]">
              {tr.painIn(need.failApps, need.totalApps)}
            </span>
          </span>

          <span className="text-[13px] leading-[18px] text-[var(--color-text-secondary)]">{need.desc}</span>

          <span className="mt-0.5 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
              {need.complaintMentions} {tr.demand}
            </span>
          </span>

          {need.bestApp && (
            <span className="text-[12px] text-[var(--color-text-tertiary)]">{tr.bestApp(need.bestApp.name)}</span>
          )}
        </summary>

        {need.apps.length > 0 && (
          <div className="flex flex-col gap-4 border-t border-[var(--color-border-subtle)] px-4 py-4">
            <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
              {tr.appsBreakdown}
            </span>
            {need.apps.slice(0, 8).map((app) => (
              <div key={app.id} className="flex flex-col gap-1.5">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  {app.icon && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={app.icon} alt="" className="size-6 shrink-0 rounded-[var(--radius-md)] object-cover" />
                  )}
                  <span className="text-[14px] text-[var(--color-text-primary)]">{app.name}</span>
                  <span className="tabular-nums text-[12px] text-[var(--color-accent-danger)]">
                    {tr.complaintsLabel(app.complaints)}
                  </span>
                  {app.praises > 0 && (
                    <span className="tabular-nums text-[12px] text-[var(--color-text-tertiary)]">
                      {tr.praiseLabel(app.praises)}
                    </span>
                  )}
                </span>
                {app.quotes.map((q, i) => (
                  <Quote key={i} size="S">
                    {q}
                  </Quote>
                ))}
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
