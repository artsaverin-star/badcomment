// The brand logo. `LogoMark` is the gradient square + white star (theme-neutral —
// it carries its own colours). `Logo` is the full lock-up: mark + the ultra-bold
// `inApp` wordmark, which paints with --color-text-primary so it reads on both
// dark and light backgrounds. Use `Logo` everywhere the brand appears.

const STAR = "M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";

export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="inAppGrad" x1="2" y1="46" x2="46" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFA62B" />
          <stop offset="0.35" stopColor="#FF5C8A" />
          <stop offset="0.66" stopColor="#B14DEA" />
          <stop offset="1" stopColor="#4CB8F5" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#inAppGrad)" />
      <path d={STAR} fill="#fff" transform="translate(24 24) scale(1.35) translate(-12 -12)" />
    </svg>
  );
}

export default function Logo({
  className = "",
  iconSize = 26,
  textClassName = "text-[20px]",
}: {
  className?: string;
  iconSize?: number;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark size={iconSize} />
      <span
        className={`select-none font-black leading-none tracking-[-0.045em] text-[var(--color-text-primary)] [font-family:var(--brand-font-family)] ${textClassName}`}
        style={{ fontWeight: 900 }}
      >
        inApp
      </span>
    </span>
  );
}
