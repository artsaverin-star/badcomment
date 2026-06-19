import data from "@/data/niche-thesis.json";

// McKinsey-style overview per category: one governing thought (answer-first),
// then 3 MECE pillars with action titles. The `match` keywords route the
// category breakdown cards under the right pillar. Authored per category;
// categories without an entry fall back to a flat breakdown.
export type NichePillar = { title: string; dek: string; match: string[] };
export type NicheThesis = { governing: string; pillars: NichePillar[]; competitorRead?: string };

export function getNicheThesis(slug: string): NicheThesis | null {
  return (data as Record<string, NicheThesis>)[slug] ?? null;
}
