import { notFound } from "next/navigation";
import { Card, Header, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { getAppNeeds } from "@/lib/needsGap";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import AppNeeds from "@/components/AppNeeds";
import BackLink from "@/components/BackLink";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

function fmtMonth(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(d);
}

// The full rating distribution straight from the store — the most irrefutable
// proof of dissatisfaction. Low stars run red, high stars muted.
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

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const tr = t(locale);
  const [data, needs] = await Promise.all([getProductDetail(id, locale), getAppNeeds(id, locale)]);
  if (!data) notFound();

  const metaLine = [data.developer, data.stores.map((st) => STORE_LABEL[st]).join(" + ")]
    .filter(Boolean)
    .join(" · ");

  // The honest evidence strip: real scale, satisfaction and how fresh it is.
  const evidence = [
    data.avgRating != null ? `★ ${data.avgRating.toFixed(1)}` : null,
    data.installs != null ? tr.marketDash.mInstalls(formatCount(data.installs)) : null,
    data.ratingCount != null ? tr.product.ratingsScale(formatCount(data.ratingCount)) : null,
    data.dateFrom && data.dateTo
      ? tr.product.reviewSpan(fmtMonth(data.dateFrom, locale), fmtMonth(data.dateTo, locale))
      : null,
  ].filter(Boolean);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <BackLink fallback="/" className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}>
        {tr.nav.back}
      </BackLink>

      {/* ── Promo: screenshots + identity ───────────────── */}
      {data.screenshots.length > 0 && (
        <div className="mb-6 flex gap-3 overflow-x-auto">
          {data.screenshots.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="h-[300px] w-[145px] shrink-0 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] object-cover object-top"
            />
          ))}
        </div>
      )}

      <Card className="mb-6">
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
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Main column: the app's pains, by meaning ── */}
        <div className="flex flex-col gap-6">
          {needs ? (
            <AppNeeds view={needs} locale={locale} productId={id} />
          ) : (
            <Card>
              <p className="text-[14px] text-[var(--color-text-secondary)]">{tr.market2.stubNote}</p>
            </Card>
          )}
        </div>

        {/* ── Side column: rating distribution ── */}
        <div className="flex flex-col gap-6">
          {data.histogram && (
            <Card>
              <Header size="S" as="h2" title={tr.product.ratingDist} />
              <Histogram hist={data.histogram} />
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
