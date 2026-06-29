"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

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
const AUTH_EN: Record<string, { w: string; c: string }> = {
  "Подлинный": { w: "genuine", c: "#30d158" },
  "Сомнительный": { w: "doubtful", c: "#e0b400" },
  "Накручен": { w: "inflated", c: "#ff6961" },
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const ICONS: Record<string, React.ReactNode> = {
  star: <path d="M6 1.3l1.45 2.94 3.25.47-2.35 2.29.55 3.24L6 8.71 3.1 10.23l.55-3.24L1.3 4.7l3.25-.47L6 1.3z" />,
  bars: <path d="M2.5 10V6.5M6 10V2.5M9.5 10V7.5" />,
  spark: <path d="M6 1.6l1.1 2.9 2.9 1.1-2.9 1.1L6 9.6 4.9 6.7 2 5.6l2.9-1.1L6 1.6z" />,
  seal: <><circle cx="6" cy="6" r="4.4" /><path d="M4.2 6l1.25 1.25L7.9 4.6" /></>,
};

function ChipIcon({ name }: { name: string }) {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">{ICONS[name]}</svg>
  );
}

function MetricChip({ icon, value, label, active }: { icon: string; value: string; label: string; active?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-muted)] px-2.5 py-1 text-caption ${active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>
      <ChipIcon name={icon} />
      <span className={active ? "font-semibold" : "font-medium"}>{value}</span>
      <span className="opacity-70">{label}</span>
    </span>
  );
}

function AuthChip({ color, word }: { color: string; word: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      <ChipIcon name="seal" />{word}
    </span>
  );
}

export default function RatingToggleList({ apps, limit = 8, more, moreHref, locale = "ru" }: { apps: RatingApp[]; limit?: number; more?: string; moreHref?: string; locale?: Locale }) {
  const ru = locale !== "en";
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const auth = ru ? AUTH : AUTH_EN;
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
          <Tab active={mode === "sentiment"} onClick={() => setMode("sentiment")}>{ru ? "По отзывам" : "By reviews"}</Tab>
          <Tab active={mode === "store"} onClick={() => setMode("store")}>{ru ? "В сторах" : "In stores"}</Tab>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        {shown.map((a, i) => {
          const au = auth[a.authenticity || ""] || { w: "", c: "var(--color-text-tertiary)" };
          const sentiment = mode === "sentiment";
          return (
            <details key={a.id} className="group/f rounded-[16px] border border-[var(--color-border-subtle)] px-4">
              <summary className="flex cursor-pointer list-none flex-col gap-3 py-4 [&::-webkit-details-marker]:hidden">
                <span className="flex w-full items-start gap-3">
                  {a.icon
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[12px] object-cover" />
                    : <span className="size-11 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-[var(--color-text-primary)]">{a.title}</span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5">
                      <MetricChip icon="star" value={a.storeAvg?.toFixed(1) ?? "—"} label={ru ? "В сторе" : "In store"} active={!sentiment} />
                      {au.w && <AuthChip color={au.c} word={cap(au.w)} />}
                      <MetricChip icon="bars" value={nf(a.ratings || 0)} label={ru ? "Оценок" : "Ratings"} />
                      <MetricChip icon="spark" value={`${a.realScore}/100`} label={ru ? "Наш балл" : "Our score"} active={sentiment} />
                    </span>
                  </span>
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {a.verdict && <span className="block text-footnote text-[var(--color-text-secondary)]">{a.verdict}</span>}
              </summary>
              <div className="flex flex-col gap-3.5 border-t border-[var(--color-border-subtle)] pb-5 pt-4">
                <Field k={ru ? "Сильное" : "Strong"} v={a.loved} />
                <Field k={ru ? "Слабое" : "Weak"} v={a.weak} />
                <Field k={ru ? "Кому" : "For whom"} v={a.whoFor} />
              </div>
            </details>
          );
        })}
      </div>
      {more && (
        <div className="mt-4 text-callout">
          <span className="text-[var(--color-text-tertiary)]">{more} </span>
          {moreHref
            ? <a href={moreHref} className="font-medium text-[var(--color-text-primary)] underline-offset-2 hover:underline">{ru ? "весь рейтинг" : "full rating"}</a>
            : <span className="font-medium text-[var(--color-text-primary)]">{ru ? "весь рейтинг" : "full rating"}</span>}
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
      className={`rounded-full px-5 py-1.5 text-footnote transition-colors ${active ? "bg-[var(--color-text-primary)] font-medium text-[var(--color-bg-page)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}`}
    >
      {children}
    </button>
  );
}

function Field({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div>
      <div className="text-footnote font-semibold text-[var(--color-text-primary)]">{k}</div>
      <p className="mt-1 text-callout text-[var(--color-text-secondary)]">{v}</p>
    </div>
  );
}
