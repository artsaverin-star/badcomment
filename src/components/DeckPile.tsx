import type React from "react";

// A locked pack shown as a stack of cards (a couple peek behind) with one unlock
// CTA. Clean, Apple-style frosted glass — full content width, left-aligned. The
// lead-in copy (and, for apps, the niche thesis + app icons) lives INSIDE the card.
// Presentational only (no hooks) so it works in both server and client trees.
export default function DeckPile({
  title,
  subtitle,
  body,
  button,
  icons,
}: {
  title: string;
  subtitle?: string;
  body?: string;
  button: React.ReactNode;
  icons?: (string | null)[];
}) {
  return (
    <div className="mt-8">
      <div className="pile relative w-full">
        <div className="pile-peek pile-peek-2" aria-hidden />
        <div className="pile-peek pile-peek-1" aria-hidden />
        <div className="relative z-10 rounded-[26px] border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-surface-card)_80%,transparent)] px-6 py-8 shadow-[0_30px_70px_-40px_rgba(0,0,0,0.85)] backdrop-blur-xl sm:px-9 sm:py-10">
          {icons && icons.length > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              {icons.slice(0, 12).map((ic, i) =>
                ic ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={ic} alt="" loading="lazy" decoding="async" className="size-9 rounded-[9px] border border-[var(--color-border-subtle)] object-cover" />
                ) : (
                  <div key={i} className="size-9 rounded-[9px] bg-[var(--color-bg-muted)]" />
                ),
              )}
            </div>
          )}
          <h3 className="text-[23px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[26px]">{title}</h3>
          {body && <p className="mt-3.5 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[16px]">{body}</p>}
          {subtitle && <p className="mt-2.5 max-w-[52ch] text-[14.5px] leading-[1.5] text-[var(--color-text-tertiary)]">{subtitle}</p>}
          <div className="mt-7 flex">{button}</div>
        </div>
      </div>
    </div>
  );
}
