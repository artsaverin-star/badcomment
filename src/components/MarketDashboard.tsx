"use client";

import { useMemo, useState } from "react";
import { Card, Header, Tag } from "@saverin/ui-web";
import { formatCount } from "@/lib/format";
import { t, opportunityTypeLabelL, type Locale } from "@/lib/i18n";
import type { MarketStats, GenreStat } from "@/lib/marketStats";
import type { OpportunityType } from "@/lib/summarize";

// Bubble color = where the opening is (dominant opportunity type of the genre).
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

// The editable revenue model. installs are cumulative, so activeRate trims them
// to a live base; conversion is the paying share; the rest is plain ARR math.
type Knobs = { activeRate: number; conversion: number; storeCut: number };
const DEFAULTS: Knobs = { activeRate: 0.1, conversion: 0.03, storeCut: 0.3 };

function arrFor(base: number, monthly: number, k: Knobs): number {
  return base * k.activeRate * k.conversion * monthly * 12 * (1 - k.storeCut);
}

const money = (n: number) => `$${formatCount(Math.max(0, Math.round(n)))}`;

function tierLabel(base: number, tiers: { niche: string; small: string; mid: string; large: string; giant: string }): string {
  if (base >= 1e9) return tiers.giant;
  if (base >= 1e8) return tiers.large;
  if (base >= 1e7) return tiers.mid;
  if (base >= 1e6) return tiers.small;
  return tiers.niche;
}

type Row = GenreStat & { revLow: number; revMid: number; revHigh: number; gap: number | null };

type SortKey = "name" | "appCount" | "installBase" | "revMid" | "avgRating" | "leaderShare";

export default function MarketDashboard({
  stats,
  locale,
}: {
  stats: MarketStats;
  locale: Locale;
}) {
  const tr = t(locale).marketDash;
  const [k, setK] = useState<Knobs>(DEFAULTS);
  const [sortKey, setSortKey] = useState<SortKey>("revMid");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      stats.genres.map((g) => {
        const lo = (g.price.low + g.price.high) / 2;
        return {
          ...g,
          revLow: arrFor(g.installBase, g.price.low, k),
          revMid: arrFor(g.installBase, lo, k),
          revHigh: arrFor(g.installBase, g.price.high, k),
          gap: g.avgRating != null ? 5 - g.avgRating : null,
        };
      }),
    [stats.genres, k],
  );

  const totalRev = useMemo(() => rows.reduce((s, r) => s + r.revMid, 0), [rows]);

  const sorted = useMemo(() => {
    const dir = sortAsc ? 1 : -1;
    return [...rows].sort((a, b) => {
      if (sortKey === "name") return dir * a.name.localeCompare(b.name, locale);
      const av = (a[sortKey] as number | null) ?? -1;
      const bv = (b[sortKey] as number | null) ?? -1;
      return dir * (av - bv);
    });
  }, [rows, sortKey, sortAsc, locale]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  };

  return (
    <div className="mx-auto mb-12 flex max-w-5xl flex-col gap-6">
      <Header size="L" as="h2" className="items-center text-center" title={tr.title} description={<span className="mx-auto block max-w-2xl">{tr.subtitle}</span>} />

      <SummaryBand tr={tr} totals={stats.totals} totalRev={totalRev} />

      <Assumptions tr={tr} k={k} setK={setK} />

      <BubbleMap rows={rows} tr={tr} locale={locale} selected={selected} setSelected={setSelected} />

      <GenreTable
        rows={sorted}
        tr={tr}
        locale={locale}
        sortKey={sortKey}
        sortAsc={sortAsc}
        toggleSort={toggleSort}
        selected={selected}
        setSelected={setSelected}
      />
    </div>
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
  totalRev,
}: {
  tr: ReturnType<typeof t>["marketDash"];
  totals: MarketStats["totals"];
  totalRev: number;
}) {
  return (
    <Card className="w-full border-transparent p-4 shadow-none sm:p-6">
      <div className="flex flex-row flex-wrap items-stretch justify-around gap-y-4">
        <Stat value={String(totals.apps)} label={tr.apps} />
        <Stat value={String(totals.genres)} label={tr.genres} />
        <Stat value={`${formatCount(totals.installBase)}+`} label={tr.installBase} />
        <Stat value={formatCount(totals.ratingCount)} label={tr.ratings} />
        <Stat value={`${money(totalRev)}${tr.perYear}`} label={tr.estRevenue} />
      </div>
    </Card>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between text-[14px] text-[var(--color-text-secondary)]">
        <span>{label}</span>
        <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-text-primary)]"
      />
    </label>
  );
}

