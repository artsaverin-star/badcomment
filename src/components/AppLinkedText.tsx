"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";

// App data needed to render the popup card (same shape the rating list uses).
export type AppLite = {
  id: string;
  title: string;
  icon: string | null;
  storeAvg: number | null;
  ratings: number;
  realScore: number | null;
  authenticity: string | null;
  verdict: string;
  loved: string;
  weak: string;
  whoFor: string | null;
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
const nf = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");
const shortName = (t: string) => t.split(/[:\-–—(|]/)[0].trim();
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Renders prose where app names followed by a "(realScore)" are turned into
// clickable links that open the app's card, and the strange parenthetical number
// is dropped. Names we can't match to an app are left untouched.
export default function AppLinkedText({ text, apps, locale = "ru", as = "span", className }: {
  text: string;
  apps: AppLite[];
  locale?: Locale;
  as?: "span" | "p";
  className?: string;
}) {
  const ru = locale !== "en";
  const [open, setOpen] = useState<AppLite | null>(null);

  // name (lowercased) -> app, preferring the longest names. Skip names < 3 chars.
  const byName = new Map<string, AppLite>();
  for (const a of apps) {
    for (const n of [a.title, shortName(a.title)]) {
      const key = n.toLowerCase();
      if (n.length >= 3 && !byName.has(key)) byName.set(key, a);
    }
  }
  const names = [...byName.keys()].sort((x, y) => y.length - x.length);

  const tokens: (string | { name: string; app: AppLite })[] = [];
  if (names.length) {
    const re = new RegExp(`\\b(${names.map(escapeRe).join("|")})\\s*\\((\\d{1,3})\\)`, "gi");
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) tokens.push(text.slice(last, m.index));
      const app = byName.get(m[1].toLowerCase());
      tokens.push(app ? { name: m[1], app } : m[0]);
      last = re.lastIndex;
    }
    if (last < text.length) tokens.push(text.slice(last));
  } else {
    tokens.push(text);
  }

  const Tag = as;
  return (
    <>
      <Tag className={className}>
        {tokens.map((t, i) =>
          typeof t === "string" ? (
            // strip leftover "(NN)" scores on names we couldn't link, so the
            // strange numbers are gone everywhere, not just on matched apps
            t.replace(/\s?\((\d{1,3})\)/g, "")
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => setOpen(t.app)}
              className="font-medium text-[var(--color-text-primary)] underline decoration-[var(--color-border-strong)] underline-offset-2 transition-colors hover:decoration-[var(--color-text-primary)]"
            >
              {t.name}
            </button>
          ),
        )}
      </Tag>
      {open && <AppModal app={open} ru={ru} onClose={() => setOpen(null)} />}
    </>
  );
}

function AppModal({ app, ru, onClose }: { app: AppLite; ru: boolean; onClose: () => void }) {
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
  const au = (ru ? AUTH : AUTH_EN)[app.authenticity || ""] || null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative flex max-h-[92vh] w-full max-w-[480px] flex-col overflow-hidden rounded-t-[26px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-24px_70px_-20px_rgba(0,0,0,0.7)] [animation:sheet-up_.3s_cubic-bezier(.22,1,.36,1)] sm:max-h-[86vh] sm:rounded-[26px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-3 h-1 w-9 shrink-0 rounded-full bg-[var(--color-border-strong)] sm:hidden" />
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 sm:pt-7">
          <div className="flex items-start gap-3">
            {app.icon
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={app.icon} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-[14px] object-cover" />
              : <span className="size-14 shrink-0 rounded-[14px] bg-[var(--color-bg-muted)]" />}
            <div className="min-w-0 flex-1">
              <div className="text-headline text-[var(--color-text-primary)]">{app.title}</div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Chip>{(app.storeAvg?.toFixed(1) ?? "—") + (ru ? " в сторе" : " in store")}</Chip>
                {au && <span className="rounded-full px-2.5 py-1 text-caption font-medium" style={{ background: `color-mix(in srgb, ${au.c} 15%, transparent)`, color: au.c }}>{cap(au.w)}</span>}
                <Chip>{nf(app.ratings || 0, ru) + (ru ? " оценок" : " ratings")}</Chip>
                <Chip strong>{`${app.realScore}/100`}{ru ? " наш балл" : " our score"}</Chip>
              </div>
            </div>
          </div>
          {app.verdict && <p className="mt-4 text-callout text-[var(--color-text-secondary)]">{app.verdict}</p>}
          <div className="mt-5 flex flex-col gap-3.5 border-t border-[var(--color-border-subtle)] pt-4">
            <Field k={ru ? "Сильное" : "Strong"} v={app.loved} />
            <Field k={ru ? "Слабое" : "Weak"} v={app.weak} />
            <Field k={ru ? "Кому" : "For whom"} v={app.whoFor} />
          </div>
        </div>
        <div className="shrink-0 border-t border-[var(--color-border-subtle)] p-4">
          <button type="button" onClick={onClose} className="w-full rounded-full bg-[var(--color-button-secondary-bg)] px-4 py-3 text-callout font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-muted)]">{ru ? "Закрыть" : "Close"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Chip({ children, strong }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-caption ${strong ? "bg-[var(--color-bg-muted)] font-semibold text-[var(--color-text-primary)]" : "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]"}`}>
      {children}
    </span>
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
