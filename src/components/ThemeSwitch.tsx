"use client";

import { useState } from "react";

type Theme = "light" | "dark";

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M10 1.5v2M10 16.5v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M1.5 10h2M16.5 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M17 11.5A7 7 0 0 1 8.5 3a7 7 0 1 0 8.5 8.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const OPTIONS: { theme: Theme; icon: () => React.ReactElement; label: string }[] = [
  { theme: "light", icon: SunIcon, label: "Light theme" },
  { theme: "dark", icon: MoonIcon, label: "Dark theme" },
];

// Figma "ThemeSwitch" (2076:1785): a bg-muted pill with two 34px icon segments;
// the active theme floats on a raised surface-card chip. Persists to the same
// kind of cookie as the language switch, then refreshes so the server re-renders
// <html data-theme>.
export default function ThemeSwitch({ theme }: { theme: Theme }) {
  // Theme is pure CSS (data-theme on <html>), so apply it on the client
  // instantly — no server round-trip. Local state keeps the toggle in sync.
  const [cur, setCur] = useState<Theme>(theme);

  function set(next: Theme) {
    if (next === cur) return;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    // eslint-disable-next-line react-hooks/immutability
    document.documentElement.dataset.theme = next;
    setCur(next);
  }

  const idx = OPTIONS.findIndex((o) => o.theme === cur);
  return (
    <div className="relative flex w-[74px] rounded-full bg-[var(--color-bg-muted)] p-[3px]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-[var(--color-surface-card)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.06),0px_1px_1px_0px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {OPTIONS.map(({ theme: t, icon: Icon, label }) => {
        const active = t === cur;
        return (
          <button
            key={t}
            onClick={() => set(t)}
            aria-pressed={active}
            aria-label={label}
            className={`relative z-10 flex h-[34px] flex-1 items-center justify-center rounded-full transition-colors [&_svg]:size-5 ${
              active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <Icon />
          </button>
        );
      })}
    </div>
  );
}
