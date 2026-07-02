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
export default function IdeaSortTabs({ current, cat, locale = "ru" }: { current: SortKey; cat?: string; locale?: Locale }) {
  const ru = locale !== "en";
  const href = (key: SortKey) => {
    const p = new URLSearchParams();
    if (key !== "balance") p.set("sort", key);
    if (cat) p.set("cat", cat);
    const q = p.toString();
    return q ? `/?${q}` : "/";
  };
  // One segmented control in a white pill container (matches the rating toggle),
  // horizontally scrollable where four labels don't fit.
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex w-max min-w-full justify-center">
        <div className="inline-flex shrink-0 items-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-0.5 shadow-[0_1px_2px_rgba(18,18,22,0.04)]">
          {TABS.map((t) => {
            const active = t.key === current;
            return (
              <Link
                key={t.key}
                href={href(t.key)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-footnote font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]"
                    : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {t.dot && <span className="size-1.5 rounded-full" style={{ background: t.dot }} />}
                {ru ? t.ru : t.en}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
