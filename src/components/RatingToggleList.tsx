"use client";

import { useState } from "react";

// The honest-rating list with a toggle between our review-sentiment score and
// the App Store star. Flipping it re-sorts the list AND shows both numbers per
// row, so the gap between the gamed store star and the real score is visible —
// that gap is the whole point of the block.

export type RatingApp = {
  id: string; title: string; icon: string | null;
  realScore: number | null; storeAvg: number | null; ratings: number;
  authenticity: string | null; verdict: string; loved: string; weak: string; whoFor: string | null;
};

const AUTH: Record<string, { w: string; c: string }> = {
  "Подлинный": { w: "честная звезда", c: "#30d158" },
  "Сомнительный": { w: "сомнительная звезда", c: "#e0b400" },
  "Накручен": { w: "накрученная звезда", c: "#ff6961" },
};

const NF = (n: number) => n.toLocaleString("ru-RU");

export default function RatingToggleList({ apps, limit = 8, more, moreHref }: { apps: RatingApp[]; limit?: number; more?: string; moreHref?: string }) {
  const [mode, setMode] = useState<"sentiment" | "store">("sentiment");
  const sorted = [...apps].sort((a, b) =>
    mode === "sentiment"
      ? (b.realScore || 0) - (a.realScore || 0)
      : (b.storeAvg || 0) - (a.storeAvg || 0) || (b.ratings || 0) - (a.ratings || 0),
  );
  const shown = sorted.slice(0, limit);

  return (
    <div>
      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex w-fit rounded-full border border-[var(--color-border-subtle)] p-0.5">
          <Tab active={mode === "sentiment"} onClick={() => setMode("sentiment")}>По отзывам</Tab>
          <Tab active={mode === "store"} onClick={() => setMode("store")}>В сторах</Tab>
        </div>
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          {mode === "sentiment" ? "Балл 0–100 по сентименту отзывов" : "Звезда в App Store — её и накручивают"}
        </p>
      </div>

      <div className="mt-5 border-t border-[var(--color-border-subtle)]">
        {shown.map((a, i) => {
          const au = AUTH[a.authenticity || ""] || { w: "", c: "var(--color-text-tertiary)" };
          const bigVal = mode === "sentiment" ? `${a.realScore ?? "—"}` : `${a.storeAvg?.toFixed(1) ?? "—"}★`;
          const smallVal = mode === "sentiment" ? `${a.storeAvg?.toFixed(1) ?? "—"}★ в сторе` : `${a.realScore ?? "—"} по отзывам`;
          return (
            <details key={a.id} className="group/f border-b border-[var(--color-border-subtle)]">
              <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
                <span className="w-5 shrink-0 pt-2.5 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[12px] object-cover" />
                  : <span className="size-11 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />}
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium leading-[1.3] text-[var(--color-text-primary)]">{a.title}</span>
                  {a.verdict && <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.45] text-[var(--color-text-tertiary)]">{a.verdict}</span>}
                  {au.w && <span className="mt-1 block text-[11px]" style={{ color: au.c }}>{au.w}</span>}
                </span>
                <span className="shrink-0 pt-1 text-right">
                  <span className="block text-[19px] font-bold tabular-nums leading-none text-[var(--color-text-primary)]">{bigVal}</span>
                  <span className="mt-1 block text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{smallVal}</span>
                </span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div className="pb-6 pr-1 sm:pr-8">
                <div className="text-[12px] text-[var(--color-text-tertiary)]">в сторе {a.storeAvg?.toFixed(1)}★ · {NF(a.ratings || 0)} оценок · наш балл {a.realScore}/100</div>
                <Field k="Сильное" v={a.loved} />
                <Field k="Слабое" v={a.weak} />
                <Field k="Кому" v={a.whoFor} />
              </div>
            </details>
          );
        })}
      </div>
      {more && (
        <div className="mt-4 text-[14px]">
          <span className="text-[var(--color-text-tertiary)]">{more} — </span>
          {moreHref
            ? <a href={moreHref} className="font-medium text-[var(--color-text-primary)] underline-offset-2 hover:underline">весь рейтинг</a>
            : <span className="font-medium text-[var(--color-text-primary)]">весь рейтинг</span>}
        </div>
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[13px] transition-colors ${active ? "bg-[var(--color-text-primary)] font-medium text-[var(--color-bg-page)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
    >
      {children}
    </button>
  );
}

function Field({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]"><span className="font-medium text-[var(--color-text-primary)]">{k}. </span>{v}</p>
  );
}
