import insightsData from "@/data/insights.json";

// Qualitative-extraction prototype data: hand-validated insights from Calm
// reviews 1-5★. This file feeds /product/[id]/insights — the exemplary page
// that shows what the new pipeline output should look like before we burn
// compute on the full 8,279-review run.

export type InsightCategory = "strategic" | "workflow" | "onboarding" | "depth";
export type InsightNovelty = "high" | "medium" | "low";

export type InsightEvidence = {
  rating: number;
  date: string;
  reviewId: string;
  quote: string;
};

export type Theme =
  | "payment"
  | "content"
  | "playback"
  | "ui"
  | "reliability"
  | "support"
  | "strategy";

export const THEME_LABEL: Record<Theme, string> = {
  payment: "Подписка и оплата",
  content: "Контент и каталог",
  playback: "Аудио и воспроизведение",
  ui: "Интерфейс и навигация",
  reliability: "Стабильность и устройства",
  support: "Поддержка и аккаунт",
  strategy: "Стратегия и сегменты",
};

// Display order of themes on the page.
export const THEME_ORDER: Theme[] = [
  "strategy",
  "payment",
  "content",
  "ui",
  "playback",
  "reliability",
  "support",
];

export type Insight = {
  id: string;
  category: InsightCategory;
  title: string;
  story: string;
  who: string[];
  trialPath?: string;
  featureArea: string;
  novelty: InsightNovelty;
  evidence: InsightEvidence[];
  observationCount?: number; // full cluster size; evidence shows only top-3 quotes
  theme?: Theme;
  implies: string;
};

export type PersonaPattern = {
  label: string;
  share: string;
  note: string;
};

export type CommodityRow = {
  label: string;
  approx: string;
  note: string;
};

export type ProductInsights = {
  productId: string;
  reviewsScanned: number;
  ratingBreakdown: Record<string, number>;
  pipeline: string;
  asOf: string;
  sampleSize: number;
  insights: Insight[];
  personaPatterns: PersonaPattern[];
  commodityBaseline: CommodityRow[];
};

export function getProductInsights(productId: string): ProductInsights | null {
  const all = insightsData as ProductInsights[];
  return all.find((p) => p.productId === productId) ?? null;
}

export const CATEGORY_LABEL: Record<InsightCategory, { ru: string; en: string; tone: "danger" | "warning" | "info" | "brand" }> = {
  strategic: { ru: "Стратегические инсайты", en: "Strategic insights", tone: "danger" },
  workflow: { ru: "Workflow-фрикшн", en: "Workflow friction", tone: "warning" },
  onboarding: { ru: "Воронка установки", en: "Conversion friction", tone: "info" },
  depth: { ru: "Запрос глубины от лояльных", en: "Depth requests", tone: "brand" },
};
