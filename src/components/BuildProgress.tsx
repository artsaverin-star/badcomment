"use client";

import { useEffect, useState } from "react";
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
  // Как шапка: наверху страницы плашка крупная и без подложки, при скролле
  // сворачивается в компактную стеклянную пилюлю.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!sticky) return;
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [sticky]);
  const condensed = sticky && scrolled;
  return (
    <div className={`z-20 transition-all duration-300 ease-out ${sticky ? "sticky top-16 sm:top-20" : ""} ${condensed
      ? "mx-auto w-fit max-w-full overflow-x-auto rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] px-4 py-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      : "-mx-1 rounded-[26px] border border-transparent px-3 py-3 lg:-mx-16 lg:px-6 xl:-mx-24"}`}>
      <div className={`flex items-end justify-between ${condensed ? "gap-2.5 sm:gap-4" : ""}`}>
        {steps.map((s, i) => {
          const clickable = !!onStep && i <= doneCount && i !== active;
          const inner = (
            <>
              {i < doneCount && i !== active ? (
                <span className={`relative flex items-center justify-center self-center rounded-full bg-[var(--color-bg-muted)] transition-all duration-300 ease-out ${condensed ? "size-7" : "size-10 sm:size-12"}`}>
                  {STEP_IMG[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={STEP_IMG[i]!} alt="" loading="lazy" decoding="async" className={`object-contain transition-all duration-300 ease-out ${condensed ? "size-5" : "size-8 sm:size-9"}`} />
                    : <span className="text-[var(--color-text-secondary)]"><PeopleIcon size={condensed ? 14 : 20} /></span>}
                  <span className={`absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[#30d158] ring-2 ring-[var(--color-bg-page)] ${condensed ? "size-3" : "size-4"}`}>
                    <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="text-white"><path d="M3.5 8.5 6.5 11.5 12.5 4.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </span>
              ) : i === active ? (
                <span className={`relative flex items-center justify-center self-center rounded-full shadow-[0_10px_26px_-8px_rgba(0,0,0,0.45)] transition-all duration-300 ease-out ${condensed ? "size-7" : "size-16 sm:size-20"} ${STEP_GRADIENTS[i]}`}>
                  {STEP_IMG[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={STEP_IMG[i]!} alt="" className="absolute left-1/2 top-1/2 h-[135%] max-w-none -translate-x-1/2 -translate-y-1/2 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]" />
                    : <PeopleIcon size={condensed ? 20 : 34} stroke="#fff" />}
                </span>
              ) : (
                <span className={`flex items-center justify-center self-center rounded-full bg-[var(--color-bg-muted)] transition-all duration-300 ease-out ${condensed ? "size-7" : "size-10 sm:size-12"}`}>
                  {STEP_IMG[i]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={STEP_IMG[i]!} alt="" loading="lazy" decoding="async" className={`object-contain opacity-55 grayscale transition-all duration-300 ease-out ${condensed ? "size-5" : "size-8 sm:size-9"}`} />
                    : <span className="opacity-55 text-[var(--color-text-tertiary)]"><PeopleIcon size={condensed ? 14 : 20} /></span>}
                </span>
              )}
              <span className={`truncate text-caption ${i === active ? "block font-bold text-[var(--color-text-primary)]" : condensed ? "hidden" : "hidden text-[var(--color-text-tertiary)] sm:block"}`}>{s}</span>
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
