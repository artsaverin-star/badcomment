"use client";

import { useState } from "react";

// The honest-rating list with a toggle between our review-sentiment score and
// the App Store star. Flipping re-sorts the list; each row shows both numbers
// in one meta line, with the store star coloured by authenticity (честная /
// сомнительная / накрученная) — so the gap between the gamed star and the real
// score is visible. That gap is the whole point of the block.

export type RatingApp = {
  id: string; title: string; icon: string | null;
  realScore: number | null; storeAvg: number | null; ratings: number;
  authenticity: string | null; verdict: string; loved: string; weak: string; whoFor: string | null;
};

const AUTH: Record<string, { w: string; c: string }> = {
  "Подлинный": { w: "честная", c: "#30d158" },
  "Сомнительный": { w: "сомнительная", c: "#e0b400" },
  "Накручен": { w: "накрученная", c: "#ff6961" },
};

const NF = (n: number) => n.toLocaleString("ru-RU");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function Pill({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full px-2 py-[1.5px] text-[11px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      {children}
    </span>
  );
}

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
      <div className="mt-6 flex justify-center">
        <div className="inline-flex rounded-full border border-[var(--color-border-subtle)] p-0.5">
          <Tab active={mode === "sentiment"} onClick={() => setMode("sentiment")}>По отзывам</Tab>
          <Tab active={mode === "store"} onClick={() => setMode("store")}>В сторах</Tab>
        </div>
      </div>

      <div className="mt-6 border-t border-[var(--color-border-subtle)]">
        {shown.map((a, i) => {
          const au = AUTH[a.authenticity || ""] || { w: "", c: "var(--color-text-tertiary)" };
          const sentiment = mode === "sentiment";
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
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] leading-[1.4] text-[var(--color-text-tertiary)]">
                    <span className={sentiment ? "" : "font-semibold text-[var(--color-text-primary)]"}>в сторе {a.storeAvg?.toFixed(1)}★</span>
                    {au.w && <Pill color={au.c}>{cap(au.w)}</Pill>}
                    <span>· {NF(a.ratings || 0)} оценок ·</span>
                    <span className={sentiment ? "font-semibold text-[var(--color-text-primary)]" : ""}>Наш балл {a.realScore}/100</span>
                  </span>
                </span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </summary>
              <div className="pb-6 pl-9 pr-1 sm:pr-8">
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
      className={`rounded-full px-5 py-1.5 text-[13px] transition-colors ${active ? "bg-[var(--color-text-primary)] font-medium text-[var(--color-bg-page)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
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
