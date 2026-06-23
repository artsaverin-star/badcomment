"use client";

import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import MessageIcon from "./MessageIcon";
import { LIFETIME } from "@/lib/tokenConfig";
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

type Slot = { key: string; card: Card | null; loading: boolean };

const HAND = 2;
const TILT = [-4, 4];

function wordObs(n: number) {
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}
// Short headline for the small face-up card — the product name before the dash/colon.
function shortName(title: string) {
  const t = (title || "").trim();
  if (t.length <= 22) return t;
  return (t.split(/\s—\s|:\s/)[0].trim() || t).slice(0, 26);
}

// Neon confetti salute fired from the revealed card.
async function fireNeon(rect?: DOMRect) {
  const confetti = (await import("canvas-confetti")).default;
  const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.5;
  const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.42;
  const NEON = ["#00E5FF", "#FF2EF7", "#7C4DFF", "#39FF14", "#FFE600"];
  confetti({ particleCount: 55, spread: 95, startVelocity: 40, origin: { x, y }, colors: NEON, ticks: 110, scalar: 0.9, gravity: 0.9, disableForReducedMotion: true });
  confetti({ particleCount: 22, spread: 130, startVelocity: 26, origin: { x, y }, colors: NEON, ticks: 150, scalar: 1.35, shapes: ["star"], gravity: 0.7, disableForReducedMotion: true });
}

