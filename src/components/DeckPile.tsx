import type React from "react";

// A locked pack shown as a compact stack of cards (a couple peek out behind the
// front one) with one unlock CTA — replaces long blurred lists. The front card
// carries a category-accent glow + a shimmering gradient edge ("переливание").
// Presentational only (no hooks) so it works in both server and client trees.
export default function DeckPile({
  accent,
  big,
  title,
  subtitle,
  button,
}: {
  accent: string;
  big: string;
  title: string;
  subtitle: string;
  button: React.ReactNode;
}) {
  return (
    <div className="mt-10 flex justify-center" style={{ ["--ec"]: accent } as React.CSSProperties}>
      <div className="pile relative w-full max-w-[460px]">
        <div className="pile-peek pile-peek-2" aria-hidden />
        <div className="pile-peek pile-peek-1" aria-hidden />
        <div className="edge-glow blueprint relative z-10 overflow-hidden rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-7 py-8 text-center shadow-[0_30px_70px_-34px_rgba(0,0,0,0.85)]">
          {/* soft accent bloom behind the number */}
          <div
            className="pointer-events-none absolute -top-20 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full opacity-40 blur-[60px]"
            style={{ background: accent }}
            aria-hidden
          />
          <div className="relative flex items-end justify-center gap-2.5">
            <span className="text-[64px] font-black leading-[0.82] tracking-[-0.045em] text-[var(--color-text-primary)]">{big}</span>
            <span className="mb-1.5 text-[19px] font-bold leading-[1.1] text-[var(--color-text-primary)] text-balance">{title}</span>
          </div>
          <p className="relative mx-auto mt-4 max-w-[36ch] text-[14.5px] leading-[1.55] text-[var(--color-text-secondary)]">{subtitle}</p>
          <div className="relative mt-6 flex justify-center">{button}</div>
        </div>
      </div>
    </div>
  );
}
