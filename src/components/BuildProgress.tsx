import { STEP_IMG, STEP_GRADIENTS, PeopleIcon } from "./BuildIcons";

// The builder path's shared progress shell: all seven steps visible from the
// very first screen (Duolingo-style), so the user always sees the whole road.
// Icons are animated SVGs (no emoji); only the ACTIVE step animates — a row of
// seven looping icons would read as noise. Server-safe when no onStep given;
// inside the client wizard onStep makes visited steps clickable.

export const BUILD_STEPS_RU = ["Ниша", "Боль", "Решение", "Аудитория", "Конкуренты", "Кто платит", "Имя и ASO", "План"];
export const BUILD_STEPS_EN = ["Niche", "Pain", "Solution", "Audience", "Competitors", "Who pays", "Name & ASO", "Plan"];

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
    <div className={`z-20 -mx-1 rounded-[18px] bg-[color-mix(in_srgb,var(--color-bg-page)_94%,transparent)] px-1 py-3 backdrop-blur-xl ${sticky ? "sticky top-16 sm:top-20" : ""}`}>
      <div className="flex items-center gap-3">
        <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
          <div className="h-full rounded-full bg-[var(--color-accent-brand)] transition-all duration-500" style={{ width: `${Math.max(progress, 4)}%` }} />
        </div>
        <span className="text-footnote font-bold tabular-nums text-[var(--color-text-secondary)]">{Math.min(active + 1, steps.length)}/{steps.length}</span>
      </div>
      <div className="mt-2.5 flex justify-between">
        {steps.map((s, i) => {
          const clickable = !!onStep && i <= doneCount && i !== active;
          const inner = (
            <>
              {i < doneCount && i !== active ? (
                <span className="flex size-10 items-center justify-center self-center rounded-full bg-[#30d158]/15 sm:size-12">
                  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-[#1f9d47]"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              ) : i === active ? (
                <span className={`relative flex size-16 items-center justify-center self-center rounded-full shadow-[0_10px_26px_-8px_rgba(0,0,0,0.45)] sm:size-20 ${STEP_GRADIENTS[i]}`}>
                  {STEP_IMG[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={STEP_IMG[i]!} alt="" className="absolute left-1/2 top-1/2 h-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
                    : <PeopleIcon size={34} stroke="#fff" />}
                </span>
              ) : (
                <span className="flex size-10 items-center justify-center self-center rounded-full bg-[var(--color-bg-muted)] sm:size-12">
                  {STEP_IMG[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={STEP_IMG[i]!} alt="" loading="lazy" decoding="async" className="size-8 object-contain opacity-55 grayscale sm:size-9" />
                    : <span className="opacity-55 text-[var(--color-text-tertiary)]"><PeopleIcon size={20} /></span>}
                </span>
              )}
              <span className={`truncate text-caption ${i === active ? "block font-bold text-[var(--color-text-primary)]" : "hidden text-[var(--color-text-tertiary)] sm:block"}`}>{s}</span>
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
