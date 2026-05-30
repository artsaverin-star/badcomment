import gplay from "google-play-scraper";
import appStore from "app-store-scraper";

// Canonical categories shown to users. Each maps to the equivalent
// store-specific category enum so we can pull top-lists from both stores
// and merge them under one direction. `complexity` is a rough build-effort
// heuristic (1 = a solo dev could ship it, 3 = network effects / regulation /
// heavy infra) used to rank "buildable" opportunities.
export type Category = {
  key: string;
  label: string;
  google: string; // gplay.category.*
  apple: number; // appStore.category.* (numeric id)
  complexity: number; // 1.0 (simple) .. 3.0 (hard)
};

export const CATEGORIES: Category[] = [
  { key: "social", label: "Social", google: gplay.category.SOCIAL, apple: appStore.category.SOCIAL_NETWORKING, complexity: 2.6 },
  { key: "productivity", label: "Productivity", google: gplay.category.PRODUCTIVITY, apple: appStore.category.PRODUCTIVITY, complexity: 1.3 },
  { key: "finance", label: "Finance", google: gplay.category.FINANCE, apple: appStore.category.FINANCE, complexity: 2.6 },
  { key: "health", label: "Health & Fitness", google: gplay.category.HEALTH_AND_FITNESS, apple: appStore.category.HEALTH_AND_FITNESS, complexity: 1.6 },
  { key: "photo", label: "Photo & Video", google: gplay.category.PHOTOGRAPHY, apple: appStore.category.PHOTO_AND_VIDEO, complexity: 1.4 },
  { key: "entertainment", label: "Entertainment", google: gplay.category.ENTERTAINMENT, apple: appStore.category.ENTERTAINMENT, complexity: 1.7 },
  { key: "education", label: "Education", google: gplay.category.EDUCATION, apple: appStore.category.EDUCATION, complexity: 1.5 },
  { key: "travel", label: "Travel", google: gplay.category.TRAVEL_AND_LOCAL, apple: appStore.category.TRAVEL, complexity: 1.8 },
  { key: "food", label: "Food & Drink", google: gplay.category.FOOD_AND_DRINK, apple: appStore.category.FOOD_AND_DRINK, complexity: 1.6 },
  { key: "lifestyle", label: "Lifestyle", google: gplay.category.LIFESTYLE, apple: appStore.category.LIFESTYLE, complexity: 1.3 },
  { key: "business", label: "Business", google: gplay.category.BUSINESS, apple: appStore.category.BUSINESS, complexity: 1.9 },
  { key: "utilities", label: "Utilities", google: gplay.category.TOOLS, apple: appStore.category.UTILITIES, complexity: 1.0 },
];

export const categoryLabel = (key: string) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const getCategory = (key: string) =>
  CATEGORIES.find((c) => c.key === key);

export const categoryComplexity = (key: string | null | undefined) =>
  CATEGORIES.find((c) => c.key === key)?.complexity ?? 2.0;

export function complexityLabel(weight: number): "Low" | "Medium" | "High" {
  if (weight <= 1.3) return "Low";
  if (weight <= 1.8) return "Medium";
  return "High";
}
