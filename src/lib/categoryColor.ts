// A distinct accent pair per category, used for the hero glow so every niche
// reads with its own colour. Two hues per category give the glow a soft mesh
// feel (like a frosted gradient), not a flat blob.
const COLORS: Record<string, { from: string; to: string }> = {
  sobriety: { from: "#a855f7", to: "#6366f1" }, // violet → indigo
  "habit-tracking": { from: "#34d399", to: "#14b8a6" }, // emerald → teal
  "period-cycle": { from: "#fb7185", to: "#ec4899" }, // rose → pink
  "personal-finance": { from: "#2dd4bf", to: "#0ea5e9" }, // teal → sky
  "nutrition-calories": { from: "#a3e635", to: "#f59e0b" }, // lime → amber
  "kids-learning": { from: "#38bdf8", to: "#6366f1" }, // sky → indigo
  "calendars-tasks": { from: "#818cf8", to: "#8b5cf6" }, // indigo → violet
  "notes-pkm": { from: "#22d3ee", to: "#3b82f6" }, // cyan → blue
  "time-tracking": { from: "#fb923c", to: "#ef4444" }, // orange → red
};

export function getCategoryColor(slug: string): { from: string; to: string } {
  return COLORS[slug] ?? { from: "var(--color-accent-brand)", to: "var(--color-accent-brand)" };
}
