import type { ProductDetail } from "@/lib/queries";
import { THEME_LABEL, type Insight, type Theme, type ProductInsights } from "@/lib/insights";
import { formatCount } from "@/lib/format";
import type { t } from "@/lib/i18n";
import InsightCard from "@/components/InsightCard";

// Pure money/account hygiene stays collapsed; reliability is product-relevant
// (a broken core feature is an insight), so it surfaces as a card.
const HYGIENE: Theme[] = ["payment", "reliability"];

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
  cards,
  locale = "ru",
}: {
  data: LandingProduct;
  insights: ProductInsights;
  tr: ReturnType<typeof t>;
  locked?: boolean;
  gate?: React.ReactNode;
  cards?: import("@/lib/regenCards").RegenSet | null;
  locale?: import("@/lib/i18n").Locale;
}) {
  const ru = locale !== "en";
  const metaLine = [data.developer, data.stores.map((st) => STORE_LABEL[st]).join(" + ")]
    .filter(Boolean)
    .join(" · ");

  const ordered = insights.insights ?? [];
  const all = [...ordered].sort((a, b) => obsOf(b) - obsOf(a));
  const kickerOf = (i: Insight) => i.group?.name ?? (i.theme ? THEME_LABEL[i.theme] : undefined);

  // Prefer the regenerated overlay; otherwise build from raw insights.
  const fallback = (i: Insight): import("@/lib/regenCards").RegenCard => ({
    title: i.title,
    body: i.story || undefined,
    count: obsOf(i),
    kicker: kickerOf(i),
    evidence: i.evidence,
  });
  const product = cards
    ? cards.product
    : all.filter((i) => !(i.theme && HYGIENE.includes(i.theme))).map(fallback);
  const hygiene = cards
    ? cards.hygiene
    : all.filter((i) => i.theme && HYGIENE.includes(i.theme)).map(fallback);
  const hygieneTotal = hygiene.reduce((s, c) => s + c.count, 0);

  // Rating summary: average + count (fall back to histogram when the store
  // detail is missing).
  const histTotal = [1, 2, 3, 4, 5].reduce((s, n) => s + (insights.ratingBreakdown[String(n)] ?? 0), 0);
  const histAvg =
    histTotal > 0
      ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (insights.ratingBreakdown[String(n)] ?? 0), 0) / histTotal
      : 0;
  const avgRating = data.avgRating ?? (histAvg || null);
  const ratingCount = data.ratingCount ?? (histTotal || null);

  return (
    <>
      <header className="flex flex-col items-center gap-5 text-center">
        {data.icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.icon} alt="" className="size-20 shrink-0 rounded-[22px] shadow-[0_12px_36px_-12px_rgba(0,0,0,0.6)]" />
        ) : null}
        <h1 className="text-[40px] font-bold leading-[1.02] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[56px]">
          {data.name}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-footnote text-[var(--color-text-secondary)]">
          <span>{metaLine}</span>
          {data.installs != null && (
            <span className="tabular-nums text-[var(--color-text-tertiary)]">· {tr.marketDash.mInstalls(formatCount(data.installs))}</span>
          )}
        </div>

        {insights.description && (
          <p className="mx-auto max-w-[56ch] text-callout leading-relaxed text-[var(--color-text-secondary)]">
            {insights.description}
          </p>
        )}

        {!locked && (
          <>
            <p className="mx-auto max-w-[58ch] text-lead leading-relaxed text-[var(--color-text-secondary)]">
              {ru ? (
                <>
                  Прочитали <span className="tabular-nums text-[var(--color-text-primary)]">{formatCount(insights.reviewsScanned)}</span> отзывов и
                  собрали <span className="tabular-nums text-[var(--color-text-primary)]">{all.length}</span> повторяющихся наблюдений — то, что
                  пользователи отмечают сами.
                </>
              ) : (
                <>
                  Read <span className="tabular-nums text-[var(--color-text-primary)]">{formatCount(insights.reviewsScanned)}</span> reviews and
                  distilled <span className="tabular-nums text-[var(--color-text-primary)]">{all.length}</span> recurring observations — what
                  users point out themselves.
                </>
              )}
            </p>

            {/* Rating: big average + histogram on one level */}
            <div className="mx-auto flex w-full max-w-xl flex-col items-stretch gap-5 rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 sm:flex-row">
              {avgRating != null && (
                <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:border-r sm:border-[var(--color-border-subtle)] sm:pr-5">
                  <div className="text-[44px] font-bold leading-none tabular-nums text-[var(--color-text-primary)]">
                    {avgRating.toFixed(1)}
                  </div>
                  <div className="tabular-nums tracking-tight text-[#f5b301]">
                    {"★".repeat(Math.round(avgRating))}
                    {"☆".repeat(Math.max(0, 5 - Math.round(avgRating)))}
                  </div>
                  {ratingCount != null && (
                    <div className="text-caption text-[var(--color-text-tertiary)]">{formatCount(ratingCount)} {ru ? "оценок" : "ratings"}</div>
                  )}
                </div>
              )}
              <div className="flex-1">
                <Histogram hist={insights.ratingBreakdown} />
              </div>
            </div>
          </>
        )}
      </header>

      {!locked && data.screenshots.length > 0 && (
        <div className="-mx-4 mt-12 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
          <div className="mx-auto flex w-max gap-4">
            {data.screenshots.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[440px] w-auto shrink-0 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] object-cover"
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
            {product.map((c, i) => (
              <InsightCard
                key={i}
                card
                title={c.title}
                body={c.body}
                plus={c.plus}
                minus={c.minus}
                count={c.count}
                kicker={c.kicker}
                evidence={c.evidence}
              />
            ))}
          </div>

          {hygiene.length > 0 && (
            <details className="no-anim group/hyg mt-4 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex flex-col">
                  <span className="text-callout font-semibold text-[var(--color-text-primary)]">{ru ? "База: оплата, стабильность, аккаунт" : "Basics: billing, stability, account"}</span>
                  <span className="text-caption text-[var(--color-text-tertiary)]">
                    {ru ? "Базовая гигиена" : "Housekeeping"} — {hygieneTotal} {ru ? "наблюдений" : "observations"}
                  </span>
                </span>
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/hyg:rotate-180">
                  <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                    <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </summary>
              <div className="px-5 pb-2">
                {hygiene.map((c, i) => (
                  <InsightCard key={i} title={c.title} body={c.body} count={c.count} kicker={c.kicker} evidence={c.evidence} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </>
  );
}
