// Filled speech-bubble glyph (SF-Symbols-ish "message.fill") for the demand
// signal — how many times people mentioned a thing in reviews. Inherits text colour.
export default function MessageIcon({ className, size = 14 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      style={{ display: "inline-block", verticalAlign: "-0.14em" }}
    >
      <path d="M10 2c-4.418 0-8 2.91-8 6.5 0 1.66.846 3.17 2.225 4.318-.08.913-.42 1.73-.96 2.388-.214.262-.04.66.293.66 1.45 0 2.74-.474 3.778-1.26A9.06 9.06 0 0 0 10 15c4.418 0 8-2.91 8-6.5S14.418 2 10 2Z" />
    </svg>
  );
}
