"use client";

// Shared collapsible section shell (heading + chevron-in-circle), used by both
// the category summary and the app page so sections look identical. Preserves
// scroll position on toggle so the page doesn't jump.
function keepInView(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const before = el.getBoundingClientRect().top;
  requestAnimationFrame(() => {
    const delta = el.getBoundingClientRect().top - before;
    if (delta) window.scrollBy(0, delta);
  });
}

export default function SectionDetails({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <details open className="no-anim group/sec overflow-hidden rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)]">
      <summary
        onClick={keepInView}
        className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-[var(--color-surface-card-subtle)] [&::-webkit-details-marker]:hidden"
      >
        <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">{heading}</h3>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/sec:rotate-90">
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="px-5 pb-2">{children}</div>
    </details>
  );
}
