"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";

const LABELS: Record<Locale, string> = { en: "EN", ru: "RU" };

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
      className="flex items-center rounded-full border border-black/10 p-0.5 text-xs font-medium dark:border-white/15"
      aria-busy={pending}
    >
      {(["en", "ru"] as Locale[]).map((l) => (
        <button
          key={l}
          onClick={() => set(l)}
          aria-pressed={l === locale}
          className={`rounded-full px-2.5 py-1 transition ${
            l === locale
              ? "bg-red-600 text-white"
              : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          }`}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
