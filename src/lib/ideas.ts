import ideasData from "@/data/ideas.json";

// Review-derived app ideas ("Идеи") — each one is built from the reviews of a
// whole catalog category and shows its derivation chain: a grid of verbatim
// review quotes → the recurring mechanisms they sum into → the gap → the
// pitch. Every count traces to real extracted observations; quotes are
// verbatim review substrings (same no-fabrication contract as insights).

export type IdeaQuote = {
  quote: string;
  rating: number;
  app: string;
};

export type IdeaMechanism = {
  title: string;
  obsCount: number;
  apps: string[];
  polarity: "pain" | "love";
};

export type Idea = {
  slug: string;
  category: string; // catalog category slug, links to /segment/<slug>
  categoryName: string;
  title: string;
  oneLiner: string;
  asOf: string;
  stats: { apps: number; reviews: number; observations: number };
  reviewGrid: IdeaQuote[];
  mechanisms: IdeaMechanism[];
  gap: string;
  idea: {
    pitch: string;
    features: string[];
    antiFeatures: string[];
    monetization: string;
  };
};

const ideas = ideasData as Idea[];

// An idea is publishable only while its category's synthesis is published —
// the synthesis gate (10 balanced разборы × 500 reviews each) is the single
// source of truth for "this category's data is complete". If a synthesis is
// withheld, the idea derived from the same data is withheld with it.
import segmentInsights from "@/data/segment-insights.json";
const PUBLISHED_CATEGORIES = new Set(Object.keys(segmentInsights as Record<string, unknown>));

export function listIdeas(): Idea[] {
  return ideas.filter((i) => PUBLISHED_CATEGORIES.has(i.category));
}

export function getIdea(slug: string): Idea | null {
  return listIdeas().find((i) => i.slug === slug) ?? null;
}
