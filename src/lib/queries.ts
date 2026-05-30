import { prisma } from "./prisma";
import { THEMES } from "./themes";
import { CATEGORIES } from "./categories";
import type { Store } from "./scrapers";

export type ThemeStat = { key: string; label: string; count: number };

function countThemes(themeArrays: string[]): ThemeStat[] {
  const counts = new Map<string, number>();
  for (const raw of themeArrays) {
    let keys: string[] = [];
    try {
      keys = JSON.parse(raw);
    } catch {
      keys = [];
    }
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return THEMES.map((t) => ({ key: t.key, label: t.label, count: counts.get(t.key) ?? 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);
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
