import { Header } from "@saverin/ui-web";
import { t, type Locale } from "@/lib/i18n";
import type { AppNeedsView, AppNeed } from "@/lib/needsGap";
import EvidenceDialog from "./EvidenceDialog";

// Per-app semantic needs, in the same shape as the segment needs-gap: each need
// is a row with its mention count, a relative bar, fork sub-threads, and a popup
// of the verbatim reviews behind the number.
export default function AppNeeds({ view, locale }: { view: AppNeedsView; locale: Locale }) {
  const tr = t(locale);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <Header size="S" as="h2" title={tr.product.needsHeading} />
        <p className="text-[13px] text-[var(--color-text-tertiary)]">{tr.product.needsCaption}</p>
      </div>
      <div className="flex flex-col gap-3">
        {view.needs.map((need) => (
          <NeedRow key={need.key} need={need} max={view.maxMentions} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function NeedRow({ need, max, locale }: { need: AppNeed; max: number; locale: Locale }) {
  const tr = t(locale).market2;
  const pct = Math.max(3, Math.round((need.mentions / max) * 100));

  return (
    <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-4">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{need.label}</span>
            <span className="shrink-0 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
              {need.mentions} {tr.demand}
            </span>
          </span>

          <span className="mt-0.5 flex items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${pct}%`, background: "var(--color-accent-danger)" }}
              />
            </span>
          </span>

          {need.forks.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {need.forks.map((f) => (
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
        </summary>

        {need.evidence.length > 0 && (
          <div className="border-t border-[var(--color-border-subtle)] px-4 py-4">
            <EvidenceDialog
              buttonLabel={tr.seeReviews(need.mentions)}
              title={tr.evidenceTitle(need.label)}
              shownOf={tr.evidenceShownOf(need.evidence.length, need.mentions)}
              methodNote={tr.evidenceMethodNote}
              closeLabel={tr.close}
              evidence={need.evidence}
            />
          </div>
        )}
      </details>
    </div>
  );
}
