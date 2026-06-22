import type React from "react";

// A locked pack shown as a small stack of cards (a couple peek behind) with one
// unlock CTA. Clean, Apple-style frosted glass — minimal copy, no ornament.
// Presentational only (no hooks) so it works in both server and client trees.
export default function DeckPile({
  title,
  subtitle,
  button,
  icons,
}: {
  title: string;
  subtitle: string;
  button: React.ReactNode;
  icons?: (string | null)[];
}) {
  return (
    <div className="mt-10 flex justify-center">
      <div className="pile relative w-full max-w-[420px]">
        <div className="pile-peek pile-peek-2" aria-hidden />
        <div className="pile-peek pile-peek-1" aria-hidden />
        <div className="relative z-10 rounded-[26px] border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] px-7 py-9 text-center shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          {icons && icons.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center justify-center gap-1.5">
              {icons.slice(0, 10).map((ic, i) =>
                ic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={ic} alt="" loading="lazy" decoding="async" className="size-9 rounded-[9px] border border-[var(--color-border-subtle)] object-cover" />
                ) : (
                  <div key={i} className="size-9 rounded-[9px] bg-[var(--color-bg-muted)]" />
                ),
              )}
            </div>
          )}
          <h3 className="text-[24px] font-bold leading-[1.18] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[26px]">{title}</h3>
          <p className="mx-auto mt-3 max-w-[30ch] text-[14.5px] leading-[1.5] text-[var(--color-text-tertiary)]">{subtitle}</p>
          <div className="mt-7 flex justify-center">{button}</div>
        </div>
      </div>
    </div>
  );
}
