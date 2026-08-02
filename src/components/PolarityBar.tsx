// One line that shows what the crowd actually feels: the share of an app's (or a
// niche's) reviews sitting under themes people love, hate, or are split on.
// Deliberately thin and quiet — it reads as a measurement, not a chart.

export const POLARITY_COLOR = { love: "#22c55e", pain: "#f97316", mixed: "#94a3b8" } as const;

export default function PolarityBar({
  split,
  className = "",
  height = 4,
}: {
  split: { lovePct: number; painPct: number; mixedPct: number };
  className?: string;
  height?: number;
}) {
  const parts: { key: keyof typeof POLARITY_COLOR; pct: number }[] = [
    { key: "love", pct: split.lovePct },
    { key: "mixed", pct: split.mixedPct },
    { key: "pain", pct: split.painPct },
  ];
  return (
    <div
      className={`flex w-full gap-0.5 overflow-hidden rounded-full ${className}`}
      style={{ height }}
      aria-hidden="true"
    >
      {parts
        .filter((p) => p.pct > 0)
        .map((p) => (
          <div key={p.key} style={{ width: `${p.pct}%`, backgroundColor: POLARITY_COLOR[p.key] }} />
        ))}
    </div>
  );
}
