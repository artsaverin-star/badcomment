"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export type SortKey = "hot" | "balance" | "money" | "simplicity" | "demand";

const OPTIONS: { key: SortKey; ru: string; en: string }[] = [
  { key: "hot", ru: "🔥 Самые горячие", en: "🔥 Hottest" },
  { key: "money", ru: "Самые прибыльные", en: "Most profitable" },
  { key: "demand", ru: "Больше всего спроса", en: "Highest demand" },
  { key: "simplicity", ru: "Проще всего собрать", en: "Easiest to build" },
  { key: "balance", ru: "Лучший баланс", en: "Best balance" },
];

// The sort control, folded into ONE compact pill (a native select) so the
// homepage has a single control row instead of a stack of button strips.
// Changing it navigates to ?sort=<key>, keeping the ranking server-side.
export default function IdeaSortTabs({ current, cat, locale = "ru" }: { current: SortKey; cat?: string; locale?: Locale }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const router = useRouter();
  const href = (key: SortKey) => {
    const p = new URLSearchParams();
    if (key !== "hot") p.set("sort", key);
    if (cat) p.set("cat", cat);
    const q = p.toString();
    return q ? `${lp}/ideas?${q}` : `${lp}/ideas`;
  };
  // One centred pill showing the current order; the native select sits
  // invisible on top so the pill hugs its label and the dropdown stays native.
  const cur = OPTIONS.find((o) => o.key === current) ?? OPTIONS[0];
  return (
    <span className="relative inline-flex shrink-0 items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-2.5 pl-5 pr-4 shadow-[0_1px_2px_rgba(18,18,22,0.06)] transition-shadow hover:shadow-[0_4px_14px_-4px_rgba(18,18,22,0.18)]">
      <span className="text-callout font-semibold text-[var(--color-text-primary)]">{ru ? cur.ru : cur.en}</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="text-[var(--color-text-tertiary)]"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <select
        aria-label={ru ? "Сортировка идей" : "Sort ideas"}
        value={current}
        onChange={(e) => router.push(href(e.target.value as SortKey), { scroll: false })}
        className="absolute inset-0 size-full cursor-pointer appearance-none opacity-0"
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{ru ? o.ru : o.en}</option>
        ))}
      </select>
    </span>
  );
}
