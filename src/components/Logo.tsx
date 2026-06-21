// The single brand logo — a text-only wordmark, no icon. Ultra-bold (900) and
// theme-adaptive: it paints with --color-text-primary, so it reads on both dark
// and light backgrounds. Use this everywhere the brand appears.
export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      className={`select-none font-black leading-none tracking-[-0.045em] text-[var(--color-text-primary)] [font-family:var(--brand-font-family)] ${className}`}
      style={{ fontWeight: 900 }}
    >
      inApp
    </span>
  );
}
