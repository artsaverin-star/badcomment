"use client";

import { useState, type ReactNode } from "react";

// Apple-style segmented control switching the category page between its
// cross-app synthesis ("Саммари") and its review-derived ideas ("Идеи").
// Shows the bar only when both panels exist; a single panel renders bare.
export default function SegmentTabs({
  summary,
  ideas,
  ideasCount,
}: {
  summary: ReactNode | null;
  ideas: ReactNode | null;
  ideasCount: number;
}) {
  const tabs = [
    summary ? { key: "summary", label: "Саммари", node: summary } : null,
    ideas && ideasCount > 0
      ? { key: "ideas", label: `Идеи · ${ideasCount}`, node: ideas }
      : null,
  ].filter(Boolean) as { key: string; label: string; node: ReactNode }[];

  const [active, setActive] = useState(tabs[0]?.key ?? "summary");

  if (tabs.length === 0) return null;
  if (tabs.length === 1) return <div>{tabs[0].node}</div>;

  const current = tabs.find((tb) => tb.key === active) ?? tabs[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Разделы категории"
        className="inline-flex gap-1 rounded-full bg-[var(--color-bg-muted)] p-1"
      >
        {tabs.map((tb) => {
          const on = tb.key === active;
          return (
            <button
              key={tb.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setActive(tb.key)}
              className={`rounded-full px-4 py-1.5 text-callout font-semibold transition-colors ${
                on
                  ? "bg-[var(--color-surface-card)] text-[var(--color-text-primary)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                  : "text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {tb.label}
            </button>
          );
        })}
      </div>
      <div className="mt-7">{current.node}</div>
    </div>
  );
}
