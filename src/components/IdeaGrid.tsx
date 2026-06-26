"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import type { FeedIdea } from "@/lib/ideaFeed";
import type { Locale } from "@/lib/i18n";

function wordObs(n: number) {
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}
const HEART = "M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0Z";

type Saved = Pick<FeedIdea, "slug" | "category" | "categoryName" | "title" | "oneLiner" | "demand" | "quote">;

// Swiss section: tracked label + body.
function Sw({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[18px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{label}</div>
      <p className="mt-3 text-[16.5px] leading-[1.6] text-[var(--color-text-secondary)]">{text}</p>
    </div>
  );
}

// Grid of idea cards (the homepage "Ideas" tab). Same save + breakdown-modal +
// gate behaviour as the swipe feed, but laid out as a grid.
export default function IdeaGrid({
  items, hasAccess, loggedIn, locale = "ru", deckPrice, starsHref, starsLabel, lifetimeStarsHref, lifetimePrice,
}: {
  items: FeedIdea[]; hasAccess: boolean; loggedIn: boolean; locale?: Locale; deckPrice: number;
  starsHref?: string; starsLabel?: string; lifetimeStarsHref?: string; lifetimePrice?: number;
}) {
  const ru = locale !== "en";
  const [savedList, setSavedList] = useState<Saved[]>([]);
  const [modalSlug, setModalSlug] = useState<string | null>(null);
  const [auth, setAuth] = useState(false);
  const savedSet = useMemo(() => new Set(savedList.map((s) => s.slug)), [savedList]);
  const cur = useMemo(() => items.find((i) => i.slug === modalSlug) ?? null, [items, modalSlug]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try { const s = JSON.parse(localStorage.getItem("feed:saved") || "[]"); if (Array.isArray(s)) setSavedList(s); } catch { /* ignore */ }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock background scroll while the modal is open (no body pinning).
  useEffect(() => {
    if (!modalSlug) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, [modalSlug]);

  function persistSaved(next: Saved[]) {
    setSavedList(next);
    try { localStorage.setItem("feed:saved", JSON.stringify(next.slice(0, 100))); } catch { /* ignore */ }
  }
  function toggleSave(it: FeedIdea) {
    if (savedSet.has(it.slug)) { persistSaved(savedList.filter((s) => s.slug !== it.slug)); return; }
    persistSaved([{ slug: it.slug, category: it.category, categoryName: it.categoryName, title: it.title, oneLiner: it.oneLiner, demand: it.demand, quote: it.quote }, ...savedList]);
  }
  // Breakdowns are free to read — clicking any visible card opens it for everyone.
  function open(it: FeedIdea) {
    setModalSlug(it.slug);
  }

  // Gate the grid: guests see 6 previews then a sign-in CTA; logged-in without
  // access see 12 then a buy CTA; with access — everything.
  const limit = hasAccess ? items.length : loggedIn ? 12 : 6;
  const shown = items.slice(0, limit);
  const gate: "auth" | "paywall" | null = hasAccess ? null : loggedIn ? "paywall" : "auth";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((it) => {
          const saved = savedSet.has(it.slug);
          return (
            <div
              key={it.slug}
              role="button"
              tabIndex={0}
              onClick={() => open(it)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(it); } }}
              className="group relative flex cursor-pointer flex-col rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5%,var(--color-surface-card))] sm:p-6"
            >
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSave(it); }}
                aria-label={ru ? "В избранное" : "Save"}
                className={`absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full transition-colors active:scale-90 ${saved ? "bg-[#ff3b5c] text-white" : "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d={HEART} /></svg>
              </button>
              <p className="pr-9 text-[12px] font-medium text-[var(--color-text-brand)]">{it.categoryName}</p>
              <h3 className="mt-2 line-clamp-3 pr-9 text-[17px] font-bold leading-[1.2] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[18px]">{it.title}</h3>
              <p className="mt-2 line-clamp-3 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{it.oneLiner}</p>
              <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                {it.demand > 0 ? (
                  <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{it.demand} {ru ? wordObs(it.demand) : "signals"}</span>
                ) : (
                  <span />
                )}
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-[transform,color] duration-300 group-hover:translate-x-0.5 group-hover:text-[var(--color-text-primary)]"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
          );
        })}
      </div>

      {gate === "auth" && (
        <div className="mx-auto mt-6 flex max-w-[520px] flex-col items-center gap-3 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center sm:mt-8">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Войди и смотри все идеи" : "Sign in to see every idea"}</div>
          <p className="max-w-[44ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{ru ? "Это первые 6. За входом ждут ещё десятки идей под спрос по разным темам, и каждую неделю добавляются новые. Вход бесплатный, пара секунд." : "These are the first 6. Sign in for dozens more demand-backed ideas across topics, with new ones added every week. It's free and takes seconds."}</p>
          <button type="button" onClick={() => setAuth(true)} className="mt-1 rounded-full bg-[var(--color-button-primary-bg)] px-7 py-3 text-[15px] font-semibold text-[var(--color-button-primary-text)] transition-opacity hover:opacity-90">{ru ? "Войти" : "Sign in"}</button>
        </div>
      )}
      {gate === "paywall" && (
        <div className="mx-auto mt-6 flex max-w-[520px] flex-col items-center gap-4 rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 text-center sm:mt-8">
          <div className="text-[19px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Открой все идеи" : "Unlock all ideas"}</div>
          <p className="max-w-[44ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">{ru ? "Это первые 12. Внутри все 98 идей под подтверждённый спрос по разным темам, и каждую неделю добавляются новые. Доступ навсегда." : "These are the first 12. Inside: all 98 demand-backed ideas across topics, with new ones added every week. Access forever."}</p>
          <BuyButton kind="deck" price={deckPrice} label={ru ? `Открыть колоду — ${deckPrice} ₽` : `Unlock the deck — ${deckPrice} ₽`} loggedIn={loggedIn} locale={locale} title={ru ? "Колода идей" : "Idea deck"} subtitle={ru ? "Доступ к разделу идей под подтверждённый спрос." : "Access to all ideas, backed by real demand."} starsHref={starsHref} starsLabel={starsLabel} lifetimePrice={lifetimePrice} lifetimeStarsHref={lifetimeStarsHref} />
        </div>
      )}

      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}

      {modalSlug && cur?.depth && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setModalSlug(null)} className="absolute inset-0 bg-black/55 backdrop-blur-md" />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-20px_70px_-20px_rgba(0,0,0,0.7)] sm:rounded-[24px]">
            <button type="button" onClick={() => setModalSlug(null)} className="absolute right-4 top-4 z-10 flex size-9 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            </button>
            <div className="overflow-y-auto overscroll-contain px-7 py-10 sm:px-12 sm:py-12">
              <div className="text-[11px] font-semibold tracking-[0.02em] text-[var(--color-text-tertiary)]">{cur.categoryName}</div>
              <h2 className="mt-4 max-w-[18ch] text-[30px] font-bold leading-[1.06] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[38px]">{cur.title}</h2>
              <p className="mt-5 max-w-[42ch] text-[18px] leading-[1.5] text-[var(--color-text-secondary)] sm:text-[20px]">{cur.oneLiner}</p>
              <div className="mt-5 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{cur.demand} {ru ? wordObs(cur.demand) : "signals"} {ru ? "в отзывах" : "in reviews"}</div>

              <div className="mt-11 flex flex-col gap-10">
                {cur.depth.gap && <Sw label={ru ? "Почему это шанс" : "The opening"} text={cur.depth.gap} />}
                {cur.depth.pitch && <Sw label={ru ? "Что строить" : "What to build"} text={cur.depth.pitch} />}
                {cur.depth.features.length > 0 && (
                  <div>
                    <div className="text-[18px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Что входит" : "Features"}</div>
                    <ul className="mt-4 flex flex-col">
                      {cur.depth.features.map((f, j) => (
                        <li key={j} className="border-t border-[var(--color-border-subtle)] py-3 text-[16px] leading-[1.5] text-[var(--color-text-secondary)] first:border-t-0 first:pt-0">{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {cur.depth.monetization && <Sw label={ru ? "Монетизация" : "How it earns"} text={cur.depth.monetization} />}
                {cur.depth.quotes.length > 0 && (
                  <div className="flex flex-col gap-6">
                    {cur.depth.quotes.map((q, j) => (
                      <figure key={j} className="border-l-2 border-[var(--color-border-strong)] pl-5">
                        <blockquote className="text-[16px] leading-[1.55] text-[var(--color-text-primary)]">{q.text}</blockquote>
                        <figcaption className="mt-2 text-[11px] tracking-[0.02em] text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-12 border-t border-[var(--color-border-subtle)] pt-6">
                <Link href={`/segment/${cur.category}`} className="text-[15px] font-medium text-[var(--color-text-primary)] underline-offset-4 hover:underline">{ru ? `Весь разбор ниши «${cur.categoryName}»` : `Full niche breakdown "${cur.categoryName}"`} →</Link>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
