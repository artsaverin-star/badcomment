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
    return q ? `${lp}?${q}` : lp;
  };
  // A quiet inline text control, not a pill — it must not compete with the
  // niche tiles for attention.
  return (
    <label className="relative inline-flex shrink-0 items-center gap-1 text-footnote text-[var(--color-text-tertiary)]">
      {ru ? "Сортировка:" : "Sort:"}
      <select
        value={current}
        onChange={(e) => router.push(href(e.target.value as SortKey), { scroll: false })}
        className="appearance-none bg-transparent py-1 pr-5 font-medium text-[var(--color-text-secondary)] outline-none transition-colors hover:text-[var(--color-text-primary)]"
      >
        {OPTIONS.map((o) => (
          <option key={o.key} value={o.key}>{ru ? o.ru : o.en}</option>
        ))}
      </select>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="pointer-events-none absolute right-0 text-[var(--color-text-tertiary)]"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </label>
  );
}
