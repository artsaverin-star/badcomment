import categories from "@/data/categories.json";
import meta from "@/data/categories-meta.json";
import type { Locale } from "./i18n";

// Curated research taxonomy: 43 categories × ~10 leading apps each. Categories
// authored in src/data/categories.json (hand-curated); per-app metadata
// (canonical name + icon + Apple ID + optional DB productId) resolved into
// src/data/categories-meta.json by scripts/resolve-category-apps.ts +
// scripts/resolve-from-db.ts. This file is the read-only loader.

// `buildable` = solo/small-team can ship a real competitor (no network effects,
// no content rights, no regulated infra, no hardware moat). `wedge` = buildable
// only if you pick a vertical/niche. `reference` = mastodons whose pain is
// useful to learn but where cloning isn't the play.
export type Tier = "buildable" | "wedge" | "reference";

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

const TIER_ORDER: Record<Tier, number> = { buildable: 0, wedge: 1, reference: 2 };

export function sortByPriority(cats: CategoryView[]): CategoryView[] {
  return [...cats].sort((a, b) => {
    const t = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
    if (t !== 0) return t;
    return b.apps.length - a.apps.length;
  });
}

export function groupByTier(cats: CategoryView[]): Record<Tier, CategoryView[]> {
  const groups: Record<Tier, CategoryView[]> = { buildable: [], wedge: [], reference: [] };
  for (const c of cats) groups[c.tier].push(c);
  for (const k of Object.keys(groups) as Tier[]) {
    groups[k].sort((a, b) => b.apps.length - a.apps.length);
  }
  return groups;
}
