import data from "@/data/niche-opportunities.json";
import dataEn from "@/data/niche-opportunities.en.json";
import type { Locale } from "@/lib/i18n";

// Regenerated, founder-facing opportunity theses per category. Each parallels an
// idea (joined by `slug` === idea.slug) and sharpens it into a McKinsey-grade
// thesis: who it's for, the wedge (the gap + "so what" / why incumbents won't fix
// it), what to build, and a niche-aware monetization. The original idea keeps its
// real evidence (quotes, apps, stats); this overlay only overrides the narrative.
// The .en overlay carries the English translation. Categories/ideas without an
// entry fall back to the raw idea content.
export type NicheOpportunity = {
  slug: string;
  src?: string;
  title: string;
  tagline: string;
  forWhom: string;
  wedge: string;
  build: string;
  features: string[];
  monetization: string;
};

export function getNicheOpportunities(slug: string, locale: Locale = "ru"): NicheOpportunity[] {
  const src = locale === "en" ? (dataEn as Record<string, NicheOpportunity[]>) : (data as Record<string, NicheOpportunity[]>);
  return src[slug] ?? [];
}

export function getNicheOpportunity(slug: string, ideaSlug: string, locale: Locale = "ru"): NicheOpportunity | null {
  return getNicheOpportunities(slug, locale).find((o) => o.slug === ideaSlug) ?? null;
}
