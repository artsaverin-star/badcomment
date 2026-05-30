import { prisma } from "./prisma";
import { THEMES, LOVED_THEMES } from "./themes";
import { CATEGORIES, categoryLabel, categoryComplexity, complexityLabel } from "./categories";
import type { Store } from "./scrapers";

export type ThemeStat = { key: string; label: string; count: number };

function parseKeys(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function tally(arrays: string[], defs: { key: string; label: string }[]): ThemeStat[] {
  const counts = new Map<string, number>();
  for (const raw of arrays) for (const k of parseKeys(raw)) counts.set(k, (counts.get(k) ?? 0) + 1);
  return defs
    .map((t) => ({ key: t.key, label: t.label, count: counts.get(t.key) ?? 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
}

const countThemes = (arrays: string[]) => tally(arrays, THEMES);
const countLoved = (arrays: string[]) => tally(arrays, LOVED_THEMES);

function trimQuote(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export type CategoryOverview = {
  key: string;
  label: string;
  productCount: number;
  reviewCount: number;
};

// Homepage: every canonical category with how many products + negative
// reviews we've collected for it.
export async function getCategoriesOverview(): Promise<CategoryOverview[]> {
  const products = await prisma.product.findMany({
    where: { category: { not: null } },
    select: {
      category: true,
      listings: { select: { _count: { select: { reviews: true } } } },
    },
  });

  const productCount = new Map<string, number>();
  const reviewCount = new Map<string, number>();
  for (const p of products) {
    if (!p.category) continue;
    productCount.set(p.category, (productCount.get(p.category) ?? 0) + 1);
    const reviews = p.listings.reduce((sum, l) => sum + l._count.reviews, 0);
    reviewCount.set(p.category, (reviewCount.get(p.category) ?? 0) + reviews);
  }

  return CATEGORIES.map((c) => ({
    key: c.key,
    label: c.label,
    productCount: productCount.get(c.key) ?? 0,
    reviewCount: reviewCount.get(c.key) ?? 0,
  }));
}

export async function getGlobalThemeStats(): Promise<ThemeStat[]> {
  const rows = await prisma.review.findMany({ select: { themes: true } });
  return countThemes(rows.map((r) => r.themes));
}

export type ProductCard = {
  id: string;
  name: string;
  icon: string | null;
  developer: string | null;
  rank: number | null;
  stores: Store[];
  negativeCount: number;
  topThemes: ThemeStat[];
};

// Products inside one category, ranked, with cross-store presence and the
// leading complaint themes — the "where's the market gap" view.
export async function getCategoryProducts(key: string): Promise<ProductCard[]> {
  const products = await prisma.product.findMany({
    where: { category: key },
    orderBy: [{ rank: "asc" }, { name: "asc" }],
    include: {
      listings: {
        select: {
          store: true,
          reviews: { select: { themes: true } },
        },
      },
    },
  });

  return products.map((p) => {
    const stores = [...new Set(p.listings.map((l) => l.store as Store))];
    const allThemes = p.listings.flatMap((l) => l.reviews.map((r) => r.themes));
    return {
      id: p.id,
      name: p.name,
      icon: p.icon,
      developer: p.developer,
      rank: p.rank,
      stores,
      negativeCount: allThemes.length,
      topThemes: countThemes(allThemes).slice(0, 3),
    };
  });
}

export type StoreBreakdown = {
  store: Store;
  count: number;
  themeStats: ThemeStat[];
};

export type ReviewView = {
  id: string;
  store: Store;
  author: string | null;
  rating: number;
  title: string | null;
  text: string;
  postedAt: Date | null;
  themes: string[];
};

export type ProductDetail = {
  id: string;
  name: string;
  icon: string | null;
  developer: string | null;
  category: string | null;
  stores: Store[];
  totalNegative: number;
  themeStats: ThemeStat[];
  byStore: StoreBreakdown[];
  reviews: ReviewView[];
};

// Full cross-store view of one product: merged complaint themes, a per-store
// breakdown, and the combined negative-review stream from both stores.
export async function getProductDetail(id: string): Promise<ProductDetail | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      listings: {
        include: { reviews: { orderBy: { postedAt: "desc" } } },
      },
    },
  });
  if (!product) return null;

  const allReviews = product.listings.flatMap((l) =>
    l.reviews.map((r) => ({ ...r, store: l.store as Store }))
  );

  const byStore: StoreBreakdown[] = product.listings.map((l) => ({
    store: l.store as Store,
    count: l.reviews.length,
    themeStats: countThemes(l.reviews.map((r) => r.themes)),
  }));

  const reviews: ReviewView[] = allReviews
    .sort((a, b) => (b.postedAt?.getTime() ?? 0) - (a.postedAt?.getTime() ?? 0))
    .map((r) => ({
      id: r.id,
      store: r.store,
      author: r.author,
      rating: r.rating,
      title: r.title,
      text: r.text,
      postedAt: r.postedAt,
      themes: (() => {
        try {
          return JSON.parse(r.themes) as string[];
        } catch {
          return [];
        }
      })(),
    }));

  return {
    id: product.id,
    name: product.name,
    icon: product.icon,
    developer: product.developer,
    category: product.category,
    stores: [...new Set(product.listings.map((l) => l.store as Store))],
    totalNegative: allReviews.length,
    themeStats: countThemes(allReviews.map((r) => r.themes)),
    byStore,
    reviews,
  };
}

export type IdeaCard = {
  id: string;
  name: string;
  icon: string | null;
  developer: string | null;
  category: string | null;
  categoryLabel: string;
  rank: number | null;
  stores: Store[];
  score: number;
  complexity: number;
  complexityLabel: "Low" | "Medium" | "High";
  demandLabel: string;
  negativeCount: number;
  cons: ThemeStat[];
  conQuote: string | null;
  pros: ThemeStat[];
  proQuote: string | null;
};

const MIN_COMPLAINTS = 4; // skip apps without a clear, fixable pain signal

// Rank products as buildable opportunities: proven demand (store rank) times
// how much there is to fix (volume + how concentrated the top complaint is),
// divided by category build-complexity. Returns a deck for the swipe UI.
export async function getIdeaCards(limit = 60): Promise<IdeaCard[]> {
  const products = await prisma.product.findMany({
    where: { category: { not: null } },
    include: {
      listings: {
        select: {
          store: true,
          rank: true,
          reviews: { select: { themes: true, text: true } },
          positives: { select: { loved: true, text: true } },
        },
      },
    },
  });

  const cards: IdeaCard[] = [];

  for (const p of products) {
    const negTexts = p.listings.flatMap((l) => l.reviews);
    const posTexts = p.listings.flatMap((l) => l.positives);
    const negativeCount = negTexts.length;
    if (negativeCount < MIN_COMPLAINTS) continue;

    const cons = countThemes(negTexts.map((r) => r.themes)).slice(0, 4);
    const pros = countLoved(posTexts.map((r) => r.loved)).slice(0, 4);

    const ranks = p.listings.map((l) => l.rank).filter((r): r is number => r != null);
    const rank = p.rank ?? (ranks.length ? Math.min(...ranks) : null);

    const demand = rank ? 11 - Math.min(Math.max(rank, 1), 10) : 3;
    const clarity = cons.length ? cons[0].count / negativeCount : 0;
    const improvability = Math.log2(negativeCount + 1) * (0.6 + clarity);
    const complexity = categoryComplexity(p.category);
    const score = (demand * improvability) / complexity;

    const topCon = cons[0];
    const conQuote =
      negTexts.find((r) => topCon && parseKeys(r.themes).includes(topCon.key) && r.text.trim())
        ?.text ?? negTexts.find((r) => r.text.trim())?.text ?? null;

    const topPro = pros[0];
    const proQuote =
      posTexts.find((r) => topPro && parseKeys(r.loved).includes(topPro.key) && r.text.trim())
        ?.text ?? posTexts.find((r) => r.text.trim())?.text ?? null;

    cards.push({
      id: p.id,
      name: p.name,
      icon: p.icon,
      developer: p.developer,
      category: p.category,
      categoryLabel: categoryLabel(p.category ?? ""),
      rank,
      stores: [...new Set(p.listings.map((l) => l.store as Store))],
      score,
      complexity,
      complexityLabel: complexityLabel(complexity),
      demandLabel: rank
        ? `#${rank} in ${categoryLabel(p.category ?? "")}`
        : categoryLabel(p.category ?? ""),
      negativeCount,
      cons,
      conQuote: conQuote ? trimQuote(conQuote) : null,
      pros,
      proQuote: proQuote ? trimQuote(proQuote) : null,
    });
  }

  return cards.sort((a, b) => b.score - a.score).slice(0, limit);
}
