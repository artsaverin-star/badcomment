import insightsData from "@/data/insights.json";
import themesData from "@/data/segment-insight-themes.json";
import sleepMappings from "@/data/segment-meta-sleep-meditation.json";
import type { ProductInsights } from "./insights";

// Cross-app aggregation: read the per-product insights, the segment's authored
// meta-themes, and the agent-assigned mapping from insight → meta-theme, and
// fold them into the "top problems across all apps" view (failApps + mention
// count per meta-theme).
//
// A meta-theme is a "top complaint" for an app when it lands in that app's
// top-3 by observation count. This mirrors needsGap.ts so the segment page
// reads the same whether the underlying signal is semantic-classified reviews
// or qualitative-extracted insights.

type ThemeDef = { key: string; label: string; desc: string };
type SegmentThemes = { name: string; themes: ThemeDef[] };
type MappingFile = { mappings: Record<string, string | null> };

const THEMES = themesData as Record<string, SegmentThemes>;
const MAPPINGS: Record<string, Record<string, string | null>> = {
  "sleep-meditation": (sleepMappings as MappingFile).mappings,
};

export type SegmentInsightAppHit = {
  productId: string;
  appName: string;
  appIcon: string | null;
  mentions: number;
  topInsightTitle: string | null;
};

export type SegmentInsightTheme = {
  key: string;
  label: string;
  desc: string;
  failApps: number;
  totalApps: number;
  mentions: number;
  apps: SegmentInsightAppHit[];
};

export type SegmentInsightsView = {
  slug: string;
  segmentName: string;
  themes: SegmentInsightTheme[];
  maxFail: number;
  reviewsScanned: number;
  appsCount: number;
};

const TOP_PER_APP = 3;

export function getSegmentInsights(
  slug: string,
  appIds: string[],
  appNameById: Map<string, string> = new Map(),
  appIconById: Map<string, string | null> = new Map(),
): SegmentInsightsView | null {
  const segThemes = THEMES[slug];
  const mappings = MAPPINGS[slug];
  if (!segThemes || !mappings) return null;

  const insights = insightsData as ProductInsights[];
  const inScope = insights.filter((p) => appIds.includes(p.productId));
  if (inScope.length === 0) return null;

  type AppTallies = Map<string, { mentions: number; topInsight: { title: string; obs: number } | null }>;
  const perTheme = new Map<string, Map<string, AppTallies>>();
  for (const t of segThemes.themes) perTheme.set(t.key, new Map());

  let reviewsScanned = 0;
  let totalApps = 0;

  for (const p of inScope) {
    reviewsScanned += p.reviewsScanned ?? 0;
    totalApps++;

    // Tally this app's mentions per meta-theme, plus pick the most-mentioned
    // single insight inside each theme as the spokesperson for the popup.
    const tally = new Map<string, { mentions: number; topInsight: { title: string; obs: number } | null }>();
    for (const i of p.insights) {
      const ref = `${p.productId}:${i.id}`;
      const metaKey = mappings[ref];
      if (!metaKey) continue;
      const obs = i.observationCount ?? i.evidence.length;
      const prev = tally.get(metaKey) ?? { mentions: 0, topInsight: null };
      prev.mentions += obs;
      if (!prev.topInsight || obs > prev.topInsight.obs) prev.topInsight = { title: i.title, obs };
      tally.set(metaKey, prev);
    }

    // App's top-3 meta-themes by mentions = its "top complaints".
    const ranked = [...tally.entries()]
      .sort((a, b) => b[1].mentions - a[1].mentions)
      .slice(0, TOP_PER_APP)
      .map(([k]) => k);
    const isTop = new Set(ranked);

    for (const [metaKey, t] of tally) {
      const themeMap = perTheme.get(metaKey);
      if (!themeMap) continue;
      const aMap: AppTallies = themeMap.get("__apps") ?? new Map();
      aMap.set(p.productId, t);
      themeMap.set("__apps", aMap);
      const failBucket = themeMap.get("__fail") ?? new Map();
      if (isTop.has(metaKey)) failBucket.set(p.productId, true);
      themeMap.set("__fail", failBucket);
    }
  }

  const themes: SegmentInsightTheme[] = segThemes.themes.map((td) => {
    const m = perTheme.get(td.key);
    const aMap = (m?.get("__apps") ?? new Map()) as AppTallies;
    const fMap = (m?.get("__fail") ?? new Map()) as Map<string, boolean>;
    const apps: SegmentInsightAppHit[] = [...aMap.entries()]
      .map(([productId, t]) => ({
        productId,
        appName: appNameById.get(productId) ?? "",
        appIcon: appIconById.get(productId) ?? null,
        mentions: t.mentions,
        topInsightTitle: t.topInsight?.title ?? null,
      }))
      .sort((a, b) => b.mentions - a.mentions);
    const mentions = apps.reduce((s, a) => s + a.mentions, 0);
    return {
      key: td.key,
      label: td.label,
      desc: td.desc,
      failApps: fMap.size,
      totalApps,
      mentions,
      apps,
    };
  });

  themes.sort((a, b) => b.failApps - a.failApps || b.mentions - a.mentions);
  const maxFail = Math.max(1, ...themes.map((t) => t.failApps));

  return {
    slug,
    segmentName: segThemes.name,
    themes,
    maxFail,
    reviewsScanned,
    appsCount: totalApps,
  };
}
