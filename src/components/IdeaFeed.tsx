"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import MessageIcon from "./MessageIcon";
import type { FeedIdea } from "@/lib/ideaFeed";
import type { Locale } from "@/lib/i18n";

function wordObs(n: number) {
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

type Saved = Pick<FeedIdea, "slug" | "category" | "categoryName" | "title" | "oneLiner" | "demand" | "quote">;
const HEART = "M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z";
const SLOT = 320; // px per card slot on the carousel track
const SIDE_FADE = "linear-gradient(to right, transparent, #000 6%, #000 94%, transparent)";

export default function IdeaFeed({
  items, dailySlug, locale = "ru", loggedIn, deckPrice, starsHref, starsLabel, lifetimeStarsHref, lifetimePrice,
}: {
  items: FeedIdea[]; dailySlug: string | null; locale?: Locale; loggedIn: boolean; deckPrice: number;
  starsHref?: string; starsLabel?: string; lifetimeStarsHref?: string; lifetimePrice?: number;
}) {
  const ru = locale !== "en";

  const order = useMemo(() => {
    if (!dailySlug) return items;
    const i = items.findIndex((x) => x.slug === dailySlug);
    if (i <= 0) return items;
    return [items[i], ...items.slice(0, i), ...items.slice(i + 1)];
  }, [items, dailySlug]);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  const [savedList, setSavedList] = useState<Saved[]>([]);
  const [auth, setAuth] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [modal, setModal] = useState(false);
  const [loveTick, setLoveTick] = useState(0);

  const savedSet = useMemo(() => new Set(savedList.map((s) => s.slug)), [savedList]);
  const total = order.length;
  const cur = order[idx];
  const isSaved = cur && savedSet.has(cur.slug);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const s = JSON.parse(localStorage.getItem("feed:saved") || "[]"); if (Array.isArray(s)) setSavedList(s); } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // New centred card flips to its face shortly after it settles (go() resets it
  // to рубашка first).
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), 380);
    return () => window.clearTimeout(t);
  }, [idx]);

  function persistSaved(nextList: Saved[]) {
    setSavedList(nextList);
    try { localStorage.setItem("feed:saved", JSON.stringify(nextList.slice(0, 100))); } catch { /* ignore */ }
  }
  function saveCurrent() {
    if (!cur) return;
    if (savedSet.has(cur.slug)) { persistSaved(savedList.filter((s) => s.slug !== cur.slug)); return; }
    persistSaved([{ slug: cur.slug, category: cur.category, categoryName: cur.categoryName, title: cur.title, oneLiner: cur.oneLiner, demand: cur.demand, quote: cur.quote }, ...savedList]);
    setLoveTick((t) => t + 1);
  }

  function go(dir: "next" | "prev") {
    setModal(false);
    setDragX(0);
    setFlipped(false); // new card arrives рубашкой, effect flips it to face
    setIdx((i) => (dir === "next" ? Math.min(i + 1, total - 1) : Math.max(i - 1, 0)));
  }
  function openDepth() {
    if (cur?.depth) { setModal(true); return; }
    if (!loggedIn) setAuth(true); else setPaywall(true);
  }

  function onDown(e: React.PointerEvent) { dragStart.current = e.clientX; setDragging(true); }
  function onMove(e: React.PointerEvent) { if (dragStart.current !== null) setDrag(e.clientX - dragStart.current); }
  function setDrag(v: number) { setDragX(v); }
  function onUp() {
    if (dragStart.current === null) return;
    const d = dragX; dragStart.current = null; setDragging(false);
    if (d < -60) { go("next"); return; }
    if (d > 60) { go("prev"); return; }
    setDragX(0);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go("prev");
      else if (e.key === "ArrowRight") go("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, total]);

  if (total === 0) return null;

  // Window of cards around the current one (rendered on the moving track).
  const from = Math.max(0, idx - 4);
  const to = Math.min(total - 1, idx + 4);
  const win: number[] = [];
  for (let i = from; i <= to; i++) win.push(i);
  const transition = dragging ? "none" : "transform 0.42s cubic-bezier(0.22,0.61,0.36,1)";

  return (
    <div className="mx-auto w-full max-w-[480px] sm:max-w-[700px]">
      <div className="relative">
        {/* desktop arrows */}
        <button type="button" onClick={() => go("prev")} aria-label={ru ? "Назад" : "Previous"} disabled={idx === 0} className="absolute left-0 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-30 sm:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" onClick={() => go("next")} aria-label={ru ? "Дальше" : "Next"} disabled={idx === total - 1} className="absolute right-0 top-1/2 z-30 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-30 sm:flex">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        {/* carousel viewport — masked edges, cards slide horizontally */}
        <div
          className="relative h-[clamp(380px,56vh,470px)] w-full select-none"
          style={{ WebkitMaskImage: SIDE_FADE, maskImage: SIDE_FADE, WebkitMaskSize: "100% 220%", maskSize: "100% 220%", WebkitMaskPosition: "center", maskPosition: "center", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", touchAction: "pan-y" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {win.map((i) => {
            const off = (i - idx) * SLOT + dragX;
            const center = i === idx;
            return (
              <div
                key={order[i].slug}
                className="absolute left-1/2 top-1/2 w-[296px]"
                style={{ transform: `translate(-50%, -50%) translateX(${off}px)`, transition }}
              >
                {center ? (
                  <div className="relative h-[clamp(380px,56vh,470px)] [perspective:1300px]">
                    <div className={`flip3d size-full ${flipped ? "is-up" : ""}`}>
                      <Ruba />
                      <div className={`flip-face flip-front flex flex-col rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.7)] ${flipped ? "neon-reveal" : ""}`}>
                        {loveTick > 0 && <span key={loveTick} aria-hidden className="love-glow pointer-events-none absolute inset-0 z-10 rounded-[24px]" />}
                        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); saveCurrent(); }} aria-label={ru ? "В избранное" : "Save"} className={`absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full transition-all active:scale-90 ${isSaved ? "bg-[#ff3b5c] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}>
                          <svg width="17" height="17" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d={HEART} /></svg>
                        </button>
                        <h2 className="pr-10 text-[23px] font-bold leading-[1.14] tracking-[-0.02em] text-[var(--color-text-primary)] line-clamp-4 sm:text-[25px]">{cur.title}</h2>
                        <p className="mt-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)] line-clamp-6">{cur.oneLiner}</p>
                        <div className="mt-auto pt-5">
                          {cur.demand > 0 && (
                            <div className="mb-4 text-[13px] font-medium text-[var(--color-text-tertiary)]"><span className="text-[var(--color-text-brand)]">{cur.demand}</span> {ru ? `${wordObs(cur.demand)} в отзывах` : "signals in reviews"}</div>
                          )}
                          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); openDepth(); }} className="w-full rounded-full bg-[var(--color-button-primary-bg)] px-4 py-3.5 text-[15px] font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">
                            {cur.depth ? (ru ? "Раскрыть разбор" : "Open the breakdown") : loggedIn ? (ru ? "Открыть разбор" : "Open the breakdown") : (ru ? "Войти и открыть" : "Sign in to open")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[clamp(345px,51vh,430px)] overflow-hidden rounded-[24px] border border-white/15 p-2 opacity-85 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.85)]" style={{ backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)" }}>
                    <div className="card-back-pattern flex size-full items-center justify-center rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)]">
                      <svg width="42" height="42" viewBox="0 0 24 24" fill="none" className="text-white/80"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /></svg>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-6 text-center text-[12px] text-[var(--color-text-tertiary)]"><span className="tabular-nums">{idx + 1}</span> {ru ? "из" : "of"} {total}</p>

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}

      {modal && cur?.depth && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setModal(false)} className="absolute inset-0 bg-black/55 backdrop-blur-md" />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-20px_70px_-20px_rgba(0,0,0,0.7)] sm:rounded-[28px]">
            <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5">
              <Link href={`/segment/${cur.category}`} className="text-[13px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">{cur.categoryName}</Link>
              <button type="button" onClick={() => setModal(false)} className="-mr-1 flex size-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-6 py-7 sm:px-8">
              <div className="flex items-center gap-2 text-[13px] font-semibold tabular-nums text-[var(--color-text-brand)]"><MessageIcon size={14} /> {cur.demand} <span className="font-normal text-[var(--color-text-tertiary)]">{ru ? wordObs(cur.demand) : "signals"}</span></div>
              <h2 className="mt-3 text-[26px] font-black leading-[1.1] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[30px]">{cur.title}</h2>
              <p className="mt-3 text-[17px] font-light leading-[1.45] text-[var(--color-text-secondary)] sm:text-[19px]">{cur.oneLiner}</p>
              <div className="mt-7 flex flex-col gap-6">
                {cur.depth.gap && <Section label={ru ? "Почему это шанс" : "Why it's an opening"} text={cur.depth.gap} strong />}
                {cur.depth.pitch && <Section label={ru ? "Что строить" : "What to build"} text={cur.depth.pitch} />}
                {cur.depth.features.length > 0 && (
                  <div>
                    <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Что входит" : "Features"}</div>
                    <ul className="mt-3 flex flex-col gap-2.5">{cur.depth.features.map((f, j) => <li key={j} className="flex gap-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]"><span className="select-none text-[var(--color-text-tertiary)]">—</span><span>{f}</span></li>)}</ul>
                  </div>
                )}
                {cur.depth.monetization && <Section label={ru ? "Монетизация" : "Monetize"} text={cur.depth.monetization} />}
                {cur.depth.quotes.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Из отзывов" : "From reviews"}</div>
                    {cur.depth.quotes.map((q, j) => (
                      <div key={j} className="flex flex-col gap-1">
                        <div className="msg-bubble w-fit max-w-[92%] self-start rounded-[18px] rounded-bl-[6px] bg-[var(--color-bg-muted)] px-3.5 py-2 text-[13.5px] italic leading-[1.45] text-[var(--color-text-primary)]">{q.text}</div>
                        <span className="pl-1.5 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href={`/segment/${cur.category}`} className="flex items-center justify-center rounded-[14px] border border-[var(--color-border-subtle)] px-4 py-3.5 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]">{ru ? `Вся ниша «${cur.categoryName}»` : `Full niche "${cur.categoryName}"`}</Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {paywall && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => setPaywall(false)}>
          <div className="flex w-full max-w-[440px] flex-col items-center gap-4 rounded-t-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-7 text-center sm:rounded-[24px]" onClick={(e) => e.stopPropagation()}>
            <div className="text-[20px] font-black tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Открой все разборы идей" : "Unlock every idea"}</div>
            <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{ru ? "Колода открывает разбор каждой идеи: почему это шанс, что строить, фичи и монетизация — навсегда." : "The deck opens every idea's breakdown — the gap, what to build, features and monetization — forever."}</p>
            <BuyButton kind="deck" price={deckPrice} label={ru ? `Открыть колоду — ${deckPrice} ₽` : `Unlock the deck — ${deckPrice} ₽`} loggedIn={loggedIn} locale={locale} title={ru ? "Колода идей" : "Idea deck"} subtitle={ru ? "Разбор каждой идеи под подтверждённый спрос — навсегда." : "Every idea's full breakdown, backed by real demand — forever."} starsHref={starsHref} starsLabel={starsLabel} lifetimePrice={lifetimePrice} lifetimeStarsHref={lifetimeStarsHref} />
            <button type="button" onClick={() => setPaywall(false)} className="text-[13px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]">{ru ? "Позже" : "Later"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Ruba() {
  return (
    <div className="flip-face overflow-hidden rounded-[24px] border border-white/15 p-2 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.85)]" style={{ backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)" }}>
      <div className="card-back-pattern flex size-full items-center justify-center rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)]">
        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" className="text-white/85"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
}

function Section({ label, text, strong }: { label: string; text: string; strong?: boolean }) {
  return (
    <div className={strong ? "border-l-2 border-[var(--color-border-strong)] pl-4" : undefined}>
      <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{label}</div>
      <p className={`mt-2 text-[15px] leading-[1.6] ${strong ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}>{text}</p>
    </div>
  );
}