function Assumptions({
  tr,
  k,
  setK,
}: {
  tr: ReturnType<typeof t>["marketDash"];
  k: Knobs;
  setK: (k: Knobs) => void;
}) {
  return (
    <Card className="w-full gap-4 border-transparent p-4 shadow-none sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <Header size="S" as="h3" title={tr.assumptions} />
        <button
          type="button"
          onClick={() => setK(DEFAULTS)}
          className="text-[14px] text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
        >
          {tr.reset}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Slider label={tr.activeRate} value={k.activeRate} min={0.01} max={0.5} step={0.01} onChange={(v) => setK({ ...k, activeRate: v })} />
        <Slider label={tr.conversion} value={k.conversion} min={0.005} max={0.2} step={0.005} onChange={(v) => setK({ ...k, conversion: v })} />
        <Slider label={tr.storeCut} value={k.storeCut} min={0} max={0.3} step={0.01} onChange={(v) => setK({ ...k, storeCut: v })} />
      </div>
      <p className="text-[13px] leading-[18px] text-[var(--color-text-tertiary)]">{tr.disclaimer}</p>
    </Card>
  );
}

function BubbleMap({
  rows,
  tr,
  locale,
  selected,
  setSelected,
}: {
  rows: Row[];
  tr: ReturnType<typeof t>["marketDash"];
  locale: Locale;
  selected: string | null;
  setSelected: (s: string | null) => void;
}) {
  const W = 820;
  const H = 460;
  const padL = 40;
  const padR = 24;
  const padT = 24;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const pts = rows.filter((r) => r.installBase > 0 && r.gap != null);

  const layout = useMemo(() => {
    if (pts.length === 0) return null;
    const logs = pts.map((r) => Math.log10(r.installBase));
    const minLog = Math.floor(Math.min(...logs));
    const maxLog = Math.ceil(Math.max(...logs));
    const gaps = pts.map((r) => r.gap as number);
    const minGap = Math.max(0, Math.min(...gaps) - 0.1);
    const maxGap = Math.max(...gaps) + 0.1;
    const maxRev = Math.max(...pts.map((r) => r.revMid), 1);

    const x = (base: number) => padL + ((Math.log10(base) - minLog) / (maxLog - minLog || 1)) * plotW;
    const y = (gap: number) => padT + (1 - (gap - minGap) / (maxGap - minGap || 1)) * plotH;
    const r = (rev: number) => 5 + Math.sqrt(rev / maxRev) * 33;

    const gridX: number[] = [];
    for (let p = minLog; p <= maxLog; p++) gridX.push(p);

    return { x, y, r, gridX };
  }, [pts, plotW, plotH]);

  const oppTypes: OpportunityType[] = ["design", "features", "reliability", "pricing", "content", "support"];

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

      {layout && (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={tr.mapTitle}>
          {layout.gridX.map((p) => {
            const gx = layout.x(Math.pow(10, p));
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

          {pts.map((r) => {
            const cx = layout.x(r.installBase);
            const cy = layout.y(r.gap as number);
            const rad = layout.r(r.revMid);
            const active = selected === r.slug;
            return (
              <g key={r.slug} className="cursor-pointer" onClick={() => setSelected(active ? null : r.slug)}>
                <title>
                  {r.name} · {money(r.revMid)}
                  {tr.perYear}
                </title>
                <circle
                  cx={cx}
                  cy={cy}
                  r={rad}
                  fill={oppColor(r.oppType)}
                  fillOpacity={active ? 0.9 : 0.55}
                  stroke={active ? "var(--color-text-primary)" : oppColor(r.oppType)}
                  strokeWidth={active ? 2 : 1}
                />
              </g>
            );
          })}
        </svg>
      )}
      <p className="text-[12px] text-[var(--color-text-tertiary)]">{tr.bubbleHint}</p>
    </Card>
  );
}

function SortHead({
  label,
  active,
  asc,
  onClick,
  align = "right",
}: {
  label: string;
  active: boolean;
  asc: boolean;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th className={align === "left" ? "text-left" : "text-right"}>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 py-2 text-[13px] font-medium ${active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}
      >
        {label}
        <span className="text-[10px]">{active ? (asc ? "▲" : "▼") : ""}</span>
      </button>
    </th>
  );
}

function GenreTable({
  rows,
  tr,
  locale,
  sortKey,
  sortAsc,
  toggleSort,
  selected,
  setSelected,
}: {
  rows: Row[];
  tr: ReturnType<typeof t>["marketDash"];
  locale: Locale;
  sortKey: SortKey;
  sortAsc: boolean;
  toggleSort: (k: SortKey) => void;
  selected: string | null;
  setSelected: (s: string | null) => void;
}) {
  return (
    <Card className="w-full gap-3 border-transparent p-4 shadow-none sm:p-6">
      <Header size="S" as="h3" title={tr.tableTitle} />
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <SortHead label={tr.colGenre} active={sortKey === "name"} asc={sortAsc} onClick={() => toggleSort("name")} align="left" />
              <SortHead label={tr.colApps} active={sortKey === "appCount"} asc={sortAsc} onClick={() => toggleSort("appCount")} />
              <SortHead label={tr.colScale} active={sortKey === "installBase"} asc={sortAsc} onClick={() => toggleSort("installBase")} />
              <SortHead label={tr.colRevenue} active={sortKey === "revMid"} asc={sortAsc} onClick={() => toggleSort("revMid")} />
              <SortHead label={tr.colRating} active={sortKey === "avgRating"} asc={sortAsc} onClick={() => toggleSort("avgRating")} />
              <SortHead label={tr.colLeader} active={sortKey === "leaderShare"} asc={sortAsc} onClick={() => toggleSort("leaderShare")} align="left" />
              <th className="text-left text-[13px] font-medium text-[var(--color-text-secondary)]">{tr.colOpp}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const active = selected === r.slug;
              return (
                <tr
                  key={r.slug}
                  onClick={() => setSelected(active ? null : r.slug)}
                  className={`cursor-pointer border-b border-[var(--color-border)] text-[14px] ${active ? "bg-[var(--color-bg-muted)]" : "hover:bg-[var(--color-bg-muted)]"}`}
                >
                  <td className="py-2.5 pr-2 font-medium text-[var(--color-text-primary)]">{r.name}</td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">{r.appCount}</td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">
                    <span className="text-[var(--color-text-primary)]">{formatCount(r.installBase)}</span>
                    <span className="ml-1.5 text-[12px] text-[var(--color-text-tertiary)]">{tierLabel(r.installBase, tr.tiers)}</span>
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--color-text-primary)]">
                    {money(r.revLow)}–{money(r.revHigh)}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[var(--color-text-secondary)]">{r.avgRating != null ? r.avgRating.toFixed(1) : "—"}</td>
                  <td className="py-2.5 pr-2 text-[var(--color-text-secondary)]">
                    {r.leaderName ? (
                      <span className="flex flex-col">
                        <span className="truncate">{r.leaderName}</span>
                        <span className="text-[12px] text-[var(--color-text-tertiary)]">{tr.leaderShare(Math.round(r.leaderShare * 100))}</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-2.5">
                    {r.oppType ? (
                      <Tag tone="neutral" size="S">
                        <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: oppColor(r.oppType) }} />
                        {opportunityTypeLabelL(locale, r.oppType)}
                      </Tag>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
