"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import BuyButton from "./BuyButton";
import type { Locale } from "@/lib/i18n";

// Playing-card style decks for the /test prototype: portrait cards with a
// centered SF-style line icon, title and short description. Tapping a card
// opens a popup (portalled to body) with the full detail. Used for audience
// personas and for ideas.

type Persona = { name: string; job: string; payLevel: string; payNote: string; gap: string; servedBy: string[] };
type Score = { money: number; simplicity: number; demand: number; composite: number; whyPay?: string; pricePoint?: string };
type Idea = { slug?: string; title: string; oneLiner: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string; reviewGrid?: { quote: string; rating: number; app: string; quoteRu?: string }[]; icon: string; hue?: number; cover?: string; score?: Score; category?: string; categorySlug?: string; locked?: boolean; rank?: number };

// Bookmark toggle on an idea card: pops on tap and persists to localStorage
// (favIdeas, keyed by idea slug). State lives in localStorage and reaches
// React through useSyncExternalStore — server renders "not saved", the client
// snapshot takes over after hydration, and every card stays in sync.
const favListeners = new Set<() => void>();
function favRead(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]).includes(id); } catch { return false; }
}
export function favSubscribe(cb: () => void) {
  favListeners.add(cb);
  return () => { favListeners.delete(cb); };
}
// Current saved-slug list as a stable JSON string (for useSyncExternalStore).
export function favSnapshot(): string {
  try { return localStorage.getItem("favIdeas") || "[]"; } catch { return "[]"; }
}
function favFlip(id: string) {
  let on = false;
  try {
    const cur = new Set<string>(JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]);
    if (cur.has(id)) cur.delete(id); else { cur.add(id); on = true; }
    localStorage.setItem("favIdeas", JSON.stringify([...cur]));
  } catch {}
  favListeners.forEach((l) => l());
  // Mirror to the server (durable, cross-device). No-op for guests server-side.
  fetch("/api/favorites", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: id, on }), keepalive: true,
  }).catch(() => {});
}

// Sync favorites with the server on load. The SERVER is the source of truth for
// a signed-in user, so deletes on any device stick: localStorage becomes a
// mirror (replaced on every load), never a union. The very first sync after
// signing in pushes the guest's localStorage bookmarks up once (so nothing saved
// before logging in is lost); after that we just pull and replace.
export async function favSyncWithServer() {
  let local: string[] = [];
  try { local = JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]; } catch {}
  const migrated = (() => { try { return localStorage.getItem("favMigrated") === "1"; } catch { return false; } })();
  try {
    let slugs: string[] | null = null;
    if (!migrated && local.length) {
      // One-time: merge guest bookmarks into the account, take the union back.
      const res = await fetch("/api/favorites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: local }),
      });
      if (res.ok) { const d = await res.json(); if (Array.isArray(d.slugs)) slugs = d.slugs; }
    } else {
      // Server is truth: pull and replace (applies deletes from other devices).
      const res = await fetch("/api/favorites");
      if (res.ok) { const d = await res.json(); if (Array.isArray(d.slugs)) slugs = d.slugs; }
    }
    if (slugs === null) return;
    localStorage.setItem("favIdeas", JSON.stringify(slugs));
    try { localStorage.setItem("favMigrated", "1"); } catch {}
    favListeners.forEach((l) => l());
  } catch {}
}

// A span with role=button because it lives inside the card's own <button>.
function FavButton({ id }: { id: string }) {
  const fav = useSyncExternalStore(favSubscribe, () => favRead(id), () => false);
  const [pop, setPop] = useState(false);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setPop(true);
    favFlip(id);
  };
  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={fav}
      aria-label={fav ? "Убрать из избранного" : "В избранное"}
      onClick={toggle}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(e as unknown as React.MouseEvent); }}
      onAnimationEnd={() => setPop(false)}
      className={`absolute right-2.5 top-2.5 z-[1] flex size-8 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] shadow-[0_1px_2px_rgba(18,18,22,0.06)] transition-colors ${fav ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"} ${pop ? "fav-pop" : ""}`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 4.9c0-.5.4-.9.9-.9h10.2c.5 0 .9.4.9.9v14.6c0 .34-.39.53-.65.32L12 16.2l-5.35 3.62c-.26.21-.65.02-.65-.32V4.9z" />
      </svg>
    </span>
  );
}

