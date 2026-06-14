"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@saverin/ui-web";
import LangSwitch from "./LangSwitch";
import ThemeSwitch from "./ThemeSwitch";
import type { Locale } from "@/lib/i18n";

// Consolidated settings popover (gear icon → language + theme), keeping the
// header bar clean. Closes on outside click / Escape.
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
        aria-label={ru ? "Настройки" : "Settings"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        icon={
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V20a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H4a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.56V4a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.56 1H20a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[220px] rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.7)]">
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 px-0.5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Язык" : "Language"}</p>
              <LangSwitch locale={locale} />
            </div>
            <div>
              <p className="mb-1.5 px-0.5 text-caption text-[var(--color-text-tertiary)]">{ru ? "Тема" : "Theme"}</p>
              <ThemeSwitch theme={theme} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
