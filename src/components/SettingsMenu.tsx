"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@saverin/ui-web";
import LangSwitch from "./LangSwitch";
import ThemeSwitch from "./ThemeSwitch";
import type { Locale } from "@/lib/i18n";

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2.5 10h15M10 2.5c2 2.2 3 4.8 3 7.5s-1 5.3-3 7.5c-2-2.2-3-4.8-3-7.5s1-5.3 3-7.5Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]">
      <path d="M17 11.5A7 7 0 0 1 8.5 3a7 7 0 1 0 8.5 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Consolidated menu popover (☰ → language + theme), getgems-style dark panel,
// keeping the header bar clean. Closes on outside click / Escape.
export default function SettingsMenu({ locale, theme }: { locale: Locale; theme: "light" | "dark" }) {
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

  return (
    <div ref={box} className="relative">
      <IconButton
        variant="ghost"
        size="M"
        aria-label={ru ? "Меню" : "Menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        icon={
          open ? (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          )
        }
      />

      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-[260px] rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-overlay)] p-4 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.8)]">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-callout font-medium text-[var(--color-text-primary)]">
                <GlobeIcon />
                {ru ? "Язык" : "Language"}
              </span>
              <LangSwitch locale={locale} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2.5 text-callout font-medium text-[var(--color-text-primary)]">
                <MoonIcon />
                {ru ? "Тема" : "Theme"}
              </span>
              <ThemeSwitch theme={theme} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
