import fs from "node:fs";
import path from "node:path";
import { readDataFile } from "./dataFile";

// The people's rating, one file per niche in src/data/peoplesRating/<slug>.json (~17 MB in
// all). Read per niche on demand instead of through the import barrel
// (src/data/peoplesRating/index.ts, kept for scripts), which put every niche into every
// server bundle that touched one (lib/dataFile.ts explains why that matters).

const DIR = path.join(process.cwd(), "src", "data", "peoplesRating");
const KEEP = 16;

let slugs: string[] | null = null;
let slugSet: Set<string> | null = null;
const recent = new Map<string, unknown>();

/** Every niche with a people's rating (file names, sorted). */
export function ratingSlugs(): string[] {
  if (!slugs) {
    slugs = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -".json".length)).sort();
    slugSet = new Set(slugs);
  }
  return slugs;
}

export function hasRatingSet(slug: string): boolean {
  ratingSlugs();
  return slugSet!.has(slug);
}

/** One niche's rating file, or null. The last few niches read stay in memory. */
export function getRatingSet<T>(slug: string): T | null {
  if (!hasRatingSet(slug)) return null;
  let set = recent.get(slug);
  if (set !== undefined) {
    recent.delete(slug);
  } else {
    set = readDataFile(`peoplesRating/${slug}.json`);
    while (recent.size >= KEEP) recent.delete(recent.keys().next().value!);
  }
  recent.set(slug, set);
  return set as T;
}
