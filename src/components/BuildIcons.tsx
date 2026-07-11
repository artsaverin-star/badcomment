// Animated SVG icons for the builder path — the Duolingo-style replacement for
// emoji. Each is a small transform-only CSS loop (classes in globals.css),
// colored, cartoon-friendly, cheap to render in rows.

export function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <path className="flame-outer" fill="#ff9500" d="M12 2.4c.5 3-.8 4.7-2.4 6.3C8 10.3 6.4 12 6.4 14.8a5.6 5.6 0 0011.2 0c0-1.8-.7-3.3-1.7-4.8-.5.9-1.2 1.6-2.1 2 .7-3.2-.3-6.4-1.8-9.6z" />
      <path className="flame-inner" fill="#ffcc00" d="M13.1 10.2c.2 1.9-.7 2.9-1.7 3.9-.8.8-1.5 1.6-1.5 2.9a3.1 3.1 0 006.2 0c0-1.1-.5-2-1.1-3-.6-1-1.4-2.2-1.9-3.8z" />
    </svg>
  );
}

export function CompassIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <circle cx="12" cy="12" r="9.2" stroke="#0a84ff" strokeWidth="2" />
      <path className="bi-sway" fill="#0a84ff" d="M15.8 8.2l-2.6 5.7-5 2 2.5-5.7 5.1-2z" />
      <circle cx="12" cy="12" r="1.3" fill="#fff" />
    </svg>
  );
}

export function BulbIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <circle className="bi-glow" cx="12" cy="10" r="8" fill="#ffcc00" opacity="0.25" />
      <path fill="#ffb340" d="M12 3a6.2 6.2 0 00-4.1 10.9c.7.7 1 1.2 1 2.4h6.2c0-1.2.3-1.7 1-2.4A6.2 6.2 0 0012 3z" />
      <rect x="9.6" y="17.4" width="4.8" height="1.7" rx="0.85" fill="#c98a2e" />
      <rect x="10.2" y="19.7" width="3.6" height="1.5" rx="0.75" fill="#c98a2e" />
    </svg>
  );
}

export function CoinIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <g className="bi-bounce">
        <circle cx="12" cy="12" r="8.5" fill="#ffcc00" />
        <circle cx="12" cy="12" r="8.5" stroke="#e0a800" strokeWidth="1.6" />
        <path d="M12 7.4v9.2M9.3 9.7c0-1.1 1.2-1.8 2.7-1.8s2.7.7 2.7 1.8c0 2.9-5.4 1.7-5.4 4.6 0 1.1 1.2 1.8 2.7 1.8s2.7-.7 2.7-1.8" stroke="#a87b00" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

export function SearchAnimIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <g className="bi-scan">
        <circle cx="10.5" cy="10.5" r="6.2" stroke="#0a84ff" strokeWidth="2.2" fill="#0a84ff14" />
        <path d="m18.6 18.6-3.5-3.5" stroke="#0a84ff" strokeWidth="2.2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function PaletteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <g className="bi-hover">
        <path fill="#b14dea" d="M12 3a9 9 0 100 18c1.3 0 2-.8 2-1.8 0-.6-.3-1-.6-1.4-.3-.4-.6-.8-.6-1.4 0-1 .8-1.8 1.9-1.8H16A5.1 5.1 0 0021 9.7C20.6 5.9 16.7 3 12 3z" />
        <circle cx="8" cy="9" r="1.3" fill="#ffd60a" />
        <circle cx="12" cy="7" r="1.3" fill="#ff453a" />
        <circle cx="16" cy="9" r="1.3" fill="#30d158" />
        <circle cx="7.5" cy="13.5" r="1.3" fill="#0a84ff" />
      </g>
    </svg>
  );
}

export function CodeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <rect x="2.6" y="4.4" width="18.8" height="15.2" rx="3" fill="#1c1c22" />
      <path d="M8.6 9.4 6 12l2.6 2.6M15.4 9.4 18 12l-2.6 2.6" stroke="#30d158" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <rect className="bi-blink" x="11.2" y="9" width="1.6" height="6" rx="0.8" fill="#30d158" />
    </svg>
  );
}

export function RocketIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <g className="bi-hover">
        <path fill="#0a84ff" d="M12 2.6c2.9 1.6 4.6 4.7 4.6 8.3 0 1.6-.3 3.1-.8 4.4h-7.6a11.7 11.7 0 01-.8-4.4c0-3.6 1.7-6.7 4.6-8.3z" />
        <circle cx="12" cy="9.4" r="1.9" fill="#fff" />
        <path fill="#ff9500" d="M8.2 15.3l-2.5 3.4 3.4-.8zM15.8 15.3l2.5 3.4-3.4-.8z" />
      </g>
      <path className="flame-inner" fill="#ffcc00" d="M12 16.2c.9 1 1.4 1.9 1.4 3 0 1-.6 1.9-1.4 2.4-.8-.5-1.4-1.4-1.4-2.4 0-1.1.5-2 1.4-3z" />
    </svg>
  );
}

export function SwordsIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="overflow-visible">
      <g className="bi-sway">
        <path d="M5 5l9.5 9.5" stroke="#8e8e93" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M19 5 9.5 14.5" stroke="#ff6482" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M13.5 16.5 16.5 19.5M7.5 16.5 4.5 19.5" stroke="#c98a2e" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M12 15 15 18M12 15 9 18" stroke="#c98a2e" strokeWidth="0" />
      </g>
    </svg>
  );
}

// Ordered per builder step: ниша, боль, решение, конкуренты, кто платит,
// имя и ASO, план. Palette/Code/Rocket also serve the result-page work items.
export const BUILD_ICONS = [CompassIcon, FlameIcon, BulbIcon, SwordsIcon, CoinIcon, SearchAnimIcon, RocketIcon];
