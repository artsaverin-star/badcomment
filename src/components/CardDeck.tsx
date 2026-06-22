"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import BoltIcon from "./BoltIcon";
import PeopleIcon from "./PeopleIcon";
import type { Locale } from "@/lib/i18n";

type Card = {
  slug: string;
  title: string;
  oneLiner: string;
  gap: string;
  pitch: string;
  features: string[];
  monetization: string;
  demand: number;
  category: string;
  categoryName: string;
};

function wordObs(n: number) {
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

// The face-down deck shown before / between draws — a small fan of card backs.
function DeckBacks() {
  return (
    <div className="relative mx-auto h-[180px] w-[140px]" aria-hidden>
      {[-14, -7, 0].map((rot, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center rounded-[16px] border border-[var(--color-border-subtle)] shadow-[0_18px_44px_-26px_rgba(0,0,0,0.8)]"
          style={{
            transform: `rotate(${rot}deg) translateY(${i * -2}px)`,
            transformOrigin: "bottom center",
            backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)",
          }}
        >
          <div className="flex size-full items-center justify-center rounded-[15px] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)]">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-[var(--color-text-tertiary)]">
              <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CardDeck({
  locale,
  loggedIn,
  balance: balance0,
  unlimited,
  drawCost,
}: {
  locale: Locale;
  loggedIn: boolean;
  balance: number;
  unlimited: boolean;
  drawCost: number;
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [balance, setBalance] = useState(balance0);
  const [cards, setCards] = useState<Card[]>([]);
  const [err, setErr] = useState<null | "funds" | "error">(null);
  const [done, setDone] = useState(false);

  async function draw() {
    if (!loggedIn) {
      setAuth(true);
      return;
    }
    if (drawing || done) return;
    setErr(null);
    setDrawing(true);
    try {
      const res = await fetch("/api/draw", { method: "POST" });
      if (res.status === 401) {
        setAuth(true);
        return;
      }
      if (res.status === 402) {
        setErr("funds");
        return;
      }
      const data = await res.json();
      if (data.done) {
        setDone(true);
        return;
      }
      if (data.ok) {
        setCards((c) => [data.card as Card, ...c]);
        if (typeof data.balance === "number") setBalance(data.balance);
      } else {
        setErr("error");
      }
    } catch {
      setErr("error");
    } finally {
      setDrawing(false);
    }
  }

  const drawn = cards.length;
  const btnLabel = drawing
    ? ru ? "Тянем…" : "Drawing…"
    : drawn === 0
      ? ru ? "Тяни карту" : "Draw a card"
      : ru ? "Тяни ещё" : "Draw again";

  return (
    <div className="mt-14 flex flex-col items-center">
      {drawn === 0 && <DeckBacks />}

      <button
        type="button"
        onClick={draw}
        disabled={drawing || done}
        className="btn-shimmer mt-9 inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[17px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99] disabled:opacity-70"
      >
        {btnLabel}
      </button>

      <div className="mt-3.5 text-[13px] text-[var(--color-text-tertiary)]">
        {done
          ? ru ? "🎉 Ты открыл все идеи в колоде" : "🎉 You've drawn the whole deck"
          : unlimited
            ? ru ? "У тебя полный доступ — тяни сколько хочешь" : "Full access — draw freely"
            : !loggedIn
              ? ru ? "Войди — первая карта бесплатно" : "Sign in — first card is free"
              : (
                <span className="inline-flex items-center gap-1.5">
                  {ru ? "Первая бесплатно, далее" : "First free, then"} {drawCost}
                  <BoltIcon size={12} className="text-[var(--color-text-brand)]" />
                  {ru ? " · баланс" : " · balance"}
                  <BoltIcon size={12} className="text-[var(--color-text-brand)]" />
                  <span className="font-semibold tabular-nums text-[var(--color-text-secondary)]">{balance}</span>
                </span>
              )}
      </div>

      {err === "funds" && (
        <p className="mt-4 text-center text-[14px] text-[var(--color-text-secondary)]">
          {ru ? "Не хватает энергии. " : "Not enough energy. "}
          <Link href="/tokens" className="font-semibold text-[var(--color-text-brand)] underline-offset-2 hover:underline">{ru ? "Пополнить" : "Top up"}</Link>
        </p>
      )}
      {err === "error" && <p className="mt-4 text-center text-[14px] text-[var(--color-text-secondary)]">{ru ? "Что-то пошло не так, попробуй ещё раз." : "Something went wrong, try again."}</p>}

      {/* the collection — newest first, the latest one flips in */}
      {drawn > 0 && (
        <div className="mt-12 flex w-full flex-col gap-4">
          {cards.map((c, i) => (
            <article
              key={c.slug}
              className={`rounded-[22px] border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_82%,transparent)] p-6 backdrop-blur-xl sm:p-7 ${i === 0 ? "card-reveal" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <Link href={`/segment/${c.category}`} className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
                  {c.categoryName}
                </Link>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold tabular-nums text-[var(--color-text-tertiary)]" title={`${c.demand} ${wordObs(c.demand)}`}>
                  <PeopleIcon size={13} /> {c.demand}
                </span>
              </div>
              <h3 className="mt-3 text-[24px] font-black leading-[1.1] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[27px]">{c.title}</h3>
              <p className="mt-2.5 text-[16px] leading-[1.5] text-[var(--color-text-secondary)]">{c.oneLiner}</p>

              <details open={i === 0} className="group/d mt-5 border-t border-[var(--color-border-subtle)] pt-4">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[13px] font-semibold text-[var(--color-text-brand)] [&::-webkit-details-marker]:hidden">
                  {ru ? "Полный разбор" : "Full breakdown"}
                  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden className="transition-transform duration-300 group-open/d:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </summary>
                <div className="mt-4 flex flex-col gap-5">
                  {c.gap && (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{ru ? "Почему это шанс" : "Why it's an opening"}</div>
                      <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-primary)]">{c.gap}</p>
                    </div>
                  )}
                  {c.pitch && (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</div>
                      <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{c.pitch}</p>
                    </div>
                  )}
                  {c.features.length > 0 && (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{ru ? "Что входит" : "Features"}</div>
                      <ul className="mt-2.5 flex flex-col gap-2">
                        {c.features.map((f, j) => (
                          <li key={j} className="flex gap-2.5 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]">
                            <span className="select-none text-[var(--color-text-tertiary)]">—</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {c.monetization && (
                    <div>
                      <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">{ru ? "Монетизация" : "Monetize"}</div>
                      <p className="mt-2 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{c.monetization}</p>
                    </div>
                  )}
                  <Link href={`/segment/${c.category}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text-brand)]">
                    {ru ? `Вся ниша «${c.categoryName}»` : `Full niche "${c.categoryName}"`} →
                  </Link>
                </div>
              </details>
            </article>
          ))}
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => { setAuth(false); void draw(); }} />}
    </div>
  );
}
