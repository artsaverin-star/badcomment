"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";

const ORDER: Locale[] = ["ru", "en"];
const SHORT: Record<Locale, string> = { en: "EN", ru: "RU" };
const FULL: Record<Locale, string> = { en: "English", ru: "Русский" };

type Theme = "light" | "dark";
const SunIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M10 1.5v2M10 16.5v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M1.5 10h2M16.5 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);
const MoonIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M17 11.5A7 7 0 0 1 8.5 3a7 7 0 1 0 8.5 8.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const SearchIcon = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" /><path d="m17 17-3.2-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
);

// Compact language control: a round chip showing the current locale; click it to
// open a small picker. Closes on outside click / Escape.
export default function LangMenu({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const ru = locale !== "en";
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    typeof document !== "undefined" ? ((document.documentElement.dataset.theme as Theme) || "light") : "dark",
  );
  const box = useRef<HTMLDivElement>(null);

  function setThemePref(next: Theme) {
    if (next === theme) return;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    // eslint-disable-next-line react-hooks/immutability
    document.documentElement.dataset.theme = next;
    setTheme(next);
  }

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
        aria-label={ru ? "Меню" : "Menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-9 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[190px] rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-1.5 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)]">
          <a
            href={`/${locale}/search`}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-[14px] font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
          >
            <SearchIcon />
            {ru ? "Поиск" : "Search"}
          </a>
          <div className="my-1.5 h-px bg-[var(--color-border-subtle)]" />
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

          <div className="my-1.5 h-px bg-[var(--color-border-subtle)]" />
          {([["light", ru ? "Светлая" : "Light", SunIcon], ["dark", ru ? "Тёмная" : "Dark", MoonIcon]] as [Theme, string, () => React.ReactElement][]).map(([t, label, Icon]) => {
            const active = t === theme;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setThemePref(t)}
                aria-pressed={active}
                className={`flex w-full items-center justify-between gap-2 rounded-[14px] px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                  active ? "bg-[var(--color-surface-card)] text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span className="flex items-center gap-2.5"><Icon />{label}</span>
                {active && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="text-[var(--color-text-brand)]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
