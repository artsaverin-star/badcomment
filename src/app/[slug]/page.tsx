import { notFound } from "next/navigation";
import { Card, Header, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { getProductInsights, THEME_LABEL, THEME_ORDER } from "@/lib/insights";
import { getProductIdBySlug } from "@/lib/appSlugs";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import BackLink from "@/components/BackLink";
import InsightRow from "@/components/InsightRow";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

// Canonical app insights page. Slug-based URLs (/calm, /headspace, …) keep
// the path readable; the slug→productId map lives in src/data/app-slugs.json.
// Unknown slugs 404 — this catch-all route handles every top-level path that
// isn't claimed by a static folder.

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
            <span className="w-16 shrink-0 text-right tabular-nums">
              {formatCount(count)} · {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default async function AppInsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = getProductIdBySlug(slug);
  if (!id) notFound();

  const locale = await getLocale();
  const tr = t(locale);
  const [data, insights] = await Promise.all([getProductDetail(id, locale), Promise.resolve(getProductInsights(id))]);
  if (!data) notFound();

  const metaLine = [data.developer, data.stores.map((st) => STORE_LABEL[st]).join(" + ")]
    .filter(Boolean)
    .join(" · ");

  const evidence = [
    data.avgRating != null ? `★ ${data.avgRating.toFixed(1)}` : null,
    data.installs != null ? tr.marketDash.mInstalls(formatCount(data.installs)) : null,
    data.ratingCount != null ? tr.product.ratingsScale(formatCount(data.ratingCount)) : null,
  ].filter(Boolean);

  const maxMentions = Math.max(1, ...(insights?.insights.map((i) => i.evidence.length) ?? [1]));
  const sorted = [...(insights?.insights ?? [])].sort((a, b) => {
    const noveltyOrder = { high: 0, medium: 1, low: 2 } as const;
    return noveltyOrder[a.novelty] - noveltyOrder[b.novelty] || b.evidence.length - a.evidence.length;
  });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <BackLink fallback="/" className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}>
        {tr.nav.back}
      </BackLink>

      <Card className="mb-6">
        <div className="grid gap-6 sm:grid-cols-[1fr_280px]">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              {data.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.icon} alt="" className="h-16 w-16 shrink-0 rounded-[var(--radius-lg)]" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded-[var(--radius-lg)] bg-[var(--color-surface-card-subtle)]" />
              )}
              <Header size="M" as="h1" className="min-w-0" title={data.name} description={metaLine} />
            </div>

            {evidence.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-text-secondary)]">
                {evidence.map((e, i) => (
                  <span key={i} className="tabular-nums">
                    {e}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {data.category && (
                <Tag tone="brand" size="M">
                  {categoryLabelL(locale, data.category)}
                </Tag>
              )}
              {data.stores.map((st) => (
                <Tag key={st} tone="neutral" size="M">
                  {STORE_LABEL[st]}
                </Tag>
              ))}
            </div>
          </div>

          {insights && (
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
                Просканировано {formatCount(insights.reviewsScanned)} отзывов за последние 3 месяца
              </span>
              <Histogram hist={insights.ratingBreakdown} />
            </div>
          )}
        </div>
      </Card>

      {data.screenshots.length > 0 && (
        <div className="-mx-4 mb-6 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-3">
            {data.screenshots.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="h-72 w-auto shrink-0 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] object-cover"
              />
            ))}
          </div>
        </div>
      )}

      {insights ? (
        <div className="flex flex-col gap-2">
          {THEME_ORDER.map((theme) => {
            const inTheme = sorted.filter((i) => i.theme === theme);
            if (inTheme.length === 0) return null;
            return (
              <details
                key={theme}
                open
                className="group overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]"
              >
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-90"
                      aria-hidden="true"
                    >
                      <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">{THEME_LABEL[theme]}</h2>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
                    {inTheme.length} {inTheme.length === 1 ? "инсайт" : inTheme.length >= 2 && inTheme.length <= 4 ? "инсайта" : "инсайтов"}
                  </span>
                </summary>
                <div className="flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2">
                  {inTheme.map((i) => (
                    <InsightRow key={i.id} insight={i} max={maxMentions} />
                  ))}
                </div>
              </details>
            );
          })}
          {sorted.filter((i) => !i.theme).length > 0 && (
            <details className="group overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-3 px-3.5 py-2.5 [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-90"
                    aria-hidden="true"
                  >
                    <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <h2 className="text-[14px] font-semibold text-[var(--color-text-primary)]">Без темы</h2>
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">
                  {sorted.filter((i) => !i.theme).length}
                </span>
              </summary>
              <div className="flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] p-2">
                {sorted.filter((i) => !i.theme).map((i) => (
                  <InsightRow key={i.id} insight={i} max={maxMentions} />
                ))}
              </div>
            </details>
          )}
        </div>
      ) : (
        <Card>
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Качественный разбор для этого приложения ещё не запущен.
          </p>
        </Card>
      )}
    </main>
  );
}
