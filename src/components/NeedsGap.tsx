import { Header, Tag } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { NeedsGapView, NeedGap } from "@/lib/needsGap";
import EvidenceDialog from "./EvidenceDialog";

type M2 = ReturnType<typeof t>["market2"];

export default function NeedsGap({ view, locale }: { view: NeedsGapView; locale: Locale }) {
  const tr = t(locale).market2;
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title={tr.gapsHeading} />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">{tr.gapsCaption}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        {view.needs.map((need) => (
          <NeedRow key={need.key} need={need} max={view.maxFail} tr={tr} />
        ))}
      </div>
    </section>
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
        <summary className="flex cursor-pointer list-none flex-col gap-1.5 px-3.5 py-2.5">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{need.label}</span>
              <Tag tone={tone} size="S">
                {verdictLabel}
              </Tag>
            </span>
            <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
              {tr.painIn(need.failApps, need.totalApps)}
            </span>
          </span>

          <span className="flex items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
              {need.complaintMentions} {tr.demand}
            </span>
          </span>
        </summary>

        {(need.apps.length > 0 || need.evidence.length > 0 || need.forks.length > 0) && (
          <div className="flex flex-col gap-4 border-t border-[var(--color-border-subtle)] px-4 py-4">
            {need.evidence.length > 0 && (
              <EvidenceDialog
                forks={need.forks}
                seeAllLabel={tr.seeReviews(need.complaintMentions)}
                title={tr.evidenceTitle(need.label)}
                total={need.complaintMentions}
                shownWord={tr.evidenceShownWord}
                ofWord={tr.evidenceOfWord}
                allLabel={tr.evidenceAll}
                byAppLabel={tr.evidenceByApp}
                byProblemLabel={tr.evidenceByProblem}
                methodNote={tr.evidenceMethodNote}
                closeLabel={tr.close}
                evidence={need.evidence}
              />
            )}
            {need.apps.length > 0 && (
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                {tr.appsBreakdown}
              </span>
            )}
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
                </span>
                {app.forks.length > 0 && (
                  <span className="flex flex-wrap gap-1.5">
                    {app.forks.map((f) => (
                      <span
                        key={f.key}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
                      >
                        {f.label}
                        <span className="tabular-nums text-[var(--color-text-tertiary)]">{f.mentions}</span>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
