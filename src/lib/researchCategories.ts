import categories from "@/data/categories.json";
import meta from "@/data/categories-meta.json";
import deprioritized from "@/data/deprioritized-categories.json";
import type { Locale } from "./i18n";

// Two-level taxonomy: top-level life domain ("Sleep & meditation") → sub
// categories ("Meditation", "Sleep audio", "Sleep tracking", "Stretching").
// Each sub-category has 10+ leader apps with no app repeating across
// categories. Authored in src/data/categories.json; per-app metadata
// (icons + Apple IDs + optional DB productIds) lives in
// src/data/categories-meta.json — produced by the resolver scripts.

type RawDomain = {
  slug: string;
  ru: { name: string; kicker: string };
  en: { name: string; kicker: string };
  categories: RawCategory[];
};

type RawCategory = {
  slug: string;
  ru: { name: string; kicker: string };
  en: { name: string; kicker: string };
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
  screenshots?: string[];
};

const RAW_DOMAINS = categories as RawDomain[];
const META = meta as Record<string, RawAppMeta>;
// Categories parked as not-worth-processing (junk/storefront/network-effect):
// kept in the catalog but greyed out and skipped by the pipeline.
const DEPRIORITIZED = new Set(deprioritized as string[]);

export function isDeprioritizedCategory(slug: string): boolean {
  return DEPRIORITIZED.has(slug);
}

export type CategoryAppView = {
  query: string;
  name: string;
  icon: string;
  appleId: number;
  productId: string | null;
};

export type CategoryView = {
  slug: string;
  name: string;
  kicker: string;
  apps: CategoryAppView[];
  deprioritized: boolean;
};

export type DomainView = {
  slug: string;
  name: string;
  kicker: string;
  categories: CategoryView[];
};

function resolveApp(catSlug: string, query: string): CategoryAppView {
  const m = META[`${catSlug}:${query}`];
  if (!m) return { query, name: query, icon: "", appleId: 0, productId: null };
  return {
    query,
    name: m.name,
    icon: m.icon,
    appleId: m.appleId,
    productId: m.productId ?? null,
  };
}

function buildCategory(c: RawCategory, locale: Locale): CategoryView {
  return {
    slug: c.slug,
    name: locale === "en" ? c.en.name : c.ru.name,
    kicker: locale === "en" ? c.en.kicker : c.ru.kicker,
    apps: c.apps.map((a) => resolveApp(c.slug, a)),
    deprioritized: DEPRIORITIZED.has(c.slug),
  };
}

export function listDomains(locale: Locale): DomainView[] {
  return RAW_DOMAINS.map((d) => ({
    slug: d.slug,
    name: locale === "en" ? d.en.name : d.ru.name,
    kicker: locale === "en" ? d.en.kicker : d.ru.kicker,
    categories: d.categories.map((c) => buildCategory(c, locale)),
  }));
}

export function getCategoryBySlug(slug: string, locale: Locale): CategoryView | null {
  for (const d of RAW_DOMAINS) {
    const c = d.categories.find((c) => c.slug === slug);
    if (c) return buildCategory(c, locale);
  }
  return null;
}

// Back-compat name for places still calling the old API.
export const getResearchCategory = getCategoryBySlug;

// Name + icon for a scraped (non-DB) productId, read off the curated catalog.
// Lets the canonical insight page dress its hero for ext-* apps that have no
// Product row in the database.
export function getAppMetaByProductId(
  productId: string,
): { name: string; icon: string; developer: string | null; screenshots: string[] } | null {
  for (const m of Object.values(META)) {
    if (m.productId === productId)
      return { name: m.name, icon: m.icon, developer: m.developer ?? null, screenshots: m.screenshots ?? [] };
  }
  return null;
}
