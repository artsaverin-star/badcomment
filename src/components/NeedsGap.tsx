import { Header } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { NeedsGapView, NeedGap } from "@/lib/needsGap";
import EvidenceDialog, { type EvidenceApp } from "./EvidenceDialog";

type M2 = ReturnType<typeof t>["market2"];

export default function NeedsGap({ view, locale }: { view: NeedsGapView; locale: Locale }) {
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
        {view.needs.map((need) => (
          <NeedRow key={need.key} need={need} max={view.maxFail} slug={view.slug} tr={tr} />
        ))}
      </div>
    </section>
  );
}

function NeedRow({ need, max, slug, tr }: { need: NeedGap; max: number; slug: string; tr: M2 }) {
  const open = need.verdict === "open";
  const pct = Math.max(3, Math.round((need.failApps / max) * 100));
  const barColor = open ? "var(--color-accent-danger)" : "var(--color-text-tertiary)";

  const apps: EvidenceApp[] = need.apps.slice(0, 8).map((a) => ({
    id: a.id,
    name: a.name,
    icon: a.icon,
    complaints: a.complaints,
    complaintsText: tr.complaintsLabel(a.complaints),
    forks: a.forks,
  }));

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-1.5 px-3.5 py-2.5">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-[14px] font-semibold text-[var(--color-text-primary)]">{need.label}</span>
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

        {(need.apps.length > 0 || need.forks.length > 0) && (
          <div className="flex flex-col gap-4 border-t border-[var(--color-border-subtle)] px-4 py-4">
            <EvidenceDialog
              source={{ kind: "segment", slug }}
              needKey={need.key}
              title={tr.evidenceTitle(need.label)}
              total={need.complaintMentions}
              forks={need.forks}
              apps={apps}
              seeAllLabel={tr.seeReviews(need.complaintMentions)}
              appsBreakdownLabel={tr.appsBreakdown}
              shownWord={tr.evidenceShownWord}
              ofWord={tr.evidenceOfWord}
              allLabel={tr.evidenceAll}
              byAppLabel={tr.evidenceByApp}
              byProblemLabel={tr.evidenceByProblem}
              methodNote={tr.evidenceMethodNote}
              loadingLabel={tr.evidenceLoading}
              emptyLabel={tr.evidenceEmpty}
              closeLabel={tr.close}
            />
          </div>
        )}
      </details>
    </div>
  );
}
