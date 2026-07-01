import scores from "@/data/ideaScores.json";
import scoresEn from "@/data/ideaScores.en.json";
import market from "@/data/nicheMarket.json";
import type { Locale } from "@/lib/i18n";

// Profitability/buildability scoring for ideas, and real market data per niche.
// Every number traces to real signals: money/simplicity are judged from real
// review prices + who-pays; demand from real observation counts; installs from
// Google Play; the revenue figure is a transparent estimate (formula shown).

export type IdeaScore = {
  demand: number;
  money: number;
  simplicity: number;
  composite: number;
  whyPay: string;
  pricePoint: string;
  targetSegment: string;
  category: string;
};

export type NicheMarket = {
  ratingsTotal: number;
  pricesTop: { label: string; count: number }[];
  signals: { subscription?: number; lifetime?: number; priceGripe?: number; worthIt?: number; notWorth?: number };
  installs: null | {
    totalMin: number; totalMax: number; matched: number; paidApps: number; iapApps: number;
    top: { title: string; installs: string; free: boolean; price: number }[];
  };
  revenue: null | { low: string; high: string; annualPrice: number; note: string };
};

const RU = scores as unknown as Record<string, IdeaScore>;
const EN = scoresEn as unknown as Record<string, { whyPay?: string }>;
const MKT = market as unknown as Record<string, NicheMarket>;

export function scoreFor(slug: string, locale: Locale = "ru"): IdeaScore | null {
  const s = RU[slug];
  if (!s) return null;
  if (locale === "en") {
    const en = EN[slug];
    if (en?.whyPay) return { ...s, whyPay: en.whyPay };
  }
  return s;
}

export function marketFor(slug: string): NicheMarket | null {
  return MKT[slug] ?? null;
}

// All scored ideas sorted by a mode, for the leaderboard.
export type SortMode = "composite" | "money" | "simplicity" | "demand";
export function rankedSlugs(mode: SortMode = "composite"): string[] {
  return Object.entries(RU)
    .sort((a, b) => b[1][mode] - a[1][mode])
    .map(([slug]) => slug);
}

export const SCORE_LABELS: Record<Locale, { demand: string; money: string; simplicity: string; composite: string }> = {
  ru: { demand: "Спрос", money: "Деньги", simplicity: "Простота", composite: "Итог" },
  en: { demand: "Demand", money: "Money", simplicity: "Simplicity", composite: "Score" },
};
