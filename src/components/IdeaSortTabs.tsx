"use client";

import Link from "next/link";
import type { Locale } from "@/lib/i18n";

export type SortKey = "balance" | "money" | "simplicity" | "demand";

const TABS: { key: SortKey; ru: string; en: string; dot?: string }[] = [
  { key: "balance", ru: "Лучший баланс", en: "Best balance" },
  { key: "money", ru: "Самые прибыльные", en: "Most profitable", dot: "#30d158" },
  { key: "simplicity", ru: "Проще всего собрать", en: "Easiest to build", dot: "#0a84ff" },
  { key: "demand", ru: "Больше всего спроса", en: "Highest demand", dot: "#bf5af2" },
];

// Segmented sort control for the ideas home. Each tab is a link to ?sort=<key>
// so the server re-ranks and re-slices (keeps the gating server-side).
export default function IdeaSortTabs({ current, locale = "ru" }: { current: SortKey; locale?: Locale }) {
  const ru = locale !== "en";
  return (
    <div className="mx-auto flex max-w-full flex-wrap items-center justify-center gap-2">
      {TABS.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            href={t.key === "balance" ? "/" : `/?sort=${t.key}`}
            scroll={false}
            aria-current={active ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-footnote font-medium transition-colors ${
              active
                ? "border-transparent bg-[var(--color-button-primary-bg)] text-[var(--color-button-primary-text)]"
                : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {t.dot && <span className="size-1.5 rounded-full" style={{ background: t.dot }} />}
            {ru ? t.ru : t.en}
          </Link>
        );
      })}
    </div>
  );
}
