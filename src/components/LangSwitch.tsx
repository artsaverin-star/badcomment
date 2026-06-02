"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

const ORDER: Locale[] = ["ru", "en"];
const LABELS: Record<Locale, string> = { en: "EN", ru: "RU" };

// Figma "LanguageSwitch" (2076:1780): a bg-muted pill holding two segments; the
// active one floats on a raised surface-card chip, the other is bare.
export default function LangSwitch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: Locale) {
    if (next === locale) return;
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="flex items-center rounded-full bg-[var(--color-bg-muted)] p-[3px]"
      aria-busy={pending}
    >
      {ORDER.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            onClick={() => set(l)}
            aria-pressed={active}
            className={`flex h-[34px] items-center justify-center rounded-full px-4 text-[17px] leading-[22px] transition-colors [font-family:var(--brand-font-family)] ${
              active
                ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-text-primary)] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.04),0px_1px_1px_0px_rgba(0,0,0,0.06)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {LABELS[l]}
          </button>
        );
      })}
    </div>
  );
}