// Cartoon flame crown for the top 3 of the ranking (Duolingo streak vibes):
// two flame layers flicker out of phase, transform-only so a wall of cards
// stays 60fps. The orange/yellow is a deliberate exception to the no-yellow
// palette — fire is the whole point of the badge.
function FlameBadge({ rank, ru }: { rank: number; ru: boolean }) {
  return (
    <span className="absolute left-2.5 top-2.5 z-[1] flex items-center gap-1 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1 pl-1.5 pr-2 shadow-[0_1px_2px_rgba(18,18,22,0.06)]">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
        <path className="flame-outer" fill="#ff9500" d="M12 2.4c.5 3-.8 4.7-2.4 6.3C8 10.3 6.4 12 6.4 14.8a5.6 5.6 0 0011.2 0c0-1.8-.7-3.3-1.7-4.8-.5.9-1.2 1.6-2.1 2 .7-3.2-.3-6.4-1.8-9.6z" />
        <path className="flame-inner" fill="#ffcc00" d="M13.1 10.2c.2 1.9-.7 2.9-1.7 3.9-.8.8-1.5 1.6-1.5 2.9a3.1 3.1 0 006.2 0c0-1.1-.5-2-1.1-3-.6-1-1.4-2.2-1.9-3.8z" />
      </svg>
      <span className="text-[12px] font-bold tabular-nums text-[#ff9500]">{ru ? `№${rank}` : `#${rank}`}</span>
    </span>
  );
}

