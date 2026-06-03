"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, Header, Tag, buttonVariants, cn } from "@saverin/ui-web";
import { formatCount } from "@/lib/format";
import { t, opportunityTypeLabelL, type Locale } from "@/lib/i18n";
import type { GenreStat, GenreMember } from "@/lib/marketStats";
import type { OpportunityType } from "@/lib/summarize";

const OPP_COLORS: Record<OpportunityType, string> = {
  design: "#6366f1",
  features: "#0ea5e9",
  reliability: "#ef4444",
  pricing: "#f59e0b",
  content: "#10b981",
  support: "#8b5cf6",
};

type SortKey = "scale" | "gap" | "open" | "build";

function tierLabel(base: number, tiers: ReturnType<typeof t>["marketDash"]["tiers"]): string {
  if (base >= 1e9) return tiers.giant;
  if (base >= 1e8) return tiers.large;
  if (base >= 1e7) return tiers.mid;
  if (base >= 1e6) return tiers.small;
  return tiers.niche;
}

export default function MarketGenres({
  genres,
  locale,
}: {
  genres: GenreStat[];
  locale: Locale;
}) {
  const tr = t(locale).marketDash;
  const trm = t(locale).market;
  const [sort, setSort] = useState<SortKey>("scale");

  const sorted = useMemo(() => {
    const g = [...genres];
    const gap = (x: GenreStat) => (x.avgRating == null ? -1 : 5 - x.avgRating);
    if (sort === "scale") g.sort((a, b) => b.installBase - a.installBase);
    else if (sort === "gap") g.sort((a, b) => gap(b) - gap(a));
    else if (sort === "open") g.sort((a, b) => a.leaderShare - b.leaderShare);
    else g.sort((a, b) => (b.buildability ?? 0) - (a.buildability ?? 0));
    return g;
  }, [genres, sort]);

  const sorts: { key: SortKey; label: string }[] = [
    { key: "scale", label: tr.sortScale },
    { key: "gap", label: tr.sortGap },
    { key: "open", label: tr.sortOpen },
    { key: "build", label: tr.sortBuild },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-[14px] text-[var(--color-text-secondary)]">{tr.sortBy}:</span>
        {sorts.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[14px] transition-colors",
              sort === s.key
                ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {sorted.map((g) => (
        <GenreCard key={g.slug} g={g} tr={tr} trm={trm} locale={locale} />
      ))}
    </div>
  );
}

function Dots({ value }: { value: number }) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="size-2 rounded-full"
          style={{ background: i <= filled ? "var(--color-text-primary)" : "var(--color-bg-muted)" }}
        />
      ))}
    </span>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</span>
      <div className="flex flex-col items-start gap-1">{children}</div>
    </div>
  );
}

function OppChip({ type, locale }: { type: OpportunityType; locale: Locale }) {
  return (
    <Tag tone="neutral" size="S">
      <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: OPP_COLORS[type] }} />
      {opportunityTypeLabelL(locale, type)}
    </Tag>
  );
}

