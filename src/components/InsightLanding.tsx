import type { ProductDetail } from "@/lib/queries";
import { THEME_LABEL, THEME_ORDER, type Insight, type ProductInsights } from "@/lib/insights";
import { formatCount } from "@/lib/format";
import type { t } from "@/lib/i18n";
import InsightRow from "@/components/InsightRow";

// Only the store-level header fields are needed to render the long-read, so the
// component takes this narrow slice — a full ProductDetail satisfies it, and so
// does a lightweight stub when the DB-backed detail is unavailable.
export type LandingProduct = Pick<
  ProductDetail,
  "name" | "developer" | "stores" | "icon" | "screenshots" | "avgRating" | "installs" | "ratingCount"
>;

// Presentational body of the per-app insight long-read: hero, factual lede,
// rating histogram, screenshot strip, and the editorial theme sections. Shared
// by the canonical /<slug> page and the model-comparison experiment page so
// both render identically. Renders bespoke `group`s when present, otherwise the
// fixed 7-theme taxonomy.

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

function obsOf(i: Insight) {
  return i.observationCount ?? i.evidence.length;
}

function Histogram({ hist }: { hist: Record<string, number> }) {
  const rows = [5, 4, 3, 2, 1];
  const total = rows.reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
  const max = Math.max(1, ...rows.map((n) => hist[String(n)] ?? 0));
  const color = (star: number) =>
    star <= 2 ? "var(--color-accent-danger)" : star === 3 ? "var(--color-accent-warning)" : "var(--color-text-tertiary)";
  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((star) => {
        const count = hist[String(star)] ?? 0;
        const pct = total ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-[12px] text-[var(--color-text-tertiary)]">
            <span className="w-6 shrink-0 tabular-nums">{star}★</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
              <span
                className="block h-full rounded-full"
                style={{ width: `${Math.max(2, (count / max) * 100)}%`, background: color(star) }}
              />
            </span>
            <span className="w-24 shrink-0 whitespace-nowrap text-right tabular-nums">
              {formatCount(count)} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function InsightLanding({
  data,
  insights,
  tr,
}: {
  data: LandingProduct;
  insights: ProductInsights;
  tr: ReturnType<typeof t>;
}) {
  const metaLine = [data.developer, data.stores.map((st) => STORE_LABEL[st]).join(" + ")]
    .filter(Boolean)
    .join(" · ");

  const stat = [
    data.avgRating != null ? `★ ${data.avgRating.toFixed(1)}` : null,
    data.installs != null ? tr.marketDash.mInstalls(formatCount(data.installs)) : null,
    data.ratingCount != null ? tr.product.ratingsScale(formatCount(data.ratingCount)) : null,
  ].filter(Boolean);

  const ordered = insights.insights ?? [];
  const all = [...ordered].sort((a, b) => obsOf(b) - obsOf(a));

  const groupOrder: Array<{ id: string; name: string; items: Insight[] }> = [];
  const groupIdx = new Map<string, number>();
  for (const i of ordered) {
    if (!i.group) continue;
    let gi = groupIdx.get(i.group.id);
    if (gi === undefined) {
      gi = groupOrder.length;
      groupIdx.set(i.group.id, gi);
      groupOrder.push({ id: i.group.id, name: i.group.name, items: [] });
    }
    groupOrder[gi].items.push(i);
  }
  const hasGroups = groupOrder.length > 0;

  const sections = hasGroups
    ? groupOrder.map((g) => ({ key: g.id, name: g.name, items: g.items }))
    : THEME_ORDER.map((th) => ({
        key: th,
        name: THEME_LABEL[th],
        items: all.filter((i) => i.theme === th),
      }));
  const leftover = hasGroups ? ordered.filter((i) => !i.group) : all.filter((i) => !i.theme);

  const hist = insights.ratingBreakdown ?? {};
  const histTotal = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
  const lowPct = histTotal ? Math.round((((hist["1"] ?? 0) + (hist["2"] ?? 0)) / histTotal) * 100) : 0;
  const themeCount = sections.filter((s) => s.items.length > 0).length;

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {data.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.icon} alt="" className="h-14 w-14 shrink-0 rounded-[var(--radius-lg)]" />
          ) : null}
          <h1 className="text-[44px] font-semibold leading-none tracking-tight text-[var(--color-text-primary)] sm:text-[56px]">
            {data.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-secondary)]">
          <span>{metaLine}</span>
          {stat.map((e, i) => (
            <span key={i} className="tabular-nums text-[var(--color-text-tertiary)]">
              · {e}
            </span>
          ))}
        </div>

        <p className="max-w-xl text-[16px] leading-[24px] text-[var(--color-text-secondary)]">
          За последние 90 дней — <span className="tabular-nums text-[var(--color-text-primary)]">{formatCount(insights.reviewsScanned)}</span> отзывов,{" "}
          <span className="tabular-nums text-[var(--color-text-primary)]">{lowPct}%</span> из них 1–2★. Ниже —{" "}
          <span className="tabular-nums text-[var(--color-text-primary)]">{all.length}</span> механизмов, которые пользователи называют сами,
          сгруппированных по <span className="tabular-nums text-[var(--color-text-primary)]">{themeCount}</span> темам.
        </p>

        <div className="mt-2 max-w-md">
          <Histogram hist={insights.ratingBreakdown} />
        </div>
      </header>

      {data.screenshots.length > 0 && (
        <div className="-mx-6 mt-10 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {data.screenshots.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-64 w-auto shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-16 flex flex-col gap-12">
        {[
          ...sections.filter((s) => s.items.length > 0),
          ...(leftover.length > 0 ? [{ key: "__rest", name: "Прочее", items: leftover }] : []),
        ].map((section) => (
          <details key={section.key} open className="group/sec">
            <summary className="mb-3 flex cursor-pointer list-none items-baseline gap-2 border-b border-[var(--color-border-strong,var(--color-text-primary))] pb-2 [&::-webkit-details-marker]:hidden">
              <svg
                width="11"
                height="11"
                viewBox="0 0 10 10"
                className="shrink-0 -translate-y-px text-[var(--color-text-tertiary)] transition-transform group-open/sec:rotate-90"
                aria-hidden="true"
              >
                <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <h2 className="text-[20px] font-semibold tracking-tight text-[var(--color-text-primary)]">{section.name}</h2>
            </summary>
            <div className="flex flex-col">
              {section.items.map((i) => (
                <InsightRow key={i.id} insight={i} />
              ))}
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
