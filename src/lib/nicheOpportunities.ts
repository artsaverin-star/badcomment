import data from "@/data/niche-opportunities.json";

// Regenerated, founder-facing opportunity theses per category. Each parallels an
// idea in ideas.json (joined by `src` === original idea title) and sharpens it
// into a McKinsey-grade thesis: who it's for, the wedge (the structural gap +
// "so what" / why incumbents won't fix it), what to build, and a niche-aware
// monetization. The original idea keeps its real evidence (quotes, apps, stats);
// this overlay only overrides the narrative. Categories without an entry fall
// back to the raw ideas.json content.
export type NicheOpportunity = {
  src: string;
  title: string;
  tagline: string;
  forWhom: string;
  wedge: string;
  build: string;
  features: string[];
  monetization: string;
};

export function getNicheOpportunities(slug: string): NicheOpportunity[] {
  return (data as Record<string, NicheOpportunity[]>)[slug] ?? [];
}

export function getNicheOpportunity(slug: string, srcTitle: string): NicheOpportunity | null {
  return getNicheOpportunities(slug).find((o) => o.src === srcTitle) ?? null;
}
