// The builder path's shared progress shell: all eight steps visible from the
// very first screen (Duolingo-style), so the user always sees the whole road.
// Pure render — usable from server pages and the client wizard alike.

export const BUILD_STEPS_RU = ["Ниша", "Боль", "Решение", "Кто платит", "Имя и ASO", "Дизайн", "Код", "Запуск"];
export const BUILD_STEPS_EN = ["Niche", "Pain", "Solution", "Who pays", "Name & ASO", "Design", "Code", "Launch"];
export const BUILD_EMOJI = ["🧭", "🔥", "💡", "💸", "🔎", "🎨", "🧑‍💻", "🚀"];

export default function BuildProgress({ active, doneCount, ru }: { active: number; doneCount: number; ru: boolean }) {
  const steps = ru ? BUILD_STEPS_RU : BUILD_STEPS_EN;
  const progress = Math.round((doneCount / steps.length) * 100);
  return (
    <div className="sticky top-16 z-20 -mx-1 rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-1 py-3 backdrop-blur-xl sm:top-20">
      <div className="flex items-center gap-3">
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
          <div className="h-full rounded-full bg-[var(--color-accent-brand)] transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%` }} />
        </div>
        <span className="text-footnote font-bold tabular-nums text-[var(--color-text-secondary)]">{progress}%</span>
      </div>
      <div className="mt-2.5 flex justify-between">
        {steps.map((s, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center gap-1">
            <span className={`flex size-8 items-center justify-center rounded-full text-[15px] transition-all ${i === active ? "scale-110 bg-[var(--color-text-primary)]" : i < doneCount ? "bg-[#30d158]/15" : "bg-[var(--color-bg-muted)]"}`}>
              {i < doneCount && i !== active ? "✓" : BUILD_EMOJI[i]}
            </span>
            <span className={`hidden truncate text-caption sm:block ${i === active ? "font-bold text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
