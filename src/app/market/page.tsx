import { Card, Header } from "@saverin/ui-web";
import { getFullDeck } from "@/lib/deck";
import { getSegments } from "@/lib/segments";
import { computeMarketStats } from "@/lib/marketStats";
import { formatCount } from "@/lib/format";
import { t, opportunityTypeLabelL, type Locale } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import type { OpportunityType } from "@/lib/summarize";
import type { MarketStats } from "@/lib/marketStats";
import MarketGenres from "@/components/MarketGenres";

export const dynamic = "force-dynamic";

const OPP_COLORS: Record<OpportunityType, string> = {
  design: "#6366f1",
  features: "#0ea5e9",
  reliability: "#ef4444",
  pricing: "#f59e0b",
  content: "#10b981",
  support: "#8b5cf6",
};
const NO_OPP = "#94a3b8";
const oppColor = (o: OpportunityType | null) => (o ? OPP_COLORS[o] : NO_OPP);

// The market map: hand-authored genres (src/data/segments.json) rendered as
// nested "launch briefs". The top-down funnel is overview (summary band +
// opportunity map) → genre card (the five launch questions) → the apps
// themselves. Quant tracks the live deck; prose is the authored segment copy.
export default async function Market() {
  const locale = await getLocale();
  const tr = t(locale);

  const segments = getSegments(locale);
  const deck = await getFullDeck(locale);
  const stats = computeMarketStats(deck, segments);

  return (
    <main className="mx-auto max-w-5xl overflow-x-clip px-4 py-10">
      <Header
        size="L"
        as="h1"
        className="mb-8 items-center text-center"
        title={tr.marketDash.title}
        description={<span className="mx-auto block max-w-2xl">{tr.marketDash.subtitle}</span>}
      />

      <div className="mb-12 flex flex-col gap-6">
        <SummaryBand tr={tr.marketDash} totals={stats.totals} />
        <OpportunityMap stats={stats} tr={tr.marketDash} locale={locale} />
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

// Server-rendered opportunity scatter: x = log install base (proven demand),
// y = dissatisfaction (5 − avgRating, higher = more hated), bubble size = number
// of players, color = dominant opportunity type. Bubbles anchor-link to the
// matching genre card below — no client state needed.
function OpportunityMap({
  stats,
  tr,
  locale,
}: {
  stats: MarketStats;
  tr: ReturnType<typeof t>["marketDash"];
  locale: Locale;
}) {
  const W = 820;
  const H = 460;
  const padL = 40;
  const padR = 24;
  const padT = 24;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const pts = stats.genres
    .filter((g) => g.installBase > 0 && g.avgRating != null)
    .map((g) => ({ ...g, gap: 5 - (g.avgRating as number) }));

  const oppTypes: OpportunityType[] = ["design", "features", "reliability", "pricing", "content", "support"];

  if (pts.length === 0) return null;

  const logs = pts.map((r) => Math.log10(r.installBase));
  const minLog = Math.floor(Math.min(...logs));
  const maxLog = Math.ceil(Math.max(...logs));
  const gaps = pts.map((r) => r.gap);
  const minGap = Math.max(0, Math.min(...gaps) - 0.1);
  const maxGap = Math.max(...gaps) + 0.1;
  const maxApps = Math.max(...pts.map((r) => r.appCount), 1);

  const x = (base: number) => padL + ((Math.log10(base) - minLog) / (maxLog - minLog || 1)) * plotW;
  const y = (gap: number) => padT + (1 - (gap - minGap) / (maxGap - minGap || 1)) * plotH;
  const r = (apps: number) => 5 + Math.sqrt(apps / maxApps) * 33;

  const gridX: number[] = [];
  for (let p = minLog; p <= maxLog; p++) gridX.push(p);

  return (
    <Card className="w-full gap-3 border-transparent p-4 shadow-none sm:p-6">
      <Header size="S" as="h3" title={tr.mapTitle} />
      <p className="text-[13px] leading-[18px] text-[var(--color-text-tertiary)]">{tr.mapHint}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {oppTypes.map((o) => (
          <span key={o} className="flex items-center gap-1.5 text-[13px] text-[var(--color-text-secondary)]">
            <span className="inline-block size-2.5 rounded-full" style={{ background: OPP_COLORS[o] }} />
            {opportunityTypeLabelL(locale, o)}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={tr.mapTitle}>
        {gridX.map((p) => {
          const gx = x(Math.pow(10, p));
          return (
            <g key={p}>
              <line x1={gx} y1={padT} x2={gx} y2={padT + plotH} stroke="var(--color-border)" strokeWidth={1} strokeDasharray="3 4" />
              <text x={gx} y={H - padB + 16} textAnchor="middle" fontSize={11} fill="var(--color-text-tertiary)">
                {formatCount(Math.pow(10, p))}
              </text>
            </g>
          );
        })}

        <text x={padL + plotW / 2} y={H - 6} textAnchor="middle" fontSize={12} fill="var(--color-text-secondary)">
          {tr.axisScale}
        </text>
        <text x={12} y={padT + plotH / 2} textAnchor="middle" fontSize={12} fill="var(--color-text-secondary)" transform={`rotate(-90 12 ${padT + plotH / 2})`}>
          {tr.axisGap}
        </text>

        {pts.map((p) => (
          <a key={p.slug} href={`#seg-${p.slug}`}>
            <title>
              {p.name} · {tr.players(p.appCount)}
            </title>
            <circle
              cx={x(p.installBase)}
              cy={y(p.gap)}
              r={r(p.appCount)}
              fill={oppColor(p.oppType)}
              fillOpacity={0.55}
              stroke={oppColor(p.oppType)}
              strokeWidth={1}
            />
          </a>
        ))}
      </svg>
      <p className="text-[12px] text-[var(--color-text-tertiary)]">{tr.bubbleHint}</p>
    </Card>
  );
}
