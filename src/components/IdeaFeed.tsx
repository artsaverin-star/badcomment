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
const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const yesterdayKey = () => { const d = new Date(); d.setDate(d.getDate() - 1); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };

type Saved = Pick<FeedIdea, "slug" | "category" | "categoryName" | "title" | "oneLiner" | "demand" | "quote">;

export default function IdeaFeed({
  items,
  dailySlug,
  locale = "ru",
  loggedIn,
  deckPrice,
  starsHref,
  starsLabel,
  lifetimeStarsHref,
  lifetimePrice,
}: {
  items: FeedIdea[];
  dailySlug: string | null;
  locale?: Locale;
  loggedIn: boolean;
  deckPrice: number;
  starsHref?: string;
  starsLabel?: string;
  lifetimeStarsHref?: string;
  lifetimePrice?: number;
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
  const [exit, setExit] = useState<"l" | "r" | null>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<number | null>(null);

  const [view, setView] = useState<"feed" | "saved">("feed");
  const [savedList, setSavedList] = useState<Saved[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [streak, setStreak] = useState(0);
  const [auth, setAuth] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [modal, setModal] = useState(false);

  const savedSet = useMemo(() => new Set(savedList.map((s) => s.slug)), [savedList]);
  const total = order.length;
  const cur = order[idx % Math.max(total, 1)];
  const isDaily = cur && cur.slug === dailySlug;

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const s = JSON.parse(localStorage.getItem("feed:saved") || "[]");
        if (Array.isArray(s)) setSavedList(s);
        const sn = JSON.parse(localStorage.getItem("feed:seen") || "[]");
        if (Array.isArray(sn)) setSeen(sn);
        const raw = JSON.parse(localStorage.getItem("feed:streak") || "null");
        const t = todayKey(), y = yesterdayKey();
        let days = 1;
        if (raw && typeof raw.days === "number") {
          if (raw.last === t) days = raw.days;
          else if (raw.last === y) days = raw.days + 1;
        }
        setStreak(days);
        localStorage.setItem("feed:streak", JSON.stringify({ last: t, days }));
      } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Auto-flip each card from its back to the idea shortly after it deals in.
  useEffect(() => {
    const t = window.setTimeout(() => setFlipped(true), 520);
    return () => window.clearTimeout(t);
  }, [cur.slug]);

  function persistSaved(next: Saved[]) {
    setSavedList(next);
    try { localStorage.setItem("feed:saved", JSON.stringify(next.slice(0, 100))); } catch { /* ignore */ }
  }
  function markSeen(slug: string) {
    setSeen((prev) => {
      if (prev.includes(slug)) return prev;
      const next = [...prev, slug];
      try { localStorage.setItem("feed:seen", JSON.stringify(next.slice(-500))); } catch { /* ignore */ }
      return next;
    });
  }
  function toggleSave(it: FeedIdea | Saved) {
    if (savedSet.has(it.slug)) persistSaved(savedList.filter((s) => s.slug !== it.slug));
    else persistSaved([{ slug: it.slug, category: it.category, categoryName: it.categoryName, title: it.title, oneLiner: it.oneLiner, demand: it.demand, quote: it.quote }, ...savedList]);
  }

  function advance(dir: "next" | "prev") {
    if (exit || !cur) return;
    markSeen(cur.slug);
    setExit(dir === "next" ? "l" : "r");
    window.setTimeout(() => {
      setIdx((i) => (dir === "next" ? (i + 1) % total : (i - 1 + total) % total));
      setFlipped(false);
      setModal(false);
      setExit(null);
      setDrag(0);
    }, 280);
  }
  function openDepth() {
    if (cur?.depth) { setModal(true); return; }
    if (!loggedIn) setAuth(true); else setPaywall(true);
  }

  function onDown(e: React.PointerEvent) { if (exit) return; dragStart.current = e.clientX; setDragging(true); }
  function onMove(e: React.PointerEvent) { if (dragStart.current !== null) setDrag(e.clientX - dragStart.current); }
  function onUp() {
    if (dragStart.current === null) return;
    const d = drag;
    dragStart.current = null;
    setDragging(false);
    if (Math.abs(d) < 8) { if (!flipped) setFlipped(true); setDrag(0); return; }
    if (d < -90) { advance("next"); return; }
    if (d > 90) { advance("prev"); return; }
    setDrag(0);
  }

  const cardTransform = exit === "l"
    ? "translateX(-130%) rotate(-14deg)"
    : exit === "r"
      ? "translateX(130%) rotate(14deg)"
      : `translateX(${drag}px) rotate(${drag * 0.02}deg)`;

  if (total === 0) return null;

  return (
    <div className="mx-auto w-full max-w-[440px]">
      {/* top bar */}
      <div className="mb-5 flex items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-tertiary)]">
          <span className="tabular-nums">{ru ? `${seen.length} из ${total}` : `${seen.length} of ${total}`}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[var(--color-text-secondary)]" title={ru ? "Дней подряд" : "Day streak"}>🔥 {streak}</span>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] p-1 text-[12px] font-semibold">
          <button type="button" onClick={() => setView("feed")} className={`rounded-full px-3 py-1 transition-colors ${view === "feed" ? "bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]" : "text-[var(--color-text-tertiary)]"}`}>{ru ? "Лента" : "Feed"}</button>
          <button type="button" onClick={() => setView("saved")} className={`rounded-full px-3 py-1 transition-colors ${view === "saved" ? "bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]" : "text-[var(--color-text-tertiary)]"}`}>{ru ? `Мои · ${savedList.length}` : `Saved · ${savedList.length}`}</button>
        </div>
      </div>

      {view === "saved" ? (
        <SavedView ru={ru} saved={savedList} onOpen={() => setView("feed")} onUnsave={(s) => toggleSave(s)} />
      ) : (
        <>
          {/* the deck card (deal-in on each new card) */}
          <div key={cur.slug} className="card-deal-in [perspective:1300px]">
            <div
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              style={{ transform: cardTransform, opacity: exit ? 0 : 1, transition: exit ? "transform 0.28s ease-in, opacity 0.28s ease-in" : dragging ? "none" : "transform 0.25s ease", touchAction: "pan-y" }}
              className="relative h-[480px] w-full cursor-pointer select-none"
            >
              <div className={`flip3d size-full ${flipped ? "is-up" : ""}`}>
                {/* back — рубашка */}
                <div className="flip-face overflow-hidden rounded-[24px] border border-white/15 p-2 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.85)]" style={{ backgroundImage: "linear-gradient(135deg,#FFA62B 0%,#FF5C8A 35%,#B14DEA 66%,#4CB8F5 100%)" }}>
                  <div className="card-back-pattern flex size-full flex-col items-center justify-center gap-4 rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_82%,transparent)]">
                    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="text-white/85"><path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" /></svg>
                  </div>
                </div>
                {/* front — idea */}
                <div className={`flip-face flip-front flex flex-col rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 shadow-[0_28px_70px_-30px_rgba(0,0,0,0.7)] ${flipped ? "neon-reveal" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="line-clamp-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-tertiary)]">
                      {isDaily && <span className="mr-1.5 rounded-full bg-[var(--color-accent-brand)] px-1.5 py-0.5 text-[10px] text-white">{ru ? "Идея дня" : "Today"}</span>}
                      {cur.categoryName}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold tabular-nums text-[var(--color-text-brand)]"><MessageIcon size={12} /> {cur.demand}</span>
                  </div>

                  <h2 className="mt-3 line-clamp-3 text-[23px] font-black leading-[1.1] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[26px]">{cur.title}</h2>
                  <p className="mt-2.5 line-clamp-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]">{cur.oneLiner}</p>

                  {cur.demand > 0 && (
                    <div className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--color-accent-brand)_12%,transparent)] px-2.5 py-1 text-[12.5px] font-semibold text-[var(--color-text-brand)]">
                      🔥 {ru ? `${cur.demand} ${wordObs(cur.demand)} в отзывах` : `${cur.demand} signals in reviews`}
                    </div>
                  )}

                  {cur.quote && (
                    <div className="mt-4 flex flex-col gap-1">
                      <div className="msg-bubble w-fit max-w-[92%] self-start rounded-[18px] rounded-bl-[6px] bg-[var(--color-bg-muted)] px-3.5 py-2 text-[13.5px] italic leading-[1.45] text-[var(--color-text-primary)] line-clamp-4">{cur.quote.text}</div>
                      <span className="pl-1.5 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{cur.quote.app} · {cur.quote.rating}★</span>
                    </div>
                  )}

                  <button type="button" onClick={(e) => { e.stopPropagation(); openDepth(); }} className="mt-auto w-full rounded-full border border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] px-4 py-3 text-[14px] font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-brand)_14%,transparent)]">
                    {cur.depth ? (ru ? "Раскрыть разбор" : "Open the breakdown") : loggedIn ? (ru ? "🔒 Открыть разбор" : "🔒 Open the breakdown") : (ru ? "Войти и открыть" : "Sign in to open")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* actions: prev / save / next */}
          <div className="mt-7 flex items-center justify-center gap-5">
            <button type="button" onClick={() => advance("prev")} aria-label={ru ? "Назад" : "Previous"} className="flex size-12 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => cur && toggleSave(cur)} aria-label={ru ? "Сохранить" : "Save"} className={`flex size-16 items-center justify-center rounded-full border transition-all active:scale-95 ${savedSet.has(cur.slug) ? "border-transparent bg-[var(--color-accent-brand)] text-white" : "border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill={savedSet.has(cur.slug) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z" strokeLinejoin="round" /></svg>
            </button>
            <button type="button" onClick={() => advance("next")} aria-label={ru ? "Дальше" : "Next"} className="flex size-12 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] text-[var(--color-text-tertiary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <p className="mt-4 text-center text-[12px] text-[var(--color-text-tertiary)]">{ru ? "Свайп влево/вправо — листать идеи" : "Swipe left/right to browse"}</p>
        </>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}

      {/* depth modal */}
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
                    <ul className="mt-3 flex flex-col gap-2.5">
                      {cur.depth.features.map((f, j) => <li key={j} className="flex gap-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]"><span className="select-none text-[var(--color-text-tertiary)]">—</span><span>{f}</span></li>)}
                    </ul>
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

function SavedView({ ru, saved, onOpen, onUnsave }: { ru: boolean; saved: Saved[]; onOpen: () => void; onUnsave: (s: Saved) => void }) {
  if (saved.length === 0) {
    return (
      <div className="rounded-[22px] border border-dashed border-[var(--color-border-subtle)] p-10 text-center">
        <div className="text-[40px]">📌</div>
        <p className="mt-3 text-[15px] text-[var(--color-text-secondary)]">{ru ? "Пока пусто. Листай ленту и сохраняй идеи, в которые стоит вложиться." : "Empty for now. Browse the feed and save ideas worth building."}</p>
        <button type="button" onClick={onOpen} className="mt-5 inline-flex rounded-full bg-[var(--color-button-primary-bg)] px-5 py-2.5 text-[14px] font-semibold text-[var(--color-button-primary-text)]">{ru ? "В ленту" : "To the feed"}</button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {saved.map((s) => (
        <div key={s.slug} className="flex items-start gap-3 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4">
          <Link href={`/segment/${s.category}`} className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">{s.categoryName}</span>
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold tabular-nums text-[var(--color-text-tertiary)]"><MessageIcon size={12} /> {s.demand}</span>
            </div>
            <div className="mt-1.5 text-[16px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)]">{s.title}</div>
            <div className="mt-1 line-clamp-2 text-[13px] leading-[1.45] text-[var(--color-text-secondary)]">{s.oneLiner}</div>
          </Link>
          <button type="button" onClick={() => onUnsave(s)} aria-label={ru ? "Убрать" : "Remove"} className="shrink-0 text-[var(--color-accent-brand)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.5-8.5C1 9 2.5 5.5 6 5.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.5 7C19 16.65 12 21 12 21z" /></svg>
          </button>
        </div>
      ))}
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
