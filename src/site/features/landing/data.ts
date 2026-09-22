import "server-only";

import { getCards, getCatalog, getManifest, getOnboarding, getResearch, getUI } from "@/site/content";
import type { Art, OnboardingArticle } from "@/site/content/types";
import { corpusSentence } from "@/site/content/text";
import type { Locale } from "@/site/i18n/locales";
import { FREE_CATEGORY, FREE_IDEAS } from "@/site/manifest.generated";

// Everything the landing shows, gathered on the server from the content packs (spec 08 §7:
// content blocks come from the same packs as the web app). PUBLIC-SAFE by construction:
//   • card copy (title/description) is read ONLY for the 5 free ideas; the paid idea next to
//     them is {slug, cover} (spec 04 §7.6, 09 G10) — no paid idea title ever enters the page;
//   • the free research article (interior-design) is open to everyone — only its part titles,
//     part art and counts are used;
//   • topic names and covers are public in the app catalog; the 5 onboarding excerpts are shown
//     to every app user (spec 09 §5 #13).

export type LandingTopic = { slug: string; name: string; cover: Art; free: boolean };

export type LandingIdea = { slug: string; title: string; description: string; cover: Art };

export type LandingNumbers = {
  topics: number;
  ideas: number;
  reviews: number;
  apps: number;
  languages: number;
  freeIdeas: number;
  archiveReviews: number;
  archiveApps: number;
};

export type LandingFreeTopic = {
  slug: string;
  name: string;
  summary: string;
  cover: Art;
  corpusSentence: string | null;
  parts: { title: string; art: Art | null }[];
  observations: number;
  ideaCount: number;
};

export type LandingData = {
  numbers: LandingNumbers;
  topics: LandingTopic[];
  freeTopic: LandingFreeTopic;
  freeIdeas: LandingIdea[];
  /** The first paid idea of the free topic: artwork only. */
  lockedIdea: { slug: string; cover: Art } | null;
  articles: OnboardingArticle[];
  /** Locale-independent illustrations (WelcomeReviews_v7, WelcomeLibrary_v7, …). */
  art: Record<string, Art>;
};

// A pure function of content files that only change with a deploy: build it once per locale
// in production (performance review P14). Dev rebuilds on every request so edits show up.
const memo = new Map<Locale, Promise<LandingData>>();

export function getLandingData(locale: Locale): Promise<LandingData> {
  if (process.env.NODE_ENV !== "production") return buildLandingData(locale);
  let data = memo.get(locale);
  if (!data) {
    data = buildLandingData(locale);
    memo.set(locale, data);
    data.catch(() => memo.delete(locale)); // a failed read must not stick
  }
  return data;
}

async function buildLandingData(locale: Locale): Promise<LandingData> {
  const [manifest, catalog, onboarding, cards, research, ui] = await Promise.all([
    getManifest(),
    getCatalog(locale),
    getOnboarding(locale),
    getCards(locale),
    getResearch(locale, FREE_CATEGORY),
    getUI(locale),
  ]);

  const freeIdeaSet = new Set<string>(FREE_IDEAS);
  const coverOf = new Map(catalog.ideas.map((i) => [i.slug, i.cover]));

  // Only the free layer's card copy leaves this function.
  const freeIdeas: LandingIdea[] = FREE_IDEAS.flatMap((slug) => {
    const card = cards.ideas[slug];
    const cover = coverOf.get(slug);
    return card && cover ? [{ slug, title: card.title, description: card.description, cover }] : [];
  });

  const paid = catalog.ideas
    .filter((i) => i.category === FREE_CATEGORY && !freeIdeaSet.has(i.slug))
    .sort((a, b) => Number(a.slug.split("-").pop()) - Number(b.slug.split("-").pop()))[0];
  const lockedIdea = paid ? { slug: paid.slug, cover: paid.cover } : null;

  const freeCat = catalog.categories.find((c) => c.slug === FREE_CATEGORY) ?? catalog.categories[0];
  const sections = research?.sections ?? [];
  const freeTopic: LandingFreeTopic = {
    slug: freeCat.slug,
    name: freeCat.name,
    summary: freeCat.summary,
    cover: freeCat.cover,
    corpusSentence: corpusSentence(freeCat.corpus, ui),
    parts: sections.map((s) => ({
      title: s.title,
      art: s.observations.find((o) => o.art)?.art ?? s.art ?? null,
    })),
    observations: sections.reduce((n, s) => n + s.observations.length, 0),
    ideaCount: freeCat.ideaCount,
  };

  const numbers: LandingNumbers = {
    topics: catalog.categories.length,
    ideas: catalog.ideas.length,
    reviews: catalog.categories.reduce((n, c) => n + (c.corpus?.reviews ?? 0), 0),
    apps: catalog.categories.reduce((n, c) => n + (c.corpus?.apps ?? 0), 0),
    languages: manifest.locales.length,
    freeIdeas: FREE_IDEAS.length,
    archiveReviews: manifest.corpus.reviews,
    archiveApps: manifest.corpus.apps,
  };

  return {
    numbers,
    topics: catalog.categories.map((c) => ({ slug: c.slug, name: c.name, cover: c.cover, free: c.free })),
    freeTopic,
    freeIdeas,
    lockedIdea,
    articles: onboarding.articles,
    art: manifest.art,
  };
}
