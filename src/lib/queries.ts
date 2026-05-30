import { prisma } from "./prisma";
import { THEMES, LOVED_THEMES } from "./themes";
import { CATEGORIES, categoryLabel } from "./categories";
import { scoreCloneability, isBrandStorefront, isRewardFarm } from "./cloneability";
import type { IdeaSummary } from "./summarize";
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
  // Cloneability ("how easy to rebuild")
  cloneScore: number;
  cloneLabel: "Low" | "Medium" | "High";
  cloneReasons: string[];
  // Popularity / satisfaction
  demandLabel: string;
  installs: number | null;
  avgRating: number | null;
  ratingCount: number | null;
  histogram: Record<string, number> | null;
  // Review-mined signal
  negativeCount: number;
  cons: ThemeStat[];
  conQuote: string | null;
  pros: ThemeStat[];
  proQuote: string | null;
  // Raw review samples fed to the LLM for app-specific gap extraction.
  conSamples: string[];
  proSamples: string[];
  // Cached LLM analysis (null until `npm run summarize` runs / no API key).
  summary: IdeaSummary | null;
};

const MIN_COMPLAINTS = 4; // skip apps without a clear, fixable pain signal

// Reviews containing these tend to carry a concrete feature ask / broken
// workflow (the real insight) rather than a generic gripe.
const WISH = /(wish|need|should|can'?t|cannot|no way|unable|missing|doesn'?t|lacks?|would be|if only|please add|add an option|hope they|не хвата|хотелось бы|нет возможност|было бы|не могу|добавьте|почему нельзя|отсутству|нельзя)/i;

// Curate a sample of raw review texts for the model: prefer ones with a
// concrete ask, then the longest (most substantive), deduped and length-capped.
function pickSamples(texts: string[], n: number): string[] {
  const seen = new Set<string>();
  const clean = texts
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 20)
    .filter((t) => {
      const k = t.slice(0, 40).toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  const withSignal = clean.filter((t) => WISH.test(t));
  const rest = clean.filter((t) => !WISH.test(t)).sort((a, b) => b.length - a.length);
  return [...withSignal, ...rest].slice(0, n).map((t) => (t.length > 280 ? `${t.slice(0, 279)}…` : t));
}

// Only accept the new (v2) summary shape; old cached summaries lack `gaps` and
// are treated as absent so the card cleanly falls back until regenerated.
function parseSummary(raw: string | null): IdeaSummary | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as IdeaSummary;
    if (!Array.isArray(o.gaps)) return null;
    return o;
  } catch {
    return null;
  }
}

function mergeHistograms(raws: (string | null)[]): Record<string, number> | null {
  const out: Record<string, number> = {};
  let any = false;
  for (const raw of raws) {
    if (!raw) continue;
    try {
      const h = JSON.parse(raw) as Record<string, number>;
      for (const star of ["1", "2", "3", "4", "5"]) {
        const n = Number(h[star]) || 0;
        if (n > 0) any = true;
        out[star] = (out[star] ?? 0) + n;
      }
    } catch {
      // skip malformed histogram
    }
  }
  return any ? out : null;
}