// Score row for the card footer: a clean white bordered chip (gallery style).
const CHIP = "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[12px] tabular-nums shadow-[0_1px_2px_rgba(18,18,22,0.04)]";
// The card footer shows ONE number — the composite. The full money/simplicity/
// demand breakdown lives in the modal's ScoreBlock; four numbers per card made
// the wall read as noise.
function ScoreChip({ score }: { score: Score }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${CHIP} font-semibold text-[var(--color-text-primary)]`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[var(--color-text-tertiary)]"><path d="M4 20V11M10 20V5M16 20v-6" /><path d="M3 20h18" /></svg>
        {score.composite}<span className="font-normal text-[var(--color-text-tertiary)]">/100</span>
      </span>
    </div>
  );
}

// Full score block for the idea detail modal — App-Store-style stat columns
// (label above, number below, hairline separators), no bars and no colour.
export function ScoreBlock({ score, locale = "ru" }: { score: Score; locale?: Locale }) {
  const ru = locale !== "en";
  const cols = [
    { l: ru ? "Итог" : "Score", v: score.composite, strong: true },
    { l: ru ? "Деньги" : "Money", v: score.money },
    { l: ru ? "Простота" : "Simplicity", v: score.simplicity },
    { l: ru ? "Спрос" : "Demand", v: score.demand },
  ];
  return (
    <div className="rounded-[18px] bg-[var(--color-surface-card)] p-5">
      <div className="grid grid-cols-4 divide-x divide-[var(--color-border-subtle)] text-center">
        {cols.map((c, i) => (
          <div key={i} className="px-1">
            <div className="truncate text-caption text-[var(--color-text-tertiary)]">{c.l}</div>
            <div className={`mt-1 text-title3 tabular-nums ${c.strong ? "text-[var(--color-text-primary)]" : "font-medium text-[var(--color-text-secondary)]"}`}>{c.v}</div>
          </div>
        ))}
      </div>
      {score.whyPay && (
        <div className="mt-4 border-t border-[var(--color-border-subtle)] pt-3.5">
          <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Кто и сколько платит" : "Who pays and how much"}</div>
          <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">{score.whyPay}</p>
        </div>
      )}
    </div>
  );
}

const GLYPHS: Record<string, React.ReactNode> = {
  graduation: <><path d="M12 4l9 4-9 4-9-4 9-4z" /><path d="M6 10v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-4" /><path d="M21 8v5" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2z" /></>,
  cards: <><rect x="3" y="6" width="11" height="14" rx="2" /><path d="M8 6V5a2 2 0 012-2h7a2 2 0 012 2v11a2 2 0 01-2 2h-1" /></>,
  moon: <path d="M20 14.5A8 8 0 1110 4a6.5 6.5 0 0010 10.5z" />,
  chat: <path d="M5 5h14a2 2 0 012 2v7a2 2 0 01-2 2h-7l-5 4v-4H5a2 2 0 01-2-2V7a2 2 0 012-2z" />,
  sparkles: <><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7L12 3z" /><path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" /></>,
  bolt: <path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z" />,
  chart: <><path d="M4 20V11M10 20V5M16 20v-6" /><path d="M3 20h18" /></>,
  book: <><path d="M5 4h12a1 1 0 011 1v15H6a1 1 0 01-1-1V4z" /><path d="M5 4a2 2 0 00-2 2v12a2 2 0 002 2" /></>,
  calendar: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  person: <><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 0116 0" /></>,
  star: <path d="M12 3l2.6 6.1L21 9.6l-5 4.2 1.6 6.6L12 16.9 6.4 20.4 8 13.8l-5-4.2 6.4-.5L12 3z" />,
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// payLevel stays RU in the data (so the weak-detection stays stable); the pill
// maps it to an English label when needed.
const PAY_EN: Record<string, string> = { "платит охотно": "Pays eagerly", "платит слабо": "Pays a little", "платит": "Pays" };
function PayPill({ level, locale = "ru" }: { level: string; locale?: Locale }) {
  const weak = level.includes("слабо");
  const color = weak ? "#ff6961" : "#30d158";
  const label = locale === "en" ? PAY_EN[level.trim()] ?? cap(level) : cap(level);
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {weak ? <path d="M6 2.5v7M3 6.5l3 3 3-3" /> : <path d="M6 9.5v-7M3 5.5l3-3 3 3" />}
      </svg>
      {label}
    </span>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {GLYPHS[name] ?? GLYPHS.star}
    </svg>
  );
}

function Modal({ onClose, action, children, locale = "ru" }: { onClose: () => void; action?: React.ReactNode; children: React.ReactNode; locale?: Locale }) {
  const ru = locale !== "en";
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    const html = document.documentElement;
    const prevHtml = html.style.overflow, prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); html.style.overflow = prevHtml; document.body.style.overflow = prevBody; };
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[26px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-24px_70px_-24px_rgba(18,18,22,0.4)] [animation:sheet-up_.3s_cubic-bezier(.22,1,.36,1)] sm:max-h-[86vh] sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-[var(--color-border-strong)] sm:hidden" />
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 sm:pt-7">{children}</div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-[var(--color-border-subtle)] p-4">
          {action}
          <button type="button" onClick={onClose} className="w-full rounded-full bg-[var(--color-button-secondary-bg)] px-4 py-3 text-callout font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]">{ru ? "Закрыть" : "Close"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// A gallery card. With `art` set it gets a cover zone on top — a quiet grey
// canvas with a centred SF-style glyph, the placeholder until each idea gets a
// real illustration. Without `art` it stays the compact text card (personas).
function CardFace({ icon, art, banner, hue, cover, title, desc, footer, onClick, locked, kicker, favId, rank, ru = true }: { icon?: string; art?: string; banner?: boolean; hue?: number; cover?: string; title: string; desc: string; footer?: React.ReactNode; onClick: () => void; locked?: boolean; kicker?: string; favId?: string; rank?: number; ru?: boolean }) {
  // The card has a top illustration zone when it has real art, a cover image, or
  // is explicitly a banner card (personas) — a pastel canvas, no glyph.
  const hasArt = !!(art || cover || banner);
  return (
    <button type="button" onClick={onClick} className={`card-min group/c relative flex h-full w-full min-w-0 flex-col items-start overflow-hidden rounded-[22px] text-left ${hasArt ? "p-2.5" : "gap-3 p-6"}`}>
      {locked && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="absolute right-4 top-4 z-[1] text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
      )}
      {hasArt && (
        // The cover: a soft pastel wash in the niche's own hue (grey until each
        // idea gets a real illustration) — the colour gives the wall of cards
        // its rhythm. Light/dark variants live in CSS (.art-wash).
        <div
          className={`relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-[15px] ${hue != null ? "art-wash" : "bg-[var(--color-bg-muted)]"}`}
          style={hue != null ? ({ "--art-h": hue } as React.CSSProperties) : undefined}
        >
          {cover
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={cover} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
            : art
              ? <Icon name={art} className={`size-10 ${hue != null ? "art-glyph" : "text-[var(--color-text-tertiary)]"}`} />
              : null}
          {favId && !locked && <FavButton id={favId} />}
          {rank != null && rank <= 3 && <FlameBadge rank={rank} ru={ru} />}
        </div>
      )}
      <div className={`flex w-full min-w-0 flex-1 flex-col items-start ${hasArt ? "gap-2.5 px-2.5 pb-3 pt-4" : "gap-3"}`}>
        {kicker && <div className="w-full truncate text-[12px] text-[var(--color-text-tertiary)]">{kicker}</div>}
        <div className="flex w-full min-w-0 items-center gap-3">
          {icon && !art && <Icon name={icon} className="size-7 shrink-0 text-[var(--color-text-primary)]" />}
          <div className="min-w-0 text-balance break-words text-headline text-[var(--color-text-primary)]">{title}</div>
        </div>
        <div className="w-full break-words text-callout text-[var(--color-text-secondary)]">{desc}</div>
        {footer && <div className="mt-auto pt-1">{footer}</div>}
      </div>
    </button>
  );
}

// Inset grouped section (iOS settings style): a soft surface card with a quiet
// caption header. Stacked with gaps instead of hairline dividers, so the modal
// reads as blocks, not a wall of text.
function Sec({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <section className="mt-3 rounded-[18px] bg-[var(--color-surface-card)] p-5">
      <h4 className="text-subhead text-[var(--color-text-primary)]">{k}</h4>
      <div className="mt-2.5 text-callout text-[var(--color-text-secondary)]">{children}</div>
    </section>
  );
}

function Bullets({ items, cross }: { items: string[]; cross?: boolean }) {
  return (
    <ul className="divide-y divide-[var(--color-border-subtle)]">
      {items.map((f, j) => (
        <li key={j} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
          {cross
            ? <span className="mt-px shrink-0 text-[15px] leading-[1.4] text-[var(--color-text-tertiary)]">×</span>
            : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-[3px] shrink-0 text-[var(--color-text-tertiary)]">
                <circle cx="12" cy="12" r="9" /><path d="M8.5 12.2l2.3 2.3 4.7-4.7" />
              </svg>
            )}
          <span>{f}</span>
        </li>
      ))}
    </ul>
  );
}

export function PersonaCards({ segments, covers, hue, locked, locale = "ru" }: { segments: Persona[]; covers?: (string | undefined)[]; hue?: number; locked?: boolean; locale?: Locale }) {
  const [open, setOpen] = useState<Persona | null>(null);
  const [auth, setAuth] = useState(false);
  const ru = locale !== "en";
  return (
    <>
      <div className="relative">
        <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${locked ? "pointer-events-none select-none blur-[7px]" : ""}`} aria-hidden={locked || undefined}>
          {segments.map((s, i) => (
            <CardFace
              key={i}
              banner
              cover={covers?.[i]}
              hue={hue}
              title={s.name}
              desc={s.job}
              onClick={() => setOpen(s)}
              footer={<PayPill level={s.payLevel} locale={locale} />}
            />
          ))}
        </div>
        {locked && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-[360px] rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-6 text-center shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
              <div className="text-subhead text-[var(--color-text-primary)]">{ru ? "Кто платит в этой нише" : "Who pays in this niche"}</div>
              <p className="mx-auto mt-2 max-w-[40ch] text-callout text-[var(--color-text-secondary)]">{ru ? "Войдите, чтобы увидеть сегменты аудитории и за что они готовы платить." : "Sign in to see the audience segments and what they pay for."}</p>
              <button type="button" onClick={() => setAuth(true)} className="mt-4 w-full rounded-full bg-[var(--color-text-primary)] px-5 py-2.5 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">{ru ? "Войти" : "Sign in"}</button>
            </div>
          </div>
        )}
      </div>
      {auth && <AuthModal locale={locale} onClose={() => setAuth(false)} onSuccess={() => location.reload()} />}
      {open && (
        <Modal onClose={() => setOpen(null)} locale={locale}>
          <h3 className="text-headline text-[var(--color-text-primary)]">{open.name}</h3>
          <div className="mt-2.5"><PayPill level={open.payLevel} locale={locale} /></div>
          <p className="mt-3 text-callout text-[var(--color-text-secondary)]">{open.job}</p>
          <Sec k={ru ? "Сколько платит" : "How much they pay"}>{open.payNote}</Sec>
          <Sec k={ru ? "Чего не хватает" : "What's missing"}>{open.gap}</Sec>
          <Sec k={ru ? "Сейчас обслуживают" : "Served today"}><span className="text-[var(--color-text-tertiary)]">{open.servedBy.join(", ")}</span></Sec>
        </Modal>
      )}
    </>
  );
}