export default function CardDeck({
  locale,
  loggedIn,
  unlimited,
  deckPrice,
  deckCount,
  starsHref,
  starsLabel,
  initialCollection = [],
  guestUsed: guestUsed0 = 0,
  guestCap = 2,
}: {
  locale: Locale;
  loggedIn: boolean;
  unlimited: boolean;
  deckPrice: number;
  deckCount: number;
  starsHref?: string;
  starsLabel?: string;
  initialCollection?: Card[];
  guestUsed?: number;
  guestCap?: number;
}) {
  const ru = locale !== "en";
  const [auth, setAuth] = useState(false);
  const [round, setRound] = useState(0);
  const [hand, setHand] = useState<Slot[]>([]);
  const [err, setErr] = useState<null | "error">(null);
  const [done, setDone] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [guestUsed, setGuestUsed] = useState(guestUsed0);
  const [seen, setSeen] = useState<string[]>(initialCollection.map((c) => c.slug));
  const [collection, setCollection] = useState<Card[]>(initialCollection);

  const [modal, setModal] = useState<Card | null>(null);

  // Persist drawn cards locally so they survive a reload — notably the full-page
  // redirect during sign-in (anon cards no longer vanish after registering).
  const STORE_KEY = "inapp_cards";
  useEffect(() => {
    // Deferred so we don't setState synchronously inside the effect body.
    const t = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        const saved = raw ? (JSON.parse(raw) as Card[]) : [];
        if (!Array.isArray(saved) || saved.length === 0) return;
        setCollection((cur) => {
          const have = new Set(cur.map((c) => c.slug));
          return [...cur, ...saved.filter((c) => c?.slug && !have.has(c.slug))];
        });
        setSeen((cur) => [...new Set([...cur, ...(saved.map((c) => c?.slug).filter(Boolean) as string[])])]);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(collection.slice(0, 60)));
    } catch {
      /* ignore */
    }
  }, [collection]);

  const guestBlocked = !loggedIn && guestUsed >= guestCap;

  function deal() {
    if (guestBlocked) {
      setAuth(true); // guest used their free cards — ask to sign in
      return;
    }
    setErr(null);
    const r = round + 1;
    setRound(r);
    setHand(Array.from({ length: HAND }, (_, i) => ({ key: `${r}-${i}`, card: null, loading: false })));
  }

  async function flip(i: number, el?: HTMLElement) {
    const slot = hand[i];
    if (!slot) return;
    if (slot.card) {
      setModal(slot.card); // already open → show full breakdown
      return;
    }
    if (slot.loading) return;
    if (guestBlocked) {
      setAuth(true);
      return;
    }
    setErr(null);
    setHand((h) => h.map((s, j) => (j === i ? { ...s, loading: true } : s)));
    try {
      const res = await fetch("/api/draw", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ exclude: seen }),
      });
      if (res.status === 401) return setAuth(true);
      const data = await res.json();
      if (data.needAuth) return setAuth(true);
      if (data.paywall) {
        setPaywall(true);
        return;
      }
      if (data.done) {
        setDone(true);
        return;
      }
      if (data.ok) {
        const card = data.card as Card;
        setHand((h) => h.map((s, j) => (j === i ? { ...s, card } : s)));
        setSeen((sl) => [...sl, card.slug]);
        setCollection((c) => [card, ...c]);
        if (typeof data.guestUsed === "number") setGuestUsed(data.guestUsed);
        void fireNeon(el?.getBoundingClientRect());
      } else setErr("error");
    } catch {
      setErr("error");
    } finally {
      setHand((h) => h.map((s, j) => (j === i ? { ...s, loading: false } : s)));
    }
  }

  const dealt = hand.length > 0;
  const allFlipped = dealt && hand.every((s) => s.card);

  return (
    <div className="mt-12 flex flex-col items-center">
      {/* ── the hand ── */}
      {dealt && !paywall && (
        <div className="flex items-center justify-center gap-1.5 sm:gap-3">
          {hand.map((s, i) => (
            <Fragment key={s.key}>
              {i > 0 && (
                <span className="shrink-0 text-[var(--color-text-tertiary)] opacity-60" aria-hidden>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.6 6.4L16 8l-6.4 1.6L8 16l-1.6-6.4L0 8l6.4-1.6z" /></svg>
                </span>
              )}
              <button
                type="button"
                onClick={(e) => flip(i, e.currentTarget)}
                style={{ ["--tilt"]: `${TILT[i] ?? 0}deg`, animationDelay: `${i * 90}ms` } as React.CSSProperties}
                className="card-deal-in group relative aspect-[5/7] w-[clamp(98px,29vw,184px)] shrink-0 [perspective:1100px]"
                aria-label={s.card ? s.card.title : ru ? "Перевернуть карту" : "Flip card"}
              >
                <div className={`flip3d size-full ${s.card ? "is-up" : ""}`}>
                {/* back */}
                <div className="flip-face flex items-center justify-center rounded-[16px] border border-white/15 p-1.5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)]" style={{ backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)" }}>
                  <div className="card-back-pattern flex size-full items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)]">
                    {s.loading ? (
                      <span className="text-[12px] font-medium text-white/70">…</span>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="text-white/80"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" /></svg>
                    )}
                  </div>
                </div>
                {/* front (idea) */}
                <div className="flip-face flip-front flex flex-col rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3 text-left shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)] sm:p-4">
                  {s.card && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums text-[var(--color-text-brand)]"><MessageIcon size={11} /> {s.card.demand}</span>
                      </div>
                      <div className="mt-1 line-clamp-2 text-[10px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-tertiary)]">{s.card.categoryName}</div>
                      <div className="mt-auto text-[16px] font-black leading-[1.12] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[19px]">{shortName(s.card.title)}</div>
                      <div className="mt-2.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-brand)]">{ru ? "Тап — разбор" : "Tap — open"}</div>
                    </>
                  )}
                </div>
              </div>
              </button>
            </Fragment>
          ))}
        </div>
      )}

      {/* ── controls ── */}
      {!paywall && (!dealt ? (
        <button type="button" onClick={deal} className="btn-shimmer inline-flex items-center gap-2.5 rounded-full px-9 py-4 text-[17px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
          🎴 {ru ? "Раздать 2 карты" : "Deal 2 cards"}
        </button>
      ) : (
        <button
          type="button"
          onClick={deal}
          disabled={done}
          className="mt-9 inline-flex items-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-card)] px-7 py-3.5 text-[15px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-tertiary)] disabled:opacity-60"
        >
          {ru ? "Раздать ещё 2" : "Deal 2 more"} {allFlipped ? "" : "🔀"}
        </button>
      ))}

      {!paywall && (
        <div className="mt-3.5 text-center text-[13px] text-[var(--color-text-tertiary)]">
          {done ? (
            ru ? "🎉 Ты открыл все идеи в колоде" : "🎉 You've drawn the whole deck"
          ) : unlimited ? (
            ru ? "У тебя полный доступ — открывай сколько хочешь" : "Full access — open freely"
          ) : !loggedIn ? (
            ru ? `Первые ${guestCap} карты бесплатно — дальше вход` : `First ${guestCap} cards free — then sign in`
          ) : (
            ru ? "Открывай карты — потом вся колода целиком" : "Reveal cards — then unlock the whole deck"
          )}
        </div>
      )}

      {paywall && (
        <div className="w-full max-w-[420px]">
          <div className="card-deal-in flex flex-col items-center gap-1 rounded-[24px] border-2 border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,var(--color-surface-card))] p-7 text-center shadow-[0_24px_60px_-24px_rgba(0,0,0,0.6)]">
            <div className="text-[34px] leading-none" aria-hidden>🃏</div>
            <div className="mt-1 text-[20px] font-black tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Колода идей" : "Idea deck"}</div>
            <p className="mx-auto mb-5 mt-1.5 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? `Открой всю колоду — ${deckCount} карт с идеями, лучшее из каждой ниши, по реальным отзывам. Навсегда.`
                : `Unlock the whole deck — ${deckCount} idea cards, the best of every niche, from real reviews. Forever.`}
            </p>
            <BuyButton
              kind="deck"
              price={deckPrice}
              label={ru ? `Открыть колоду — ${deckPrice} ₽` : `Unlock deck — ${deckPrice} ₽`}
              loggedIn={loggedIn}
              locale={locale}
              title={ru ? "Колода идей" : "Idea deck"}
              subtitle={ru ? `${deckCount} карт с идеями — лучшее из каждой ниши, навсегда.` : `${deckCount} idea cards — the best of every niche, forever.`}
              starsHref={starsHref}
              starsLabel={starsLabel}
              lifetimePrice={LIFETIME.rub}
            />
          </div>
        </div>
      )}
      {err === "error" && <p className="mt-4 text-center text-[14px] text-[var(--color-text-secondary)]">{ru ? "Что-то пошло не так, попробуй ещё раз." : "Something went wrong, try again."}</p>}

      {/* ── opened cards collect below, landing-style ── */}
      {collection.length > 0 && (
        <div className="mt-16 w-full border-t border-[var(--color-border-subtle)] pt-12">
          <div className="text-center text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">
            {ru ? `Твои идеи · ${collection.length}` : `Your ideas · ${collection.length}`}
          </div>
          <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {collection.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setModal(c)}
                className="deck-card group flex flex-col items-start rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] sm:p-6"
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="line-clamp-1 text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">{c.categoryName}</span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold tabular-nums text-[var(--color-text-tertiary)]"><MessageIcon size={13} /> {c.demand}</span>
                </div>
                <span className="mt-3 block text-[19px] font-bold leading-[1.18] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[20px]">{c.title}</span>
                <span className="mt-2 line-clamp-2 block text-[14px] leading-[1.5] text-[var(--color-text-secondary)] sm:text-[15px]">{c.oneLiner}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--color-text-brand)]">{ru ? "Разобрать" : "Open"} →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => setAuth(false)} />}

      {/* ── full-breakdown modal ── */}
      {modal &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
            <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setModal(null)} className="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-md" />
            <div className="modal-panel relative z-10 flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-20px_70px_-20px_rgba(0,0,0,0.7)] sm:rounded-[28px]">
              <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5">
                <Link href={`/segment/${modal.category}`} className="text-[13px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">{modal.categoryName}</Link>
                <button type="button" onClick={() => setModal(null)} className="-mr-1 flex size-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto overscroll-contain px-6 py-7 sm:px-8">
                <div className="flex items-center gap-2 text-[13px] font-semibold tabular-nums text-[var(--color-text-brand)]"><MessageIcon size={14} /> {modal.demand} <span className="font-normal text-[var(--color-text-tertiary)]">{wordObs(modal.demand)}</span></div>
                <h2 className="mt-3 text-[28px] font-black leading-[1.1] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[32px]">{modal.title}</h2>
                <p className="mt-3 text-[18px] font-light leading-[1.45] text-[var(--color-text-secondary)] sm:text-[20px]">{modal.oneLiner}</p>
                {(modal.gap || modal.pitch || modal.features.length || modal.monetization) ? (
                  <div className="mt-7 flex flex-col gap-6">
                    {modal.gap && <Section label={ru ? "Почему это шанс" : "Why it's an opening"} text={modal.gap} strong />}
                    {modal.pitch && <Section label={ru ? "Что строить" : "What to build"} text={modal.pitch} />}
                    {modal.features.length > 0 && (
                      <div>
                        <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Что входит" : "Features"}</div>
                        <ul className="mt-3 flex flex-col gap-2.5">
                          {modal.features.map((f, j) => (
                            <li key={j} className="flex gap-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]"><span className="select-none text-[var(--color-text-tertiary)]">—</span><span>{f}</span></li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {modal.monetization && <Section label={ru ? "Монетизация" : "Monetize"} text={modal.monetization} />}
                    <Link href={`/segment/${modal.category}`} className="inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--color-text-brand)]">{ru ? `Вся ниша «${modal.categoryName}»` : `Full niche "${modal.categoryName}"`} →</Link>
                  </div>
                ) : (
                  <div className="mt-7 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 text-center">
                    <p className="text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{ru ? "Полный разбор — почему это шанс, что строить, фичи и монетизация — открывается после входа." : "The full breakdown — the gap, what to build, features and monetization — opens after sign-in."}</p>
                    <button type="button" onClick={() => { setModal(null); setAuth(true); }} className="btn-shimmer mt-5 inline-flex items-center rounded-full px-7 py-3 text-[15px] font-semibold text-white">
                      {ru ? "Войти и открыть" : "Sign in to unlock"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

function Section({ label, text, strong }: { label: string; text: string; strong?: boolean }) {
  return (
    <div className={strong ? "border-l border-[var(--color-border-strong)] pl-5" : undefined}>
      <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{label}</div>
      <p className={`mt-2.5 text-[16px] leading-[1.65] ${strong ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>{text}</p>
    </div>
  );
}
