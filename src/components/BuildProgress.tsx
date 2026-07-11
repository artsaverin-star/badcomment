import { BUILD_ICONS } from "./BuildIcons";

// The builder path's shared progress shell: all seven steps visible from the
// very first screen (Duolingo-style), so the user always sees the whole road.
// Icons are animated SVGs (no emoji); only the ACTIVE step animates — a row of
// seven looping icons would read as noise. Server-safe when no onStep given;
// inside the client wizard onStep makes visited steps clickable.

export const BUILD_STEPS_RU = ["Ниша", "Боль", "Решение", "Конкуренты", "Кто платит", "Имя и ASO", "План"];
export const BUILD_STEPS_EN = ["Niche", "Pain", "Solution", "Competitors", "Who pays", "Name & ASO", "Plan"];

export default function BuildProgress({
  active,
  doneCount,
  ru,
  sticky = true,
  onStep,
}: {
  active: number;
  doneCount: number;
  ru: boolean;
  sticky?: boolean;
  onStep?: (i: number) => void;
}) {
  const steps = ru ? BUILD_STEPS_RU : BUILD_STEPS_EN;
  const progress = Math.round((doneCount / steps.length) * 100);
  return (
    <div className={`z-20 -mx-1 rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-1 py-3 backdrop-blur-xl ${sticky ? "sticky top-16 sm:top-20" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
          <div className="h-full rounded-full bg-[var(--color-accent-brand)] transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%` }} />
        </div>
        <span className="text-footnote font-bold tabular-nums text-[var(--color-text-secondary)]">{progress}%</span>
      </div>
      <div className="mt-2.5 flex justify-between">
        {steps.map((s, i) => {
          const Icon = BUILD_ICONS[i];
          const clickable = !!onStep && i <= doneCount && i !== active;
          const inner = (
            <>
              <span className={`flex size-9 items-center justify-center rounded-full transition-all ${i === active ? "scale-110 bg-[var(--color-surface-card)] shadow-[0_4px_14px_-4px_rgba(18,18,22,0.25)] ring-1 ring-[var(--color-border-subtle)]" : i < doneCount ? "bg-[#30d158]/15" : "bg-[var(--color-bg-muted)] opacity-55 grayscale"}`}>
                {i < doneCount && i !== active
                  ? <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[#1f9d47]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  : i === active
                    ? <Icon size={20} />
                    : <span className="pointer-events-none [&_*]:!animate-none"><Icon size={18} /></span>}
              </span>
              <span className={`hidden truncate text-caption sm:block ${i === active ? "font-bold text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{s}</span>
            </>
          );
          return clickable ? (
            <button key={i} type="button" onClick={() => onStep!(i)} className="flex min-w-0 cursor-pointer flex-col items-center gap-1 transition-opacity hover:opacity-75" aria-label={s}>
              {inner}
            </button>
          ) : (
            <div key={i} className="flex min-w-0 flex-col items-center gap-1">{inner}</div>
          );
        })}
      </div>
    </div>
  );
}