// Demand as an inverted-U over popularity: peaks for mid-tier apps (proven
// demand, ~1M–50M) and falls off for untouchable giants (Pinterest/YouTube)
// and for unproven small apps. This stops 1B-install apps from auto-dominating.
function demandCurve(popProxy: number | null, rank: number | null): number {
  if (!popProxy) return rank ? Math.max(1, 6 - Math.min(rank, 10) / 2) : 2;
  const x = Math.log10(popProxy);
  const peak = 6.8; // ~6M installs = the sweet spot
  const sigma = 1.8;
  const g = Math.exp(-((x - peak) ** 2) / (2 * sigma * sigma)); // 0..1
  return 1 + 7 * g;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(n % 1_000_000_000 ? 1 : 0)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

// Rank products as buildable opportunities: proven demand (installs/ratings)
// times how much there is to fix (complaint volume + concentration), divided by
// how hard the app is to rebuild (real cloneability, not just category).
export async function getIdeaCards(
  limit = 60,
  category?: string | null
): Promise<IdeaCard[]> {
  const products = await prisma.product.findMany({
    where: category ? { category } : { category: { not: null } },
    include: {
      listings: {
        select: {
          store: true,
          rank: true,
          score: true,
          ratingCount: true,
          installs: true,
          histogram: true,
          offersIAP: true,
          sizeBytes: true,
          description: true,
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

    // Popularity: prefer real Google installs; fall back to an installs proxy
    // from total rating counts (ratings ≈ 1% of installs) so Apple-only apps
    // still get a demand signal.
    const installsVals = p.listings
      .map((l) => (l.installs == null ? null : Number(l.installs)))
      .filter((v): v is number => v != null);
    const installs = installsVals.length ? Math.max(...installsVals) : null;
    const ratingCount =
      p.listings.reduce((s, l) => s + (l.ratingCount ?? 0), 0) || null;
    const popProxy = installs ?? (ratingCount ? ratingCount * 100 : null);
    const demand = demandCurve(popProxy, rank);

    // Satisfaction: rating-count-weighted average star score across stores.
    const scored = p.listings.filter((l) => l.score != null);
    const weightSum = scored.reduce((s, l) => s + (l.ratingCount ?? 1), 0);
    const avgRating = scored.length
      ? scored.reduce((s, l) => s + (l.score as number) * (l.ratingCount ?? 1), 0) /
        (weightSum || scored.length)
      : null;
    const histogram = mergeHistograms(p.listings.map((l) => l.histogram));

    // How much is there to fix: log-scaled volume × concentration of top theme.
    const clarity = cons.length ? cons[0].count / negativeCount : 0;
    const improvability = Math.log2(negativeCount + 1) * (0.6 + clarity);

    // How hard to rebuild: real cloneability from description + monetization +
    // size, preferring a Google listing's richer signals.
    const detail =
      p.listings.find((l) => l.store === "google" && l.description) ??
      p.listings.find((l) => l.description) ??
      p.listings[0];
    const clone = scoreCloneability({
      category: p.category,
      description: detail?.description ?? null,
      offersIAP: p.listings.some((l) => l.offersIAP),
      sizeBytes: Math.max(0, ...p.listings.map((l) => Number(l.sizeBytes ?? 0))) || null,
    });

    const conSamples = pickSamples(negTexts.map((r) => r.text), 32);
    const proSamples = pickSamples(posTexts.map((r) => r.text), 10);
    const summary = parseSummary(p.summary);

    // Drop apps that aren't a real standalone product worth rebuilding:
    // single-brand storefronts/chains/carriers, get-paid-to reward farms, or
    // anything the model flagged as not cloneable (network/infra lock-in).
    if (
      isBrandStorefront(detail?.description) ||
      isRewardFarm(detail?.description) ||
      summary?.cloneable === false
    )
      continue;

    const score = (demand * improvability) / clone.score;

    const topCon = cons[0];
    const conQuote =
      negTexts.find((r) => topCon && parseKeys(r.themes).includes(topCon.key) && r.text.trim())
        ?.text ?? negTexts.find((r) => r.text.trim())?.text ?? null;

    const topPro = pros[0];
    const proQuote =
      posTexts.find((r) => topPro && parseKeys(r.loved).includes(topPro.key) && r.text.trim())
        ?.text ?? posTexts.find((r) => r.text.trim())?.text ?? null;

    const demandLabel = installs
      ? `${formatCount(installs)}+ installs`
      : ratingCount
        ? `${formatCount(ratingCount)} ratings`
        : rank
          ? `#${rank} in ${categoryLabel(p.category ?? "")}`
          : categoryLabel(p.category ?? "");

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
      cloneScore: clone.score,
      cloneLabel: clone.label,
      cloneReasons: clone.reasons,
      demandLabel,
      installs,
      avgRating,
      ratingCount,
      histogram,
      negativeCount,
      cons,
      conQuote: conQuote ? trimQuote(conQuote) : null,
      pros,
      proQuote: proQuote ? trimQuote(proQuote) : null,
      conSamples,
      proSamples,
      summary,
    });
  }

  return cards.sort((a, b) => b.score - a.score).slice(0, limit);
}
