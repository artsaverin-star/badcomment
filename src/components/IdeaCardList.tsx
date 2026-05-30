import Link from "next/link";
import type { IdeaCard } from "@/lib/queries";
import { t, lovedLabelL, type Locale } from "@/lib/i18n";

const STORE_LABEL: Record<string, string> = { google: "Google Play", apple: "App Store" };
const CLONE_STYLE: Record<string, string> = {
  Low: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  Medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  High: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};
const CLONE_LABEL: Record<Locale, Record<string, string>> = {
  en: { Low: "Low", Medium: "Medium", High: "High" },
  ru: { Low: "Низкая", Medium: "Средняя", High: "Высокая" },
};

function StarBars({ histogram }: { histogram: Record<string, number> }) {
  const total = ["1", "2", "3", "4", "5"].reduce((s, k) => s + (histogram[k] ?? 0), 0);
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {["5", "4", "3", "2", "1"].map((star) => {
        const pct = Math.round(((histogram[star] ?? 0) / total) * 100);
        const good = star === "5" || star === "4";
        return (
          <div key={star} className="flex items-center gap-2 text-[11px] text-neutral-500">
            <span className="w-3 tabular-nums">{star}★</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <div
                className={`h-full ${good ? "bg-green-500" : "bg-red-400"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

// One aligned label→value row for the muted "supporting detail" block at the
// bottom of each card. Keeps secondary facts tidy instead of stacked color blocks.
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 py-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-neutral-600 dark:text-neutral-300">{children}</dd>
    </div>
  );
}

export default function IdeaCardList({
  cards,
  locale,
}: {
  cards: IdeaCard[];
  locale: Locale;
}) {
  const tr = t(locale);
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => {
        const s = card.summary;
        const hasDetails =
          (s?.monetization ?? null) !== null ||
          card.pros.length > 0 ||
          card.proQuote ||
          card.histogram != null ||
          card.cloneReasons.length > 0;
        return (
          <li
            key={card.id}
            className="flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-900"
          >
            {/* ── Identity ───────────────────────────────── */}
            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-start gap-3">
                {card.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.icon} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-black/10 dark:bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-lg font-bold">{card.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${CLONE_STYLE[card.cloneLabel]}`}
                      title={tr.card.toRebuild}
                    >
                      {CLONE_LABEL[locale][card.cloneLabel]}
                    </span>
                  </div>
                  {s?.tagline && (
                    <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
                      {s.tagline}
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-neutral-400">
                    {card.categoryLabel} · {card.demandLabel}
                    {card.avgRating != null && <> · {card.avgRating.toFixed(1)}★</>}
                    {" · "}
                    {tr.card.complaints(card.negativeCount)}
                    {" · "}
                    {card.stores.map((st) => STORE_LABEL[st]).join(", ")}
                  </p>
                </div>
              </div>

              {/* Verdict + opportunity: light left accent, not a heavy box */}
              {s?.verdict && (
                <div className="border-l-2 border-red-400 pl-3">
                  <p className="text-sm font-semibold">{s.verdict}</p>
                  {s.opportunity && (
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      {s.opportunity}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── What's broken (the core insight) ─────────── */}
            {s && s.gaps.length > 0 && (
              <div className="px-5 pb-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                  {tr.card.gaps}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {s.gaps.map((gap) => (
                    <li
                      key={gap.title}
                      className="rounded-xl border border-black/5 bg-black/[0.02] p-3 dark:border-white/10 dark:bg-white/[0.03]"
                    >
                      <p className="text-sm font-semibold">{gap.title}</p>
                      {gap.evidence && (
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
                          {gap.evidence}
                        </p>
                      )}
                      {gap.quote && (
                        <p className="mt-1 text-sm italic text-neutral-500">“{gap.quote}”</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── How to win ───────────────────────────────── */}
            {s && s.wedge.length > 0 && (
              <div className="px-5 pb-4">
                <div className="rounded-xl bg-green-50 p-3 dark:bg-green-950/30">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                    {tr.card.howToBeat}
                  </p>
                  <ul className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-200">
                    {s.wedge.map((move) => (
                      <li key={move} className="flex gap-1.5">
                        <span className="shrink-0 text-green-600">→</span>
                        <span>{move}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* ── Can't clone warning (only when relevant) ──── */}
            {s && s.cloneable === false && s.buildNote && (
              <div className="px-5 pb-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {tr.card.cantClone}
                  </p>
                  <p className="mt-0.5 text-neutral-600 dark:text-neutral-300">{s.buildNote}</p>
                </div>
              </div>
            )}

            {/* ── Supporting detail (muted, aligned) ───────── */}
            {hasDetails && (
              <dl className="mt-auto divide-y divide-black/5 border-t border-black/5 bg-black/[0.015] px-5 dark:divide-white/5 dark:border-white/5 dark:bg-white/[0.02]">
                {(card.pros.length > 0 || card.proQuote) && (
                  <DetailRow label={tr.card.love}>
                    {card.pros.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {card.pros.map((p) => (
                          <span
                            key={p.key}
                            className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-300"
                          >
                            {lovedLabelL(locale, p.key)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>{tr.card.provenDemand(card.demandLabel)}</span>
                    )}
                    {card.proQuote && (
                      <p className="mt-1 text-sm italic text-neutral-500">“{card.proQuote}”</p>
                    )}
                  </DetailRow>
                )}

                {s?.monetization && (
                  <DetailRow label={tr.card.monetization}>{s.monetization}</DetailRow>
                )}

                {card.cloneReasons.length > 0 && (
                  <DetailRow label={tr.card.howHard}>
                    <ul className="flex flex-col gap-0.5">
                      {card.cloneReasons.map((r) => (
                        <li key={r} className="flex gap-1.5">
                          <span className="shrink-0 text-neutral-400">·</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </DetailRow>
                )}

                {card.histogram && (
                  <DetailRow label={tr.card.ratingSpread}>
                    <StarBars histogram={card.histogram} />
                  </DetailRow>
                )}
              </dl>
            )}

            <div className={`px-5 py-3 ${hasDetails ? "" : "mt-auto"}`}>
              <Link
                href={`/product/${card.id}`}
                className="text-sm text-neutral-400 hover:text-red-600 hover:underline"
              >
                {tr.nav.seeAllReviews}
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
