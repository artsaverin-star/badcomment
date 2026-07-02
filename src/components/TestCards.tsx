"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

// Playing-card style decks for the /test prototype: portrait cards with a
// centered SF-style line icon, title and short description. Tapping a card
// opens a popup (portalled to body) with the full detail. Used for audience
// personas and for ideas.

type Persona = { name: string; job: string; payLevel: string; payNote: string; gap: string; servedBy: string[] };
type Score = { money: number; simplicity: number; demand: number; composite: number; whyPay?: string; pricePoint?: string };
type Idea = { slug?: string; title: string; oneLiner: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string; reviewGrid?: { quote: string; rating: number; app: string }[]; icon: string; score?: Score; category?: string; categorySlug?: string };

// Bookmark toggle on an idea card: pops on tap and persists to localStorage
// (favIdeas, keyed by idea slug). State lives in localStorage and reaches
// React through useSyncExternalStore — server renders "not saved", the client
// snapshot takes over after hydration, and every card stays in sync.
const favListeners = new Set<() => void>();
function favRead(id: string): boolean {
  try { return (JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]).includes(id); } catch { return false; }
}
function favSubscribe(cb: () => void) {
  favListeners.add(cb);
  return () => { favListeners.delete(cb); };
}
function favFlip(id: string) {
  try {
    const cur = new Set<string>(JSON.parse(localStorage.getItem("favIdeas") || "[]") as string[]);
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    localStorage.setItem("favIdeas", JSON.stringify([...cur]));
  } catch {}
  favListeners.forEach((l) => l());
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

const SCORE_META = {
  money: { ru: "Деньги", en: "Money", color: "#30d158" },
  simplicity: { ru: "Простота", en: "Simplicity", color: "#0a84ff" },
  demand: { ru: "Спрос", en: "Demand", color: "#bf5af2" },
} as const;

const METRIC_GLYPH: Record<"money" | "simplicity" | "demand", React.ReactNode> = {
  money: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M14.4 9.2c0-1-1.1-1.7-2.4-1.7s-2.5.8-2.5 1.9c0 2.6 5 1.4 5 4 0 1.1-1.2 1.9-2.5 1.9s-2.5-.8-2.5-1.8" /></>,
  simplicity: <path d="M15.6 5.4a3.6 3.6 0 00-4.7 4.7l-5.7 5.7a1.6 1.6 0 002.2 2.2l5.7-5.7a3.6 3.6 0 004.7-4.7l-2.1 2.1-1.7-.5-.5-1.7 2.1-2.1z" />,
  demand: <><path d="M4 16l5-5 3 3 6-6" /><path d="M15 8h4v4" /></>,
};

function MetricIcon({ k, className, style }: { k: "money" | "simplicity" | "demand"; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className} style={style}>
      {METRIC_GLYPH[k]}
    </svg>
  );
}

