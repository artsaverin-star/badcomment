import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { getCatalog } from "@/site/content";
import { CONTENT_ROOT } from "@/site/content/root";
import type { PulseCategory, PulseDemand, PulseNeed } from "@/site/features/pulse/types";
import type { Locale } from "@/site/i18n/locales";
import { isLaunchCategory } from "@/site/manifest.generated";
import { routes } from "@/site/routing";
import { hasRatingNiche } from "./rating";

// «Пульс» data: content/v2/pulse-demand.json (schemaVersion 1), written only by
// app_04_inapp/Tools/pulse-demand/build.py --site (Pulse is site-only; the app importer does not
// touch this file). Server-only: evidence quotes are gated
// per category (getViewer().canReadResearch) — never hand a need to a client component.
// Production reads the file once; development re-reads it when its mtime changes. A missing
// file is an honest empty state (no section, no embed); an unsupported one throws.

export type PulseIndex = PulseDemand & {
  byId: ReadonlyMap<string, PulseNeed>;
  categoryById: ReadonlyMap<string, PulseCategory>;
};

const FILE = "pulse-demand.json";
const WATCH_MTIME = process.env.NODE_ENV !== "production";

function index(data: PulseDemand): PulseIndex {
  return {
    ...data,
    byId: new Map(data.needs.map((need) => [need.id, need])),
    categoryById: new Map(data.categories.map((category) => [category.id, category])),
  };
}

const EMPTY: PulseDemand = {
  schemaVersion: 1,
  generatedAt: "",
  source: { reviewCount: 0, appCount: 0, categoryCount: 0, needCount: 0, score: { shareFloor: 0.0004, shareCeil: 0.015, shareWeight: 0.5, breadthWeight: 0.2, volumeFloor: 15, volumeCeil: 1000, volumeWeight: 0.3 } },
  categories: [],
  needs: [],
};

/** Read and index one pulse-demand.json (exported for scripts/v2/test-pulse.ts). */
export async function readPulseDemand(file: string): Promise<PulseIndex> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return index(EMPTY);
    throw error;
  }
  const data = JSON.parse(text) as PulseDemand;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.needs) || !Array.isArray(data.categories)) {
    throw new Error(`Unsupported content/v2/${FILE} (schemaVersion ${JSON.stringify(data?.schemaVersion)}). Re-run app_04_inapp/Tools/pulse-demand/build.py --site.`);
  }
  return index(data);
}

let cache: { mtimeMs: number; promise: Promise<PulseIndex> } | undefined;

export async function getPulseDemand(): Promise<PulseIndex> {
  const file = path.join(CONTENT_ROOT, FILE);
  const mtimeMs = cache && !WATCH_MTIME ? cache.mtimeMs : await stat(file).then((s) => s.mtimeMs, () => -1);
  if (!cache || cache.mtimeMs !== mtimeMs) {
    const promise: Promise<PulseIndex> = readPulseDemand(file).catch((error: unknown) => {
      if (cache?.promise === promise) cache = undefined;
      throw error;
    });
    cache = { mtimeMs, promise };
  }
  return cache.promise;
}

/**
 * Category names for the page locale: the product's localized catalogue name (35 launch
 * categories, all five locales), else the file's own name in that locale (ru/en), else English.
 */
export async function getPulseCategoryNames(locale: Locale, data: Pick<PulseDemand, "categories">): Promise<Map<string, string>> {
  const catalog = data.categories.some((c) => isLaunchCategory(c.id)) ? await getCatalog(locale) : null;
  const product = new Map(catalog?.categories.map((c) => [c.slug, c.name]) ?? []);
  return new Map(data.categories.map((c) => [c.id, product.get(c.id) || c.name[locale] || c.name.en || c.id]));
}

/**
 * Where a need's category continues: its breakdown for the 35 launch categories, else the
 * category's app rating (/<L>/rating/<slug>; the old site's previous breakdowns are gone since
 * 2026-09-27). Null when the site has neither.
 */
export function pulseCategoryHref(locale: Locale, slug: string): { href: string; kind: "research" | "rating" } | null {
  if (isLaunchCategory(slug)) return { href: routes.topic(locale, slug), kind: "research" };
  if (hasRatingNiche(slug)) return { href: routes.ratingNiche(locale, slug), kind: "rating" };
  return null;
}
