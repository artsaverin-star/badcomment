import segCards from "@/data/segment-cards.json";
import appCards from "@/data/app-cards.json";
import ideaCards from "@/data/idea-cards.json";
import type { Evidence } from "@/components/InsightCard";

// Regenerated, share-worthy insight cards (built offline by the regen workflow +
// scripts/regen-assemble.mjs). When a slug/productId is present here the page
// renders these; otherwise it falls back to the original synthesis.

export type RegenCard = {
  title: string;
  body?: string;
  plus?: string;
  minus?: string;
  count: number;
  apps?: string[];
  kicker?: string;
  evidence: Evidence[];
};
export type RegenSet = { product: RegenCard[]; hygiene: RegenCard[] };

export function categoryCards(slug: string): RegenSet | null {
  return (segCards as Record<string, RegenSet>)[slug] ?? null;
}
export function appCardsFor(productId: string): RegenSet | null {
  return (appCards as Record<string, RegenSet>)[productId] ?? null;
}
export function ideaCard(slug: string): { title?: string; oneLiner?: string } | null {
  return (ideaCards as Record<string, { title?: string; oneLiner?: string }>)[slug] ?? null;
}
