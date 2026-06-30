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
  score?: number; // critic-assigned strength (demand/uniqueness/virality/buildability)
};

const ideas = ideasData as Idea[];

// Single source of truth for "this niche is published": the ULTRA tier — the 29
// niches rebuilt on the full people's-rating dataset (rating + dossier + ideas).
// The homepage, the /rating list and these ideas all key off the same set, so
// the three surfaces always show the exact same niches. Legacy slugs (older
// pre-ULTRA twins) are retired everywhere by virtue of not being in this set.
import { RATING_BY_SLUG } from "@/data/peoplesRating";
const PUBLISHED_CATEGORIES = new Set(Object.keys(RATING_BY_SLUG));

export function listIdeas(): Idea[] {
  // Best ideas first (critic score), then by validated demand.
  return ideas
    .filter((i) => PUBLISHED_CATEGORIES.has(i.category))
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.stats?.observations ?? 0) - (a.stats?.observations ?? 0));
}

export function getIdea(slug: string): Idea | null {
  return listIdeas().find((i) => i.slug === slug) ?? null;
}
