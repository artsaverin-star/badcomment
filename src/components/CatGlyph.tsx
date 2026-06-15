// Filled domain glyph for category cards (landing + catalog). Solid shapes
// (fill) read better at small sizes than outlines.
const PATHS: Record<string, string> = {
  "sleep-meditation": "M13.5 2a10 10 0 1 0 8.5 13.5A8 8 0 0 1 13.5 2Z",
  "mind-self-help": "M12 21s-6.7-4.3-9.2-8.6A5.2 5.2 0 0 1 12 6.5a5.2 5.2 0 0 1 9.2 5.9C18.7 16.7 12 21 12 21Z",
  "women-family": "M12 2a4.2 4.2 0 0 0-1 8.3V13H9v2h2v2h2v-2h2v-2h-2v-2.7A4.2 4.2 0 0 0 12 2Z",
  "fitness-nutrition": "M12 2c1.6 3 4.5 4.6 4.5 8.2A4.5 4.5 0 1 1 7.5 10C7.5 6.7 10.4 5.2 12 2Z",
  learning: "M12 3 1.5 8 12 13l8.5-4.05V14H22V8L12 3ZM5 12.2V15c0 1.7 3.1 3 7 3s7-1.3 7-3v-2.8l-7 3.3-7-3.3Z",
  productivity:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.2-3.8-3.8 1.6-1.6 2.2 2.2 4.8-4.8 1.6 1.6-6.4 6.4Z",
  "reading-podcasts": "M12 5C9.8 3.6 6.4 3.4 4 4v13c2.4-.6 5.8-.4 8 1V5Zm0 0v13c2.2-1.4 5.6-1.6 8-1V4c-2.4-.6-5.8-.4-8 1Z",
  "media-streaming": "M8 5.5v13l11-6.5L8 5.5Z",
  "photo-video": "M9 3l-1.2 2H4.5A2.5 2.5 0 0 0 2 7.5v10A2.5 2.5 0 0 0 4.5 20h15a2.5 2.5 0 0 0 2.5-2.5v-10A2.5 2.5 0 0 0 19.5 5h-3.3L15 3H9Zm3 5a4 4 0 1 1 0 8 4 4 0 0 1 0-8Z",
  "ai-tools": "M12 2l2 6.5L20.5 11 14 13.5 12 20l-2-6.5L3.5 11 10 8.5 12 2Z",
  "travel-places": "M12 2a6.5 6.5 0 0 0-6.5 6.5c0 4.7 6.5 13 6.5 13s6.5-8.3 6.5-13A6.5 6.5 0 0 0 12 2Zm0 9a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z",
  money:
    "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm9 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  "hobbies-lifestyle": "M12 2l2.9 6 6.6.6-5 4.3 1.5 6.5L12 16l-6 3.4L7.5 13l-5-4.3L9.1 8 12 2Z",
};

export default function CatGlyph({ domain, size = 20 }: { domain?: string; size?: number }) {
  const d = (domain && PATHS[domain]) || "";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="shrink-0">
      {d ? (
        <path d={d} />
      ) : (
        <>
          <rect x="3" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="3" y="14" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </>
      )}
    </svg>
  );
}
