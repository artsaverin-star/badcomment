import summaryData from "@/data/segment-insights.json";
import { THEME_LABEL, type Theme } from "./insights";

// Category-level editorial synthesis ("инсайты категории") — built offline by
// scripts/build-segment-insights.ts from the per-app insights. Rendered at the
// very end of a segment page, after every app's insights are shown.

export type SegmentSummaryEvidence = {
  rating: number;
  date: string;
  reviewId: string;
  quote: string;
  app: string;
};

export type SegmentSummaryItem = {
  id: string;
  theme: Theme;
  title: string;
  body: string;
  apps: string[];
  observationCount: number;
  evidence: SegmentSummaryEvidence[];
};

export type SegmentSummary = {
  slug: string;
  lead: string;
  asOf: string;
  appsCount: number;
  reviewsScanned: number;
  items: SegmentSummaryItem[];
};

export function getSegmentSummary(slug: string): SegmentSummary | null {
  const data = summaryData as Record<string, SegmentSummary>;
  return data[slug] ?? null;
}

export function themeLabel(theme: Theme): string {
  return THEME_LABEL[theme];
}
