import Link from "next/link";
import type { IdeaCard } from "@/lib/queries";
import { t, themeLabelL, lovedLabelL, type Locale } from "@/lib/i18n";

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
      {cards.map((card) => (
        <li
          key={card.id}
          className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-neutral-900"
        >
          <div className="flex items-center gap-3">
            {card.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={card.icon} alt="" className="h-14 w-14 rounded-xl" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-black/10 dark:bg-white/10" />
            )}
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">{card.name}</p>
              <p className="truncate text-sm text-neutral-500">
                {card.demandLabel}
                {card.avgRating != null && (
                  <> · {card.avgRating.toFixed(1)}★</>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium ${CLONE_STYLE[card.cloneLabel]}`}>
              {CLONE_LABEL[locale][card.cloneLabel]} · {tr.card.toRebuild}
            </span>
            {card.stores.map((s) => (
              <span key={s} className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
                {STORE_LABEL[s]}
              </span>
            ))}
            <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
              {tr.card.complaints(card.negativeCount)}
            </span>
          </div>

          {card.summary?.verdict && (
            <div className="rounded-xl border border-red-200 bg-red-50/60 p-3 dark:border-red-900 dark:bg-red-950/30">
              <p className="text-sm font-medium">{card.summary.verdict}</p>
              {card.summary.whyClone && (
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
                  {card.summary.whyClone}
                </p>
              )}
            </div>
          )}

          {card.histogram && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {tr.card.ratingSpread}
              </p>
              <StarBars histogram={card.histogram} />
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">
              {tr.card.love}
            </p>
            {card.pros.length > 0 ? (
              <div className="mb-1 flex flex-wrap gap-1">
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
              <p className="text-sm text-neutral-600 dark:text-neutral-300">
                {tr.card.provenDemand(card.demandLabel)}
              </p>
            )}
            {card.proQuote && (
              <p className="mt-1 text-sm italic text-neutral-500">“{card.proQuote}”</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-600">
              {tr.card.improve}
            </p>
            <div className="mb-1 flex flex-wrap gap-1">
              {card.cons.map((c) => (
                <span
                  key={c.key}
                  className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  {themeLabelL(locale, c.key)} · {c.count}
                </span>
              ))}
            </div>
            {card.conQuote && (
              <p className="mt-1 text-sm italic text-neutral-500">“{card.conQuote}”</p>
            )}
          </div>

          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              {tr.card.howHard}
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-neutral-600 dark:text-neutral-300">
              {card.cloneReasons.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <span className="text-neutral-400">·</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>

          {card.summary && card.summary.howToWin.length > 0 && (
            <div className="rounded-xl bg-green-50 p-3 dark:bg-green-950/30">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
                {tr.card.howToBeat}
              </p>
              <ul className="flex flex-col gap-1 text-sm text-neutral-700 dark:text-neutral-200">
                {card.summary.howToWin.map((move) => (
                  <li key={move} className="flex gap-1.5">
                    <span className="text-green-600">→</span>
                    <span>{move}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link
            href={`/product/${card.id}`}
            className="mt-auto text-sm text-neutral-400 hover:text-red-600 hover:underline"
          >
            {tr.nav.seeAllReviews}
          </Link>
        </li>
      ))}
    </ul>
  );
}
