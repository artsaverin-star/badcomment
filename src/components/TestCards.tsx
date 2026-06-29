"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import AuthModal from "./AuthModal";
import type { Locale } from "@/lib/i18n";

// Playing-card style decks for the /test prototype: portrait cards with a
// centered SF-style line icon, title and short description. Tapping a card
// opens a popup (portalled to body) with the full detail. Used for audience
// personas and for ideas.

type Persona = { name: string; job: string; payLevel: string; payNote: string; gap: string; servedBy: string[] };
type Idea = { title: string; oneLiner: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string; reviewGrid?: { quote: string; rating: number; app: string }[]; icon: string };

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
        className="relative flex max-h-[92vh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[26px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-24px_70px_-20px_rgba(0,0,0,0.7)] [animation:sheet-up_.3s_cubic-bezier(.22,1,.36,1)] sm:max-h-[86vh] sm:rounded-[26px]"
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

function CardFace({ icon, title, desc, footer, onClick, locked }: { icon: string; title: string; desc: string; footer?: React.ReactNode; onClick: () => void; locked?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`group/c relative flex h-full flex-col items-start gap-3 rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 text-left transition-colors ${locked ? "cursor-default" : "hover:border-[var(--color-border-strong)] hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,var(--color-surface-card))]"}`}>
      {locked && (
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="absolute right-4 top-4 text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
      )}
      <span className="flex size-11 items-center justify-center rounded-[12px] bg-[var(--color-bg-muted)]"><Icon name={icon} className="size-6 text-[var(--color-text-secondary)]" /></span>
      <div className="mt-1 text-headline text-[var(--color-text-primary)]">{title}</div>
      <div className="text-callout text-[var(--color-text-secondary)]">{desc}</div>
      {footer && <div className="mt-auto pt-1">{footer}</div>}
    </button>
  );
}

function Sec({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-[var(--color-border-subtle)] pt-4">
      <h4 className="text-footnote font-semibold text-[var(--color-text-tertiary)]">{k}</h4>
      <div className="mt-2 text-callout text-[var(--color-text-secondary)]">{children}</div>
    </section>
  );
}

function Bullets({ items, cross }: { items: string[]; cross?: boolean }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((f, j) => (
        <li key={j} className="flex gap-2.5">
          {cross
            ? <span className="shrink-0 text-[var(--color-text-tertiary)]">×</span>
            : <span className="mt-[8px] size-[5px] shrink-0 rounded-full bg-[var(--color-text-tertiary)]" />}
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

export function IdeaCards({ ideas, locked, locale = "ru" }: { ideas: Idea[]; locked?: boolean; locale?: Locale }) {
  const [open, setOpen] = useState<Idea | null>(null);
  const ru = locale !== "en";
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ideas.map((x, i) => (
          <CardFace key={i} icon={x.icon} title={x.title} desc={x.oneLiner} locked={locked} onClick={locked ? () => {} : () => setOpen(x)} />
        ))}
      </div>
      {!locked && open && (
        <Modal onClose={() => setOpen(null)}>
          <h3 className="text-headline text-[var(--color-text-primary)]">{open.title}</h3>
          <p className="mt-2 text-body text-[var(--color-text-secondary)]">{open.oneLiner}</p>
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
    </>
  );
}
