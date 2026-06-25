"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

const ORDER: Locale[] = ["ru", "en"];
const SHORT: Record<Locale, string> = { en: "EN", ru: "RU" };
const FULL: Record<Locale, string> = { en: "English", ru: "Русский" };

// Compact language control: a round chip showing the current locale; click it to
// open a small picker. Closes on outside click / Escape.
export default function LangMenu({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const ru = locale !== "en";
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(next: Locale) {
    if (next === locale) { setOpen(false); return; }
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    const base = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `/${next}${base === "/" ? "" : base}`;
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label={ru ? "Язык" : "Language"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[13px] font-bold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        {SHORT[locale]}
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[170px] rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-1.5 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)]">
          {ORDER.map((l) => {
            const active = l === locale;
            return (
              <button
                key={l}
                type="button"
                onClick={() => go(l)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  active ? "bg-[var(--color-surface-card)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span>{FULL[l]}</span>
                {active ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[var(--color-text-brand)]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                ) : (
                  <span className="text-[12px] font-bold text-[var(--color-text-tertiary)]">{SHORT[l]}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
