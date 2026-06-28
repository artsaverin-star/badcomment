"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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

function PayPill({ level }: { level: string }) {
  const weak = level.includes("слабо");
  const color = weak ? "#ff6961" : "#30d158";
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {weak ? <path d="M6 2.5v7M3 6.5l3 3 3-3" /> : <path d="M6 9.5v-7M3 5.5l3-3 3 3" />}
      </svg>
      {cap(level)}
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
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div className="relative max-h-[86vh] w-full max-w-[480px] overflow-y-auto rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-6 shadow-[0_-24px_70px_-24px_rgba(0,0,0,0.7)]" onClick={(e) => e.stopPropagation()}>
        {children}
        <button type="button" onClick={onClose} className="mt-6 w-full rounded-full bg-[var(--color-button-secondary-bg)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]">Закрыть</button>
      </div>
    </div>,
    document.body,
  );
}

function CardFace({ icon, title, desc, footer, onClick }: { icon: string; title: string; desc: string; footer?: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-[18px] border border-[var(--color-border-subtle)] p-4 text-center transition-colors hover:border-[var(--color-border-strong)] hover:bg-[var(--color-bg-muted)]">
      <Icon name={icon} className="size-9 text-[var(--color-text-secondary)]" />
      <div className="text-[15px] font-semibold leading-[1.2] text-[var(--color-text-primary)]">{title}</div>
      <div className="line-clamp-2 text-[12.5px] leading-[1.4] text-[var(--color-text-tertiary)]">{desc}</div>
      {footer}
    </button>
  );
}

function Sec({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-[12px] font-medium text-[var(--color-text-tertiary)]">{k}</div>
      <div className="mt-1 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{children}</div>
    </div>
  );
}

const PERSONA_ICONS = ["graduation", "compass", "cards", "moon", "person"];

export function PersonaCards({ segments }: { segments: Persona[] }) {
  const [open, setOpen] = useState<Persona | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {segments.map((s, i) => (
          <CardFace
            key={i}
            icon={PERSONA_ICONS[i % PERSONA_ICONS.length]}
            title={s.name}
            desc={s.job}
            onClick={() => setOpen(s)}
            footer={<PayPill level={s.payLevel} />}
          />
        ))}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <h3 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">{open.name}</h3>
          <div className="mt-2.5"><PayPill level={open.payLevel} /></div>
          <p className="mt-3 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{open.job}</p>
          <Sec k="Сколько платит">{open.payNote}</Sec>
          <Sec k="Чего не хватает">{open.gap}</Sec>
          <Sec k="Сейчас обслуживают"><span className="text-[var(--color-text-tertiary)]">{open.servedBy.join(", ")}</span></Sec>
        </Modal>
      )}
    </>
  );
}

export function IdeaCards({ ideas }: { ideas: Idea[] }) {
  const [open, setOpen] = useState<Idea | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ideas.map((x, i) => (
          <CardFace key={i} icon={x.icon} title={x.title} desc={x.oneLiner} onClick={() => setOpen(x)} />
        ))}
      </div>
      {open && (
        <Modal onClose={() => setOpen(null)}>
          <h3 className="text-[23px] font-black tracking-[-0.02em] text-[var(--color-text-primary)]">{open.title}</h3>
          <p className="mt-2 text-[16px] leading-[1.55] text-[var(--color-text-secondary)]">{open.oneLiner}</p>
          {open.gap && <Sec k="Чего не хватает">{open.gap}</Sec>}
          {open.pitch && <Sec k="Что это">{open.pitch}</Sec>}
          {!!open.features?.length && <Sec k="Как устроено"><ul className="flex flex-col gap-1.5">{open.features.map((f, j) => <li key={j} className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">·</span>{f}</li>)}</ul></Sec>}
          {!!open.antiFeatures?.length && <Sec k="Чего не делаем"><ul className="flex flex-col gap-1.5">{open.antiFeatures.map((f, j) => <li key={j} className="flex gap-2"><span className="text-[var(--color-text-tertiary)]">×</span>{f}</li>)}</ul></Sec>}
          {open.monetization && <Sec k="Деньги">{open.monetization}</Sec>}
          {!!open.reviewGrid?.length && (
            <Sec k="Пруф из отзывов">
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
