"use client";

import { useMemo, useState } from "react";
import type { NichePattern } from "@/lib/reviews";
import { plural } from "@/lib/format";

const polarityLabel = {
  love: { ru: "В основном хвалят", en: "Mostly praised", shortRu: "Хвалят", shortEn: "Praised", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  pain: { ru: "В основном критикуют", en: "Mostly criticised", shortRu: "Критикуют", shortEn: "Criticised", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  mixed: { ru: "Мнения расходятся", en: "Opinions differ", shortRu: "Смешанные", shortEn: "Mixed", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
} as const;

type PatternFilter = "all" | "love" | "pain" | "mixed";

export default function NichePatternList({ patterns, ru }: { patterns: NichePattern[]; ru: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<PatternFilter>("all");
  const lc = ru ? "ru-RU" : "en-US";
  const visible = useMemo(() => (filter === "all" ? patterns : patterns.filter((pattern) => pattern.polarity === filter)), [filter, patterns]);
  const filters: { id: PatternFilter; label: string; count: number }[] = [
    { id: "all", label: ru ? "Все" : "All", count: patterns.length },
    ...(["love", "pain", "mixed"] as const).map((id) => ({
      id,
      label: ru ? polarityLabel[id].shortRu : polarityLabel[id].shortEn,
      count: patterns.filter((pattern) => pattern.polarity === id).length,
    })),
  ];

  return (
    <section className="mt-10" aria-labelledby="niche-patterns-heading">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-caption uppercase tracking-[0.12em] text-[var(--color-text-tertiary)]">
            {ru ? "Через всю нишу" : "Across the niche"}
          </p>
          <h2 id="niche-patterns-heading" className="mt-1 text-title2 text-[var(--color-text-primary)]">
            {ru ? "Что повторяется у разных приложений" : "What repeats across different apps"}
          </h2>
        </div>
        <span aria-live="polite" className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
          {visible.length} {ru ? plural(visible.length, "паттерн", "паттерна", "паттернов") : visible.length === 1 ? "pattern" : "patterns"}
        </span>
      </div>
      <p className="mt-2 max-w-[68ch] text-footnote text-[var(--color-text-secondary)]">
        {ru
          ? "Это отдельный уровень анализа: каждый сюжет подтверждён минимум 8 сигналами и встречается минимум у 3 конкурентов. Сигналы могут пересекаться и не являются долей рынка."
          : "This is a separate analysis layer: every story has at least 8 signals and appears across at least 3 competitors. Signals may overlap and do not represent market share."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2" aria-label={ru ? "Направление паттерна" : "Pattern direction"}>
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => {
              setFilter(item.id);
              setOpen(null);
            }}
            className={`rounded-full border px-3 py-1.5 text-caption transition-colors ${filter === item.id ? "border-transparent bg-[var(--color-text-primary)] text-[var(--color-bg-page)]" : "border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"}`}
          >
            {item.label} <span className="ml-1 tabular-nums opacity-60">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {visible.map((pattern, index) => {
          const id = `${pattern.polarity}-${pattern.title}`;
          const panelId = `pattern-evidence-${filter}-${index}`;
          const expanded = open === id;
          const tone = polarityLabel[pattern.polarity];
          const title = ru ? pattern.title : pattern.titleEn || pattern.title;
          const plus = ru ? pattern.plus : pattern.plusEn || pattern.plus;
          const minus = ru ? pattern.minus : pattern.minusEn || pattern.minus;
          return (
            <article key={id} className="card-min overflow-hidden rounded-2xl">
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : id)}
                className="w-full p-4 text-left sm:p-5"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone.className}`}>
                    {ru ? tone.ru : tone.en}
                  </span>
                  <span className="text-caption tabular-nums text-[var(--color-text-tertiary)]">
                    {pattern.count
                      ? `${pattern.count.toLocaleString(lc)} ${ru ? plural(pattern.count, "сигнал", "сигнала", "сигналов") : pattern.count === 1 ? "signal" : "signals"}`
                      : pattern.apps.length
                        ? `${pattern.apps.length} ${ru ? "прил." : pattern.apps.length === 1 ? "app" : "apps"}`
                        : ""}
                  </span>
                </span>
                <h3 className="mt-3 text-headline leading-snug text-[var(--color-text-primary)]">{title}</h3>
                {pattern.apps.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-caption text-[var(--color-text-tertiary)]">{pattern.apps.join(" · ")}</p>
                )}
                <span className="mt-3 inline-block text-caption font-medium text-[var(--color-text-secondary)]">
                  {expanded ? (ru ? "Свернуть ↑" : "Collapse ↑") : (ru ? "Показать доказательства ↓" : "Show evidence ↓")}
                </span>
              </button>

              {expanded && (
                <div id={panelId} className="border-t border-[var(--color-border-subtle)] px-4 pb-5 pt-4 sm:px-5">
                  {plus && <div><p className="text-caption font-semibold uppercase tracking-[0.08em] text-emerald-600 dark:text-emerald-400">{ru ? "Ценность" : "Value"}</p><p className="mt-1 text-footnote leading-relaxed text-[var(--color-text-secondary)]">{plus}</p></div>}
                  {minus && <div className={plus ? "mt-4" : ""}><p className="text-caption font-semibold uppercase tracking-[0.08em] text-rose-600 dark:text-rose-400">{ru ? "Риск" : "Risk"}</p><p className="mt-1 text-footnote leading-relaxed text-[var(--color-text-secondary)]">{minus}</p></div>}
                  {pattern.evidence.length > 0 && (
                    <div className="mt-5">
                      <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{ru ? "Цитаты из корпуса" : "Corpus quotes"}</p>
                      <ul className="mt-3 space-y-3">
                      {pattern.evidence.map((evidence, evidenceIndex) => (
                        <li key={`${evidence.app}-${evidenceIndex}`} className="border-l-2 border-[var(--color-border-strong)] pl-3">
                          <blockquote className="text-footnote leading-relaxed text-[var(--color-text-primary)]">“{evidence.quote}”</blockquote>
                          <p className="mt-1 text-caption text-[var(--color-text-tertiary)]">
                            {evidence.app}{evidence.rating > 0 ? ` · ${evidence.rating}/5` : ""}
                          </p>
                        </li>
                      ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
