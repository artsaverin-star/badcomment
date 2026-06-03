import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Header, TextBlock, Quote, ListRow, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { formatCount } from "@/lib/format";
import { t, categoryLabelL, lovedLabelL, themeLabelL, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

const STREAM_LIMIT = 14;

function fmtMonth(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(d);
}
function fmtDate(d: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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

// Aggregated complaint themes — shows the pattern is real and shared, not one
// loud reviewer.
function ThemeBars({
  themes,
  locale,
}: {
  themes: { key: string; label: string; count: number }[];
  locale: Locale;
}) {
  const max = Math.max(1, ...themes.map((th) => th.count));
  return (
    <div className="flex flex-col gap-2">
      {themes.map((th) => (
        <div key={th.key} className="flex flex-col gap-1">
          <span className="flex items-center justify-between text-[13px] text-[var(--color-text-secondary)]">
            <span>{themeLabelL(locale, th.key)}</span>
            <span className="tabular-nums text-[var(--color-text-tertiary)]">{th.count}</span>
          </span>
          <span className="h-1.5 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
            <span
              className="block h-full rounded-full bg-[var(--color-text-secondary)]"
              style={{ width: `${Math.max(4, (th.count / max) * 100)}%` }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const tr = t(locale);
  const data = await getProductDetail(id, locale);
  if (!data) notFound();

  const s = data.summary;
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

  const stream = data.reviews.slice(0, STREAM_LIMIT);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}>
        {tr.nav.back}
      </Link>

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
            <Link href={`/category/${data.category}`}>
              <Tag tone="brand" size="M">
                {categoryLabelL(locale, data.category)}
              </Tag>
            </Link>
          )}
          {data.stores.map((st) => (
            <Tag key={st} tone="neutral" size="M">
              {STORE_LABEL[st]}
            </Tag>
          ))}
        </div>
        {s?.opportunity && <TextBlock size="M" title={s.verdict || s.tagline || data.name} description={s.opportunity} />}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Main column: synthesis, then the receipts ── */}
        <div className="flex flex-col gap-6">
          {s && s.gaps.length > 0 && (
            <Card>
              <Header size="S" as="h2" title={tr.card.gaps} />
              <div className="flex flex-col gap-6">
                {s.gaps.map((gap) => (
                  <div key={gap.title} className="flex flex-col gap-2">
                    <TextBlock size="M" title={gap.title} description={gap.evidence} />
                    {gap.quote && <Quote size="S">{gap.quote}</Quote>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* The proof: real, dated complaints behind the synthesis above. */}
          {stream.length > 0 && (
            <Card>
              <Header size="S" as="h2" title={tr.product.realComplaints(data.totalNegative)} />
              <div className="flex flex-col gap-5">
                {stream.map((r) => (
                  <div key={r.id} className="flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-[var(--color-text-tertiary)]">
                      <span className="text-[var(--color-accent-danger)]">
                        {"★".repeat(r.rating)}
                        {"☆".repeat(5 - r.rating)}
                      </span>
                      <span>·</span>
                      <span>{STORE_LABEL[r.store]}</span>
                      <span>·</span>
                      <span>{r.author ?? tr.product.anon}</span>
                      {r.postedAt && (
                        <>
                          <span>·</span>
                          <span>{fmtDate(r.postedAt, locale)}</span>
                        </>
                      )}
                    </span>
                    <Quote size="S">{r.text}</Quote>
                  </div>
                ))}
              </div>
              {data.totalNegative > stream.length && (
                <p className="text-[12px] text-[var(--color-text-tertiary)]">
                  {tr.product.showingOf(stream.length, data.totalNegative)}
                </p>
              )}
            </Card>
          )}
        </div>

        {/* ── Side column: distribution, pattern, loved, how to beat ── */}
        <div className="flex flex-col gap-6">
          {data.histogram && (
            <Card>
              <Header size="S" as="h2" title={tr.product.ratingDist} />
              <Histogram hist={data.histogram} />
            </Card>
          )}

          {data.themeStats.length > 0 && (
            <Card>
              <Header size="S" as="h2" title={tr.product.complaintPattern} />
              <ThemeBars themes={data.themeStats.slice(0, 7)} locale={locale} />
            </Card>
          )}

          {s && typeof s.buildability === "number" && (
            <Card>
              <Header size="S" as="h2" title={tr.product.buildTitle} />
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                  {s.buildability.toFixed(1)}/5
                </span>
                {s.buildNote && (
                  <p className="text-[14px] leading-[20px] text-[var(--color-text-secondary)]">{s.buildNote}</p>
                )}
              </div>
            </Card>
          )}

          {s && s.loved.length > 0 && (
            <Card>
              <Header size="S" as="h2" title={tr.card.love} />
              <div className="flex flex-col gap-3">
                {s.loved.map((key) => (
                  <ListRow key={key} size="M" icon={<Check />}>
                    {lovedLabelL(locale, key)}
                  </ListRow>
                ))}
              </div>
            </Card>
          )}

          {s && s.wedge.length > 0 && (
            <Card>
              <Header size="S" as="h2" title={tr.card.howToBeat} />
              <div className="flex flex-col gap-3">
                {s.wedge.map((move) => (
                  <ListRow key={move} size="M" icon={<Check />}>
                    {move}
                  </ListRow>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
