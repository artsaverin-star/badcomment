import { Card, Header } from "@saverin/ui-web";
import { getFullDeck } from "@/lib/deck";
import { getSegments } from "@/lib/segments";
import { computeMarketStats } from "@/lib/marketStats";
import { getDataFreshness } from "@/lib/queries";
import { formatCount } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import type { MarketStats } from "@/lib/marketStats";
import MarketGenres from "@/components/MarketGenres";

export const dynamic = "force-dynamic";

// The market map: hand-authored genres (src/data/segments.json) rendered as
// nested "launch briefs". The top-down funnel is overview (summary band) →
// genre card (the five launch questions) → the apps themselves. Quant tracks
// the live deck; prose is the authored segment copy.
export default async function Market() {
  const locale = await getLocale();
  const tr = t(locale);

  const segments = getSegments(locale);
  const deck = await getFullDeck(locale);
  const stats = computeMarketStats(deck, segments);
  const fresh = await getDataFreshness();
  const freshDate = fresh.latest
    ? new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" }).format(fresh.latest)
    : null;

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-4 items-center text-center"
        title={tr.marketDash.title}
        description={<span className="mx-auto block max-w-2xl">{tr.marketDash.subtitle}</span>}
      />

      {freshDate && (
        <p className="mb-8 text-center text-[13px] text-[var(--color-text-tertiary)]">
          {tr.marketDash.dataFresh(freshDate, formatCount(fresh.reviews))}
        </p>
      )}

      <div className="mb-12 flex flex-col gap-6">
        <SummaryBand tr={tr.marketDash} totals={stats.totals} />
      </div>

      <MarketGenres genres={stats.genres} locale={locale} />
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-2 py-1 text-center">
      <span className="text-2xl font-semibold tabular-nums text-[var(--color-text-primary)] sm:text-3xl">{value}</span>
      <span className="text-[13px] leading-tight text-[var(--color-text-secondary)]">{label}</span>
    </div>
  );
}

function SummaryBand({
  tr,
  totals,
}: {
  tr: ReturnType<typeof t>["marketDash"];
  totals: MarketStats["totals"];
}) {
  return (
    <Card className="w-full border-transparent p-4 shadow-none sm:p-6">
      <div className="flex flex-row flex-wrap items-stretch justify-around gap-y-4">
        <Stat value={String(totals.apps)} label={tr.apps} />
        <Stat value={String(totals.genres)} label={tr.genres} />
        <Stat value={`${formatCount(totals.installBase)}+`} label={tr.installBase} />
        <Stat value={formatCount(totals.ratingCount)} label={tr.ratings} />
      </div>
    </Card>
  );
}
