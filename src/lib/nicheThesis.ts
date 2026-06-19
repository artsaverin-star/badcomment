import data from "@/data/niche-thesis.json";
import dataEn from "@/data/niche-thesis.en.json";
import type { Locale } from "@/lib/i18n";

// McKinsey-style overview per category: one governing thought (answer-first),
// then 3 MECE pillars with action titles. The `match` keywords route the
// category breakdown cards under the right pillar (language-specific — the EN
// overlay carries English keywords that route the English cards). Authored per
// category; categories without an entry fall back to a flat breakdown.
export type NichePillar = { title: string; dek: string; match: string[] };
export type NicheThesis = { governing: string; pillars: NichePillar[]; competitorRead?: string };

export function getNicheThesis(slug: string, locale: Locale = "ru"): NicheThesis | null {
  if (locale === "en") {
    const en = (dataEn as Record<string, NicheThesis>)[slug];
    if (en) return en;
  }
  return (data as Record<string, NicheThesis>)[slug] ?? null;
}
