"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export type SortKey = "balance" | "money" | "simplicity" | "demand";

const OPTIONS: { key: SortKey; ru: string; en: string }[] = [
  { key: "balance", ru: "Лучший баланс", en: "Best balance" },
  { key: "money", ru: "Самые прибыльные", en: "Most profitable" },
  { key: "simplicity", ru: "Проще всего собрать", en: "Easiest to build" },
  { key: "demand", ru: "Больше всего спроса", en: "Highest demand" },
];

// The sort control, folded into ONE compact pill (a native select) so the
// homepage has a single control row instead of a stack of button strips.
// Changing it navigates to ?sort=<key>, keeping the ranking server-side.
export default function IdeaSortTabs({ current, cat, locale = "ru" }: { current: SortKey; cat?: string; locale?: Locale }) {
  const ru = locale !== "en";
  const router = useRouter();
  const href = (key: SortKey) => {
    const p = new URLSearchParams();
    if (key !== "balance") p.set("sort", key);
    if (cat) p.set("cat", cat);
    const q = p.toString();
    return q ? `/?${q}` : "/";
  };
  return (
    <label className="relative inline-flex shrink-0 items-center">
      <span className="sr-only">{ru ? "Сортировка идей" : "Sort ideas"}</span>
      <select
        value={current}
        onChange={(e) => router.push(href(e.target.value as SortKey), { scroll: false })}
        className="appearance-none rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1.5 pl-3.5 pr-8 text-footnote font-medium text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(18,18,22,0.04)] outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{ru ? o.ru : o.en}</option>
        ))}
      </select>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="pointer-events-none absolute right-3 text-[var(--color-text-tertiary)]"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </label>
  );
}
