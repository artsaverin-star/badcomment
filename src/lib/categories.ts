import gplay from "google-play-scraper";
import appStore from "app-store-scraper";

// Canonical categories shown to users. Each maps to the equivalent
// store-specific category enum so we can pull top-lists from both stores
// and merge them under one direction.
export type Category = {
  key: string;
  label: string;
  google: string; // gplay.category.*
  apple: number; // appStore.category.* (numeric id)
};

export const CATEGORIES: Category[] = [
  { key: "social", label: "Social", google: gplay.category.SOCIAL, apple: appStore.category.SOCIAL_NETWORKING },
  { key: "productivity", label: "Productivity", google: gplay.category.PRODUCTIVITY, apple: appStore.category.PRODUCTIVITY },
  { key: "finance", label: "Finance", google: gplay.category.FINANCE, apple: appStore.category.FINANCE },
  { key: "health", label: "Health & Fitness", google: gplay.category.HEALTH_AND_FITNESS, apple: appStore.category.HEALTH_AND_FITNESS },
  { key: "photo", label: "Photo & Video", google: gplay.category.PHOTOGRAPHY, apple: appStore.category.PHOTO_AND_VIDEO },
  { key: "entertainment", label: "Entertainment", google: gplay.category.ENTERTAINMENT, apple: appStore.category.ENTERTAINMENT },
  { key: "education", label: "Education", google: gplay.category.EDUCATION, apple: appStore.category.EDUCATION },
  { key: "travel", label: "Travel", google: gplay.category.TRAVEL_AND_LOCAL, apple: appStore.category.TRAVEL },
  { key: "food", label: "Food & Drink", google: gplay.category.FOOD_AND_DRINK, apple: appStore.category.FOOD_AND_DRINK },
  { key: "lifestyle", label: "Lifestyle", google: gplay.category.LIFESTYLE, apple: appStore.category.LIFESTYLE },
  { key: "business", label: "Business", google: gplay.category.BUSINESS, apple: appStore.category.BUSINESS },
  { key: "utilities", label: "Utilities", google: gplay.category.TOOLS, apple: appStore.category.UTILITIES },
];

export const categoryLabel = (key: string) =>
  CATEGORIES.find((c) => c.key === key)?.label ?? key;

export const getCategory = (key: string) =>
  CATEGORIES.find((c) => c.key === key);
