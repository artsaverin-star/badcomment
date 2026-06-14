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
    <details open className="no-anim group/sec">
      <summary
        onClick={keepInView}
        className="-mx-3 flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-[var(--color-surface-card-subtle)] [&::-webkit-details-marker]:hidden"
      >
        <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">{heading}</h3>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-transform group-open/sec:rotate-90">
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      {children}
    </details>
  );
}