// One competitor in the genre, read from honest store numbers only: real
// installs when known, ★ rating with review volume (flagged when low = a big
// hated app worth attacking), a leader badge, and the kind of opening (oppType).
// No "market share" — our app set is a curated subset. Tap through to the card.
function MemberRow({
  m,
  tr,
  locale,
}: {
  m: GenreMember;
  tr: ReturnType<typeof t>["marketDash"];
  locale: Locale;
}) {
  const lowRating = m.avgRating != null && m.avgRating < 4.0;
  return (
    <Link
      href={`/product/${m.id}`}
      className="flex items-start gap-3 rounded-[var(--radius-md)] px-2 py-2.5 hover:bg-[var(--color-bg-muted)]"
    >
      {m.icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={m.icon} alt="" className="mt-0.5 size-9 shrink-0 rounded-[var(--radius-md)] object-cover" />
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[14px] text-[var(--color-text-primary)]">{m.name}</span>
          {m.isLeader && (
            <Tag tone="brand" size="S">
              {tr.leader}
            </Tag>
          )}
        </span>
        {m.tagline && <span className="truncate text-[12px] text-[var(--color-text-tertiary)]">{m.tagline}</span>}
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[var(--color-text-tertiary)]">
          {m.installs != null && <span className="tabular-nums">{tr.mInstalls(formatCount(m.installs))}</span>}
          {m.avgRating != null && (
            <span
              className="tabular-nums"
              style={lowRating ? { color: "var(--color-accent-warning)" } : undefined}
            >
              ★ {m.avgRating.toFixed(1)}
              {m.ratingCount ? ` · ${tr.mRatings(formatCount(m.ratingCount))}` : ""}
            </span>
          )}
        </span>
      </span>
      {m.oppType && <OppChip type={m.oppType} locale={locale} />}
    </Link>
  );
}

function GenreCard({
  g,
  tr,
  trm,
  locale,
}: {
  g: GenreStat;
  tr: ReturnType<typeof t>["marketDash"];
  trm: ReturnType<typeof t>["market"];
  locale: Locale;
}) {
  const leaderPct = Math.round(g.leaderShare * 100);
  const conc =
    g.leaderShare >= 0.6
      ? { label: tr.concCrowded, tone: "warning" as const }
      : g.leaderShare >= 0.35
        ? { label: tr.concSome, tone: "neutral" as const }
        : { label: tr.concFragmented, tone: "info" as const };

  return (
    <Card id={`seg-${g.slug}`} className="w-full scroll-mt-24 gap-4 border-transparent p-4 shadow-none sm:p-6">
      <div className="flex items-center gap-3">
        {g.icons.length > 0 && (
          <div className="flex -space-x-2">
            {g.icons.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                alt=""
                className="size-8 rounded-[var(--radius-md)] object-cover ring-2 ring-[var(--color-surface-card)]"
              />
            ))}
          </div>
        )}
        <Header size="M" as="h2" title={g.name} />
      </div>

      {/* The five launch questions, at a glance. */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-5">
        <Cell label={tr.qMarket}>
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">{formatCount(g.installBase)}+</span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">
            {formatCount(g.ratingCount)} · {tierLabel(g.installBase, tr.tiers)}
          </span>
        </Cell>

        <Cell label={tr.qCompetition}>
          <span className="text-[14px] text-[var(--color-text-primary)]">{tr.players(g.appCount)}</span>
          <Tag tone={conc.tone} size="S">
            {conc.label}
          </Tag>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">{tr.leaderPct(leaderPct)}</span>
        </Cell>

        <Cell label={tr.qGap}>
          {g.oppType ? <OppChip type={g.oppType} locale={locale} /> : <span className="text-[var(--color-text-tertiary)]">{tr.noData}</span>}
        </Cell>

        <Cell label={tr.qBuild}>
          {g.buildability != null ? (
            <>
              <Dots value={g.buildability} />
              <span className="text-[12px] text-[var(--color-text-tertiary)]">{tr.buildOf5(g.buildability.toFixed(1))}</span>
            </>
          ) : (
            <span className="text-[var(--color-text-tertiary)]">{tr.noData}</span>
          )}
        </Cell>

        <Cell label={tr.qMoney}>
          <span className="text-[15px] font-semibold text-[var(--color-text-primary)]">
            ${g.price.low}–{g.price.high}
          </span>
          <span className="text-[12px] text-[var(--color-text-tertiary)]">{tr.perMonth}</span>
        </Cell>
      </div>

      {g.problems[0] && (
        <p className="text-[15px] leading-[20px] text-[var(--color-text-secondary)]">{g.problems[0]}</p>
      )}

      {/* Level 2: the full authored brief + mined gaps/wedge + apps. */}
      <details className="group flex flex-col gap-4">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
          <svg viewBox="0 0 16 16" className="size-4 transition-transform group-open:rotate-90" fill="none" aria-hidden="true">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tr.details}
        </summary>

        <div className="mt-4 flex flex-col gap-5">
          <Section title={trm.pricing}>
            <p className={PROSE}>{g.pricing}</p>
          </Section>
          <Section title={trm.audience}>
            <p className={PROSE}>{g.audience}</p>
          </Section>
          <Section title={trm.problems}>
            <ul className="flex flex-col gap-2">
              {g.problems.map((p) => (
                <Bullet key={p}>{p}</Bullet>
              ))}
            </ul>
          </Section>

          {g.gapTitles.length > 0 && (
            <Section title={tr.whatHated}>
              <ul className="flex flex-col gap-2">
                {g.gapTitles.map((t) => (
                  <Bullet key={t}>{t}</Bullet>
                ))}
              </ul>
            </Section>
          )}

          {g.wedge.length > 0 && (
            <Section title={tr.howToWin}>
              <ul className="flex flex-col gap-2">
                {g.wedge.map((w) => (
                  <Bullet key={w} accent>
                    {w}
                  </Bullet>
                ))}
              </ul>
            </Section>
          )}

          {/* Level 3: the apps themselves — tap through to the full idea card. */}
          <details className="group/apps flex flex-col gap-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[14px] font-medium text-[var(--color-text-secondary)] [&::-webkit-details-marker]:hidden">
              <svg viewBox="0 0 16 16" className="size-3.5 transition-transform group-open/apps:rotate-90" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {tr.appsInGenre(g.appCount)}
            </summary>
            <div className="mt-3 flex flex-col">
              {g.members.map((m) => (
                <MemberRow key={m.id} m={m} tr={tr} locale={locale} />
              ))}
            </div>
          </details>

          <Link
            href={`/?seg=${g.slug}`}
            className={cn(buttonVariants({ variant: "primary", size: "M" }), "h-10 w-full text-[16px] sm:h-12")}
          >
            {trm.viewApps}
          </Link>
        </div>
      </details>
    </Card>
  );
}

const PROSE = "[font-family:var(--brand-font-family)] text-[15px] leading-[21px] text-[var(--color-text-secondary)]";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <Header size="S" as="h3" title={title} />
      {children}
    </section>
  );
}

function Bullet({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-[15px] leading-[21px] text-[var(--color-text-secondary)]">
      <span
        className="mt-[7px] inline-block size-1.5 shrink-0 rounded-full"
        style={{ background: accent ? "var(--color-accent-brand)" : "var(--color-text-tertiary)" }}
      />
      <span>{children}</span>
    </li>
  );
}
