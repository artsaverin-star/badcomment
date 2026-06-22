// Filled lightning bolt — SF-Symbols-style (bolt.fill). Inherits text colour via
// currentColor, so it picks up the brand/accent colour wherever it's placed.
// Replaces the ⚡ emoji used for the energy balance across the UI.
export default function BoltIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.12em" }}
    >
      <path d="M11.983 1.907a.75.75 0 0 0-1.292-.657l-8.5 9.5A.75.75 0 0 0 2.75 12h6.572l-1.305 6.093a.75.75 0 0 0 1.292.657l8.5-9.5A.75.75 0 0 0 18.25 8h-6.572l1.305-6.093Z" />
    </svg>
  );
}
