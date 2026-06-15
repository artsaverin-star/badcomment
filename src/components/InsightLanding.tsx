import type { ProductDetail } from "@/lib/queries";
import { THEME_LABEL, type Insight, type Theme, type ProductInsights } from "@/lib/insights";
import { formatCount } from "@/lib/format";
import type { t } from "@/lib/i18n";
import InsightCard from "@/components/InsightCard";

// Baseline-expectation themes (billing/stability/account) — kept but collapsed
// below the product signal, same as the category summary.
const HYGIENE: Theme[] = ["payment", "reliability", "support"];

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
          <div key={star} className="flex items-center gap-2 text-caption text-[var(--color-text-tertiary)]">
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
  locked = false,
  gate,
}: {
  data: LandingProduct;
  insights: ProductInsights;
  tr: ReturnType<typeof t>;
  locked?: boolean;
  gate?: React.ReactNode;
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

  // Product signal first; billing/stability/account collapsed into «База».
  const product = all.filter((i) => !(i.theme && HYGIENE.includes(i.theme)));
  const hygiene = all.filter((i) => i.theme && HYGIENE.includes(i.theme));
  const hygieneTotal = hygiene.reduce((s, i) => s + obsOf(i), 0);
  const kickerOf = (i: Insight) => i.group?.name ?? (i.theme ? THEME_LABEL[i.theme] : undefined);

  return (
    <>
      <header className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {data.icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.icon} alt="" className="h-14 w-14 shrink-0 rounded-[var(--radius-lg)]" />
          ) : null}
          <h1 className="text-[32px] font-bold leading-[1.05] tracking-tight text-[var(--color-text-primary)] sm:text-[42px]">
            {data.name}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-[var(--color-text-secondary)]">
          <span>{metaLine}</span>
          {stat.map((e, i) => (
            <span key={i} className="tabular-nums text-[var(--color-text-tertiary)]">
              · {e}
            </span>
          ))}
        </div>

        {!locked && (
          <>
            <p className="max-w-[60ch] text-lead text-[var(--color-text-secondary)]">
              Прочитали <span className="tabular-nums text-[var(--color-text-primary)]">{formatCount(insights.reviewsScanned)}</span> отзывов и
              собрали <span className="tabular-nums text-[var(--color-text-primary)]">{all.length}</span> повторяющихся наблюдений — то, что
              пользователи отмечают сами.
            </p>

            <div className="mt-2 max-w-md">
              <Histogram hist={insights.ratingBreakdown} />
            </div>
          </>
        )}
      </header>

      {!locked && data.screenshots.length > 0 && (
        <div className="-mx-6 mt-10 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {data.screenshots.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-64 w-auto shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {locked ? (
        gate ?? null
      ) : (
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.map((i) => (
              <InsightCard
                key={i.id}
                card
                title={i.title}
                body={i.story || undefined}
                count={obsOf(i)}
                kicker={kickerOf(i)}
                evidence={i.evidence}
              />
            ))}
          </div>

          {hygiene.length > 0 && (
            <details className="no-anim group/hyg mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-col">
                  <span className="text-callout font-semibold text-[var(--color-text-primary)]">
                    База: оплата, стабильность, аккаунт
                  </span>
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    Базовая гигиена — {hygieneTotal} наблюдений
                  </span>
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/hyg:rotate-90">
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-2">
                {hygiene.map((i) => (
                  <InsightCard
                    key={i.id}
                    title={i.title}
                    body={i.story || undefined}
                    count={obsOf(i)}
                    kicker={kickerOf(i)}
                    evidence={i.evidence}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </>
  );
}
