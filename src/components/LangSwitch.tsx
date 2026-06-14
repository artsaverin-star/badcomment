"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";

const ORDER: Locale[] = ["ru", "en"];
const LABELS: Record<Locale, string> = { en: "EN", ru: "RU" };

// Segmented language control with a sliding active chip. Active state updates
// instantly (local), then the page navigates to the locale-prefixed URL.
export default function LangSwitch({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const [cur, setCur] = useState<Locale>(locale);
  const idx = ORDER.indexOf(cur);

  function set(next: Locale) {
    if (next === cur) return;
    setCur(next);
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    // Hard navigation to the locale-prefixed URL: the client RSC route through
    // the proxy could hang for ages; a full load is instant (server ~0.1s).
    const base = pathname.replace(/^\/(ru|en)(?=\/|$)/, "") || "/";
    // eslint-disable-next-line react-hooks/immutability
    window.location.href = `/${next}${base === "/" ? "" : base}`;
  }

  return (
    <div className="relative flex w-[96px] rounded-full bg-[var(--color-bg-muted)] p-[3px]">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-[var(--color-surface-card)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.06),0px_1px_1px_0px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {ORDER.map((l) => {
        const active = l === cur;
        return (
          <button
            key={l}
            onClick={() => set(l)}
            aria-pressed={active}
            className={`relative z-10 flex h-[34px] flex-1 items-center justify-center rounded-full text-[15px] font-semibold transition-colors ${
              active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
