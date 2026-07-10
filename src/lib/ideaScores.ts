import scores from "@/data/ideaScores.json";
import scoresEn from "@/data/ideaScores.en.json";
import founderScores from "@/data/ideaFounderScores.json";
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
  // Solo-founder priority scoring (promo + standout weighted higher). Present
  // for active ideas. `founder` is the weighted total (0-45); founderParts are
  // the 1-10 sub-scores; founderWhy is the decisive factor.
  founder?: number;
  founderParts?: { promo: number; standout: number; monetization: number; demand: number };
  founderWhy?: string;
};

type FounderRaw = { promo: number; standout: number; monetization: number; demand: number; weighted: number; rationale: string };
const FOUNDER = founderScores as unknown as Record<string, FounderRaw>;

// Weighted founder total (0-45) normalized to a 0-100 headline score.
export function founderScore100(weighted: number): number {
  return Math.round((weighted / 45) * 100);
}

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
const EN = scoresEn as unknown as Record<string, { whyPay?: string; targetSegment?: string }>;
const MKT = market as unknown as Record<string, NicheMarket>;

// Prices are baked as RU strings ("$4-6/мес", "$60/год", "$12 разово"); the
// numbers are universal, so on EN we only swap the unit tokens.
export function localizePrice(s: string | undefined, locale: Locale): string | undefined {
  if (!s || locale !== "en") return s;
  return s
    .replace(/\/мес/g, "/mo").replace(/\/год/g, "/yr").replace(/\/нед/g, "/wk").replace(/\/день/g, "/day")
    .replace(/разово/g, "one-time").replace(/\bили\b/g, "or").replace(/бесплатно/g, "free");
}

export function scoreFor(slug: string, locale: Locale = "ru"): IdeaScore | null {
  const s = RU[slug];
  if (!s) return null;
  const f = FOUNDER[slug];
  const founder = f
    ? { founder: f.weighted, founderParts: { promo: f.promo, standout: f.standout, monetization: f.monetization, demand: f.demand }, founderWhy: f.rationale }
    : {};
  if (locale === "en") {
    const en = EN[slug];
    return {
      ...s,
      ...founder,
      whyPay: en?.whyPay ?? s.whyPay,
      targetSegment: en?.targetSegment ?? s.targetSegment,
      pricePoint: localizePrice(s.pricePoint, locale) ?? s.pricePoint,
    };
  }
  return { ...s, ...founder };
}

export function marketFor(slug: string): NicheMarket | null {
  return MKT[slug] ?? null;
}

// "Hot" = ideas people loudly ask for AND already pay for: the geometric mean
// of money and demand. Simplicity is a builder's concern, not hype, so it
// stays out. The mean is geometric so one loud-but-free (or paid-but-quiet)
// score can't carry an idea to the top alone.
export function hotScore(s: IdeaScore): number {
  return Math.round(Math.sqrt(s.money * s.demand) * 10) / 10;
}

// All scored ideas sorted by a mode, for the leaderboard.
export type SortMode = "composite" | "money" | "simplicity" | "demand" | "hot";
export function rankedSlugs(mode: SortMode = "composite"): string[] {
  const val = (s: IdeaScore) => (mode === "hot" ? hotScore(s) : s[mode]);
  return Object.entries(RU)
    .sort((a, b) => val(b[1]) - val(a[1]))
    .map(([slug]) => slug);
}

export const SCORE_LABELS: Record<Locale, { demand: string; money: string; simplicity: string; composite: string }> = {
  ru: { demand: "Спрос", money: "Деньги", simplicity: "Простота", composite: "Итог" },
  en: { demand: "Demand", money: "Money", simplicity: "Simplicity", composite: "Score" },
};
