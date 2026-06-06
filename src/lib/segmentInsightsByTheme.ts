import insightsData from "@/data/insights.json";
import { THEME_LABEL, THEME_ORDER, type Insight, type Theme, type ProductInsights } from "./insights";

// Cross-app segment view: take every per-app insight, group by theme. Real
// insights with their evidence — not the abstract 9-meta-themes the prior
// "Top problems" view used. Each theme tile shows insights sorted by
// observation count; insights carry the source-app productId so the evidence
// popup can filter by app.

export type SegmentInsight = Insight & {
  productId: string;
};

export type SegmentThemeBucket = {
  theme: Theme;
  label: string;
  insights: SegmentInsight[];
  totalObservations: number;
};

export type SegmentByThemeView = {
  slug: string;
  themes: SegmentThemeBucket[];
  appsCount: number;
  reviewsScanned: number;
};

export function getSegmentInsightsByTheme(
  slug: string,
  appIds: string[],
): SegmentByThemeView | null {
  const all = insightsData as ProductInsights[];
  const inScope = all.filter((p) => appIds.includes(p.productId));
  if (inScope.length === 0) return null;

  const byTheme = new Map<Theme, SegmentInsight[]>();
  for (const t of THEME_ORDER) byTheme.set(t, []);

  let totalReviews = 0;
  for (const p of inScope) {
    totalReviews += p.reviewsScanned ?? 0;
    for (const i of p.insights) {
      if (!i.theme) continue;
      const bucket = byTheme.get(i.theme);
      if (!bucket) continue;
      bucket.push({ ...i, productId: p.productId });
    }
  }

  const themes: SegmentThemeBucket[] = [];
  for (const t of THEME_ORDER) {
    const insights = (byTheme.get(t) ?? []).slice();
    insights.sort((a, b) => {
      const ac = a.observationCount ?? a.evidence.length;
      const bc = b.observationCount ?? b.evidence.length;
      return bc - ac;
    });
    if (insights.length === 0) continue;
    themes.push({
      theme: t,
      label: THEME_LABEL[t],
      insights,
      totalObservations: insights.reduce((s, i) => s + (i.observationCount ?? i.evidence.length), 0),
    });
  }

  return {
    slug,
    themes,
    appsCount: inScope.length,
    reviewsScanned: totalReviews,
  };
}
