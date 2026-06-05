import categories from "@/data/categories.json";
import meta from "@/data/categories-meta.json";
import type { Locale } from "./i18n";

// Curated research taxonomy: 43 categories × ~10 leading apps each. Categories
// authored in src/data/categories.json (hand-curated); per-app metadata
// (canonical name + icon + Apple ID + optional DB productId) resolved into
// src/data/categories-meta.json by scripts/resolve-category-apps.ts +
// scripts/resolve-from-db.ts. This file is the read-only loader.

export type Tier = "high" | "medium" | "low";

type RawCategory = {
  slug: string;
  ru: { name: string; kicker: string };
  en: { name: string; kicker: string };
  tier: Tier;
  apps: string[];
};

type RawAppMeta = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  bundleId: string | null;
  developer: string | null;
  productId?: string;
};

const RAW_CATEGORIES = categories as RawCategory[];
const META = meta as Record<string, RawAppMeta>;

export type CategoryAppView = {
  query: string; // the authored name (key)
  name: string; // canonical store name
  icon: string;
  appleId: number;
  productId: string | null;
};

export type CategoryView = {
  slug: string;
  name: string;
  kicker: string;
  tier: Tier;
  apps: CategoryAppView[];
};

function resolveApp(slug: string, query: string): CategoryAppView {
  const m = META[`${slug}:${query}`];
  if (!m) return { query, name: query, icon: "", appleId: 0, productId: null };
  return {
    query,
    name: m.name,
    icon: m.icon,
    appleId: m.appleId,
    productId: m.productId ?? null,
  };
}

export function listResearchCategories(locale: Locale): CategoryView[] {
  return RAW_CATEGORIES.map((c) => ({
    slug: c.slug,
    name: locale === "en" ? c.en.name : c.ru.name,
    kicker: locale === "en" ? c.en.kicker : c.ru.kicker,
    tier: c.tier,
    apps: c.apps.map((a) => resolveApp(c.slug, a)),
  }));
}

export function getResearchCategory(slug: string, locale: Locale): CategoryView | null {
  const c = RAW_CATEGORIES.find((c) => c.slug === slug);
  if (!c) return null;
  return {
    slug: c.slug,
    name: locale === "en" ? c.en.name : c.ru.name,
    kicker: locale === "en" ? c.en.kicker : c.ru.kicker,
    tier: c.tier,
    apps: c.apps.map((a) => resolveApp(c.slug, a)),
  };
}

const TIER_ORDER: Record<Tier, number> = { high: 0, medium: 1, low: 2 };

export function sortByPriority(cats: CategoryView[]): CategoryView[] {
  return [...cats].sort((a, b) => {
    const t = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (t !== 0) return t;
    return b.apps.length - a.apps.length;
  });
}
