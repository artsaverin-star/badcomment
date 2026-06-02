import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Header, TextBlock, Quote, ListRow, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { getProductDetail } from "@/lib/queries";
import { t, categoryLabelL, lovedLabelL } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default async function ProductDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const tr = t(locale);
  const data = await getProductDetail(id, locale);
  if (!data) notFound();

  const s = data.summary;
  const metaLine = [
    data.developer,
    data.stores.map((st) => STORE_LABEL[st]).join(" + "),
    tr.product.negativeReviews(data.totalNegative),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "ghost", size: "S" }), "mb-6")}
      >
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
          <Header
            size="M"
            as="h1"
            className="min-w-0"
            title={data.name}
            description={metaLine}
          />
        </div>
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
        {s?.opportunity && (
          <TextBlock size="M" title={s.verdict || s.tagline || data.name} description={s.opportunity} />
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── What's broken ───────────────────────────── */}
        <Card>
          <Header size="S" as="h2" title={tr.card.gaps} />
          <div className="flex flex-col gap-6">
            {s && s.gaps.length > 0
              ? s.gaps.map((gap) => (
                  <div key={gap.title} className="flex flex-col gap-2">
                    <TextBlock size="M" title={gap.title} description={gap.evidence} />
                    {gap.quote && <Quote size="S">{gap.quote}</Quote>}
                  </div>
                ))
              : data.reviews.slice(0, 8).map((r) => (
                  <div key={r.id} className="flex flex-col gap-2">
                    <TextBlock
                      size="M"
                      title={`${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)}`}
                      description={`${STORE_LABEL[r.store]} · ${r.author ?? tr.product.anon}`}
                    />
                    <Quote size="S">{r.text}</Quote>
                  </div>
                ))}
          </div>
        </Card>

        {/* ── Side column: loved + how to beat ─────────── */}
        <div className="flex flex-col gap-6">
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