function Bar({ k, value, locale }: { k: "money" | "simplicity" | "demand"; value: number; locale: Locale }) {
  const m = SCORE_META[k];
  return (
    <div className="flex items-center gap-1.5" title={`${locale === "en" ? m.en : m.ru}: ${value}/100`}>
      <span className="flex w-[74px] shrink-0 items-center gap-1.5 text-[11px] text-[var(--color-text-tertiary)]"><MetricIcon k={k} className="size-3.5" style={{ color: m.color }} />{locale === "en" ? m.en : m.ru}</span>
      <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
        <span className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${value}%`, background: m.color }} />
      </span>
      <span className="w-[20px] shrink-0 text-right text-[11px] tabular-nums text-[var(--color-text-secondary)]">{value}</span>
    </div>
  );
}

// Score row for the card footer: clean white bordered chips (gallery style),
// a tiny coloured glyph carries the metric, the number stays neutral.
const CHIP = "inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-2.5 py-1 text-[12px] tabular-nums shadow-[0_1px_2px_rgba(18,18,22,0.04)]";
function MetricPill({ k, value }: { k: "money" | "simplicity" | "demand"; value: number }) {
  const c = SCORE_META[k].color;
  return (
    <span className={`${CHIP} font-medium text-[var(--color-text-secondary)]`}>
      <MetricIcon k={k} className="size-3.5" style={{ color: c }} />{value}
    </span>
  );
}
function ScoreChip({ score }: { score: Score }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`${CHIP} font-semibold text-[var(--color-text-primary)]`}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-[var(--color-text-tertiary)]"><path d="M4 20V11M10 20V5M16 20v-6" /><path d="M3 20h18" /></svg>
        {score.composite}
      </span>
      <MetricPill k="money" value={score.money} />
      <MetricPill k="simplicity" value={score.simplicity} />
      <MetricPill k="demand" value={score.demand} />
    </div>
  );
}

// Full score block for the idea detail modal — an inset group, like the rest
// of the modal sections.
export function ScoreBlock({ score, locale = "ru" }: { score: Score; locale?: Locale }) {
  const ru = locale !== "en";
  return (
    <div className="rounded-[18px] bg-[var(--color-surface-card)] p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Оценка идеи" : "Idea score"}</span>
        <span className="text-title2 font-semibold tabular-nums text-[var(--color-text-primary)]">{score.composite}<span className="text-footnote font-normal text-[var(--color-text-tertiary)]">/100</span></span>
      </div>
      <div className="flex flex-col gap-2">
        <Bar k="money" value={score.money} locale={locale} />
        <Bar k="simplicity" value={score.simplicity} locale={locale} />
        <Bar k="demand" value={score.demand} locale={locale} />
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

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
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
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          <button type="button" onClick={onClose} className="w-full rounded-full bg-[var(--color-button-secondary-bg)] px-4 py-3 text-callout font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]">Закрыть</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// A gallery card. With `art` set it gets a cover zone on top — a quiet grey
// canvas with a centred SF-style glyph, the placeholder until each idea gets a
// real illustration. Without `art` it stays the compact text card (personas).
function CardFace({ icon, art, title, desc, footer, onClick, locked, kicker, favId }: { icon?: string; art?: string; title: string; desc: string; footer?: React.ReactNode; onClick: () => void; locked?: boolean; kicker?: string; favId?: string }) {
  return (
    <button type="button" onClick={onClick} className={`card-min group/c relative flex h-full flex-col items-start overflow-hidden rounded-[22px] text-left ${art ? "p-2.5" : "gap-3 p-6"} ${locked ? "cursor-default" : ""}`}>
      {locked && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="absolute right-4 top-4 z-[1] text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
      )}
      {art && (
        <div className="relative flex aspect-[2/1] w-full items-center justify-center rounded-[15px] bg-[var(--color-bg-muted)]">
          <Icon name={art} className="size-10 text-[var(--color-text-tertiary)]" />
          {favId && !locked && <FavButton id={favId} />}
        </div>
      )}
      <div className={`flex w-full flex-1 flex-col items-start ${art ? "gap-2.5 px-2.5 pb-3 pt-4" : "gap-3"}`}>
        {kicker && <div className="max-w-[85%] truncate text-[12px] text-[var(--color-text-tertiary)]">{kicker}</div>}
        <div className="flex items-center gap-3">
          {icon && !art && <Icon name={icon} className="size-7 shrink-0 text-[var(--color-text-primary)]" />}
          <div className="text-headline text-[var(--color-text-primary)]">{title}</div>
        </div>
        <div className="text-callout text-[var(--color-text-secondary)]">{desc}</div>
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
      <h4 className="text-caption text-[var(--color-text-tertiary)]">{k}</h4>
      <div className="mt-2 text-callout text-[var(--color-text-secondary)]">{children}</div>
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

const PERSONA_ICONS = ["graduation", "compass", "cards", "moon", "person"];

export function PersonaCards({ segments, locked, locale = "ru" }: { segments: Persona[]; locked?: boolean; locale?: Locale }) {
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
              icon={PERSONA_ICONS[i % PERSONA_ICONS.length]}
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
        <Modal onClose={() => setOpen(null)}>
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

const IDEA_PAGE = 24;

export function IdeaCards({ ideas, locked, locale = "ru", columns = 3 }: { ideas: Idea[]; locked?: boolean; locale?: Locale; columns?: 2 | 3 }) {
  const [open, setOpen] = useState<Idea | null>(null);
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
  return (
    <>
      <div className={`gap-4 [column-fill:balance] sm:columns-2 ${columns === 3 ? "lg:columns-3" : ""}`}>
        {shown.map((x, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <CardFace title={x.title} desc={x.oneLiner} locked={locked} onClick={locked ? () => {} : () => setOpen(x)}
              art={x.icon} favId={x.slug} kicker={x.category} footer={x.score ? <ScoreChip score={x.score} /> : undefined} />
          </div>
        ))}
      </div>
      {count < ideas.length && <div ref={sentinel} className="h-4 w-full" aria-hidden="true" />}
      {!locked && open && (
        <Modal onClose={() => setOpen(null)}>
          {open.category && <div className="text-caption text-[var(--color-text-tertiary)]">{open.category}</div>}
          <h3 className="mt-1.5 text-title3 text-balance text-[var(--color-text-primary)]">{open.title}</h3>
          <p className="mt-2.5 text-body text-[var(--color-text-secondary)]">{open.oneLiner}</p>
          {open.score && <div className="mt-5"><ScoreBlock score={open.score} locale={locale} /></div>}
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
          {open.categorySlug && (
            <a href={`/${ru ? "ru" : "en"}/segment/${open.categorySlug}`} className="mt-3 flex items-center justify-between gap-3 rounded-[18px] bg-[var(--color-surface-card)] px-5 py-4 transition-opacity hover:opacity-80">
              <span className="min-w-0">
                <span className="block text-caption text-[var(--color-text-tertiary)]">{ru ? "Разбор ниши" : "Niche breakdown"}</span>
                <span className="block truncate text-callout font-medium text-[var(--color-text-primary)]">{open.category ? (ru ? `Открыть разбор: ${open.category}` : `Open breakdown: ${open.category}`) : ru ? "Открыть разбор категории" : "Open the category breakdown"}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          )}
        </Modal>
      )}
    </>
  );
}