const IDEA_PAGE = 12;

export function IdeaCards({ ideas, locked, loggedIn = false, locale = "ru", columns = 3 }: { ideas: Idea[]; locked?: boolean; loggedIn?: boolean; locale?: Locale; columns?: 2 | 3 }) {
  const [open, setOpen] = useState<Idea | null>(null);
  const [lockedOpen, setLockedOpen] = useState<Idea | null>(null);
  const [depthLoading, setDepthLoading] = useState(false);
  // Render in pages and grow on scroll. Owners get the whole deck (600+ cards);
  // mounting all at once — each with an animated edge-glow ring — pins the GPU
  // and heats the phone. Rendering ~24 at a time keeps active animations bounded.
  const [count, setCount] = useState(IDEA_PAGE);
  const sentinel = useRef<HTMLDivElement | null>(null);
  const ru = locale !== "en";

  useEffect(() => {
    if (count >= ideas.length) return;
    const el = sentinel.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (e) => { if (e.some((x) => x.isIntersecting)) setCount((c) => Math.min(c + IDEA_PAGE, ideas.length)); },
      { rootMargin: "600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count, ideas.length]);

  const shown = ideas.slice(0, count);

  // Preview-only cards (the owner's deck ships without bodies to stay light)
  // pull their depth from the API when opened.
  const openCard = (x: Idea) => {
    setOpen(x);
    if (!x.gap && !x.pitch && x.slug) {
      setDepthLoading(true);
      fetch(`/api/idea-depth/${x.slug}?l=${ru ? "ru" : "en"}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (d) setOpen((prev) => (prev && prev.slug === x.slug ? { ...prev, ...d } : prev)); })
        .catch(() => {})
        .finally(() => setDepthLoading(false));
    }
  };

  return (
    <>
      {/* A row-wise grid, not CSS columns: columns re-balance on every autoload
          (cards jump and fragments smear at column edges) and read top-to-bottom,
          hiding the ranking. Rows stretch, so footers align across a row. */}
      <div className={`grid gap-4 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}>
        {shown.map((x, i) => (
          // card-fade runs once on mount, staggered within the page — freshly
          // autoloaded cards cascade in instead of popping the layout at once.
          <div key={i} className={`card-fade h-full min-w-0 ${x.rank != null && x.rank <= 3 ? "flame-ring" : ""}`} style={{ animationDelay: `${(i % IDEA_PAGE) * 35}ms` }}>
            <CardFace title={x.title} desc={x.oneLiner} locked={locked || x.locked} onClick={locked ? () => {} : x.locked ? () => setLockedOpen(x) : () => openCard(x)}
              art={x.icon} hue={x.hue} cover={x.cover} favId={x.slug} kicker={x.category} rank={x.rank} ru={ru} footer={x.score ? <ScoreChip score={x.score} /> : undefined} />
          </div>
        ))}
      </div>
      {count < ideas.length && <div ref={sentinel} className="h-4 w-full" aria-hidden="true" />}
      {!locked && open && (
        <Modal
          onClose={() => setOpen(null)}
          locale={locale}
          action={open.categorySlug ? (
            <a href={`/${ru ? "ru" : "en"}/segment/${open.categorySlug}`} className="flex w-full items-center justify-center rounded-full bg-[var(--color-text-primary)] px-4 py-3 text-callout font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">
              {ru ? "Открыть разбор ниши" : "Open the niche breakdown"}
            </a>
          ) : undefined}
        >
          {open.cover && (
            <div className="mb-4 overflow-hidden rounded-[16px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={open.cover} alt="" loading="lazy" decoding="async" className="aspect-[2/1] w-full object-cover" />
            </div>
          )}
          {open.category && <div className="text-caption text-[var(--color-text-tertiary)]">{open.category}</div>}
          <h3 className="mt-1.5 text-title3 text-balance text-[var(--color-text-primary)]">{open.title}</h3>
          <p className="mt-2.5 text-body text-[var(--color-text-secondary)]">{open.oneLiner}</p>
          {open.score && <div className="mt-5"><ScoreBlock score={open.score} locale={locale} /></div>}
          {depthLoading && !open.gap && (
            <div className="mt-3 rounded-[18px] bg-[var(--color-surface-card)] p-5 text-center text-footnote text-[var(--color-text-tertiary)]">{ru ? "Загружаю разбор…" : "Loading the breakdown…"}</div>
          )}
          {open.gap && <Sec k={ru ? "Чего не хватает" : "What's missing"}>{open.gap}</Sec>}
          {open.pitch && <Sec k={ru ? "Что это" : "What it is"}>{open.pitch}</Sec>}
          {!!open.features?.length && <Sec k={ru ? "Как устроено" : "How it works"}><Bullets items={open.features} /></Sec>}
          {!!open.antiFeatures?.length && <Sec k={ru ? "Чего не делаем" : "What we don't do"}><Bullets items={open.antiFeatures} cross /></Sec>}
          {open.monetization && <Sec k={ru ? "Деньги" : "Money"}>{open.monetization}</Sec>}
          {!!open.reviewGrid?.length && (
            <Sec k={ru ? "Пруф из отзывов" : "Proof from reviews"}>
              <div className="flex flex-col gap-2.5">
                {open.reviewGrid.slice(0, 5).map((q, j) => (
                  <figure key={j} className="max-w-[92%] self-start rounded-[16px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
                    <p className="text-[13.5px] italic leading-[1.5] text-[var(--color-text-secondary)]">{q.quote.length > 200 ? q.quote.slice(0, 200) + "…" : q.quote}</p>
                    <figcaption className="mt-1 text-[12px] not-italic text-[var(--color-text-tertiary)]">{q.app}</figcaption>
                  </figure>
                ))}
              </div>
            </Sec>
          )}
        </Modal>
      )}
      {/* Contextual paywall: a locked card opens the same sheet, shows what the
          full write-up contains and funnels into the single lifetime offer. */}
      {!locked && lockedOpen && (
        <Modal onClose={() => setLockedOpen(null)} locale={locale}>
          {lockedOpen.category && <div className="text-caption text-[var(--color-text-tertiary)]">{lockedOpen.category}</div>}
          <h3 className="mt-1.5 text-title3 text-balance text-[var(--color-text-primary)]">{lockedOpen.title}</h3>
          <p className="mt-2.5 text-body text-[var(--color-text-secondary)]">{lockedOpen.oneLiner}</p>
          {lockedOpen.score && <div className="mt-5"><ScoreBlock score={lockedOpen.score} locale={locale} /></div>}
          <Sec k={ru ? "Полный разбор идеи закрыт" : "The full write-up is locked"}>
            <ul className="flex flex-col gap-2">
              {(ru
                ? ["Чего не хватает в нише и почему это дыра", "Как устроен продукт: механика и анти-фичи", "Деньги: кто уже платит и сколько", "Пруф: живые цитаты из отзывов"]
                : ["What the niche is missing and why it's a gap", "How the product works: mechanics and anti-features", "Money: who already pays and how much", "Proof: real quotes from reviews"]
              ).map((t, j) => (
                <li key={j} className="flex items-start gap-2.5">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-[3px] shrink-0 text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Sec>
          <div className="mt-5 flex justify-center"><BuyButton loggedIn={loggedIn} locale={locale} /></div>
        </Modal>
      )}
    </>
  );
}
