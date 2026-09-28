// Builds src/site/routing/legacy.generated.ts — where the retired old site's URLs lead now
// (owner, 2026-09-27: the old site is gone, every old address answers 301 with the closest new
// page; docs/site-v2/ARCHITECTURE.md §1 «Retired old site»).
//
//   npx tsx scripts/v2/build-legacy-redirects.ts          write the file
//   npx tsx scripts/v2/build-legacy-redirects.ts --check  fail when the file is stale
//
// The SOURCE list is frozen with the old site: its 72 topics and the 270 per-app landing pages
// (/<ru|en>/<app-slug>, an app of an active topic with a review teardown — the old
// src/app/(old)/[slug]/page.tsx rule). Only the TARGETS depend on live data: an app's card in the
// rating (/<L>/rating/<niche>/<slug>; slugs follow the rating's raw data order), else the
// rating of its topic. Re-run after a rating import; scripts/v2/test-routing.ts checks that every
// target still resolves.

import { readFileSync, writeFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";
import active from "@/data/active-categories.json";
import { getSlugByProductId } from "@/lib/appSlugs";
import { appSlugify } from "@/lib/ratingAppSlug";
import { hasInsight } from "@/lib/readyApps";
import { getCategoryBySlug } from "@/lib/researchCategories";

// `import "server-only"` is a Next.js bundler alias; outside Next it resolves to its empty module
// (the same shim as scripts/v2/test-rating.ts).
const loader = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = loader._resolveFilename;
const serverOnlyEmpty = path.join(process.cwd(), "node_modules/next/dist/compiled/server-only/empty.js");
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  return request === "server-only" ? serverOnlyEmpty : resolveFilename.call(this, request, ...rest);
};
/* eslint-disable @typescript-eslint/no-require-imports */
const { getRatingNiche, hasRatingNiche, listRatingNiches, ratingAppNiches, ratingAppSlug } =
  require("../../src/site/sitedata/rating") as typeof import("../../src/site/sitedata/rating");
/* eslint-enable @typescript-eslint/no-require-imports */

const OUT = path.join(process.cwd(), "src/site/routing/legacy.generated.ts");

const topics = [...(active as string[])].sort();

type Target = string; // "<niche>" (the topic's rating) or "<niche>/<app slug>" (the app's card)

/** The brand part of a store title: «Bumble Dating App: Meet & Date» → "bumble-dating-app". */
const brand = (title: string) => appSlugify(title.split(/\s*[:|–—]\s*|\s+-\s+/)[0]);

type NamedApp = { title: string; slug: string; ratings: number | null };
const loose: string[] = [];

// Prefix matches that name ANOTHER app (checked by eye with --verbose, 2026-09-27): these old
// pages go to their topic's rating instead.
const NOT_THE_SAME_APP: ReadonlySet<string> = new Set([
  "Robinhood", // → Robinhood Wallet (a separate crypto wallet app)
  "Calorie Counter by Lose It!", // → Calorie Counter - MyNetDiary
  "Budget App & Tracker: Spendee", // → Budget – Car Rental
]);

function matchByName<T extends NamedApp>(apps: readonly T[], name: string, opts: { exactOnly?: boolean } = {}): T | null {
  const own = appSlugify(name);
  const ownBrand = brand(name);
  const best = (list: T[]) => list.sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0))[0] ?? null;
  const exact = apps.filter((a) => brand(a.title) === own || brand(a.title) === ownBrand || appSlugify(a.title) === own);
  if (exact.length) return best(exact);
  if (opts.exactOnly || NOT_THE_SAME_APP.has(name)) return null;
  const prefix = apps.filter((a) => {
    const b = brand(a.title);
    return (own.length >= 4 && appSlugify(a.title).startsWith(`${own}-`)) || (b.length >= 5 && own.startsWith(`${b}-`));
  });
  const hit = best(prefix);
  if (hit) loose.push(`${name} → ${hit.title}`);
  return hit;
}

function appTarget(catSlug: string, appleId: number, name: string): Target | null {
  const id = appleId > 0 ? String(appleId) : null;
  // 1. The app's card in its own topic's rating, by App Store id.
  if (id) {
    const slug = ratingAppSlug(catSlug, id);
    if (slug) return `${catSlug}/${slug}`;
  }
  // 2. By name in the same topic: the old catalogue has no App Store id for most apps and keeps
  //    the short brand name («Bumble»), the rating the store title («Bumble Dating App: Meet &
  //    Date»). Exact brand first, then a prefix; ties go to the app with the most ratings.
  const niche = getRatingNiche("en", catSlug);
  if (niche) {
    const hit = matchByName(niche.apps, name);
    if (hit) return `${catSlug}/${hit.slug}`;
  }
  // 3. The same App Store app rated in another topic.
  if (id) {
    const other = ratingAppNiches("en", id)[0];
    if (other) return `${other.niche}/${other.appSlug}`;
  }
  // 4. The same brand rated in another topic (exact brand only: Strava sits under running).
  for (const card of listRatingNiches("en")) {
    const other = card.slug === catSlug ? null : getRatingNiche("en", card.slug);
    const hit = other ? matchByName(other.apps, name, { exactOnly: true }) : null;
    if (hit) return `${card.slug}/${hit.slug}`;
  }
  // 5. The topic's rating, else nothing (the proxy then sends the whole rating).
  return hasRatingNiche(catSlug) ? catSlug : null;
}

const apps: Record<string, Target> = {};
const stats = { pages: 0, card: 0, topic: 0, none: 0 };
for (const cs of topics) {
  const cat = getCategoryBySlug(cs, "en");
  if (!cat) continue;
  for (const a of cat.apps) {
    if (!a.productId || !hasInsight(a.productId)) continue;
    const slug = getSlugByProductId(a.productId);
    if (!slug || apps[slug]) continue;
    stats.pages++;
    // "" = no rated topic (astrology): the proxy sends the whole rating.
    const target = appTarget(cs, Number(a.appleId) || 0, a.name) ?? "";
    apps[slug] = target;
    if (!target) stats.none++;
    else if (target.includes("/")) stats.card++;
    else stats.topic++;
  }
}

const ratingTopics = topics.filter((s) => hasRatingNiche(s));

const sortedApps = Object.fromEntries(Object.entries(apps).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const body =
  `// GENERATED by scripts/v2/build-legacy-redirects.ts — do not edit by hand.\n` +
  `// Where the retired old site's URLs lead (docs/site-v2/ARCHITECTURE.md §1 «Retired old site»).\n` +
  `// Pages ${stats.pages}: ${stats.card} app cards in the rating, ${stats.topic} topic ratings, ${stats.none} to the whole rating.\n\n` +
  `/** The old site's 72 active topics (old ideas are "<topic>-<n>"). */\n` +
  `export const LEGACY_TOPICS: ReadonlySet<string> = new Set(${JSON.stringify(topics, null, 2)});\n\n` +
  `/** Old topics that have a rating page (/<L>/rating/<topic>). */\n` +
  `export const LEGACY_RATING_TOPICS: ReadonlySet<string> = new Set(${JSON.stringify(ratingTopics, null, 2)});\n\n` +
  `/** Old per-app page slug (/<ru|en>/<slug>) → "<niche>/<app slug>" (rating card), "<niche>" (topic rating) or "" (the rating). */\n` +
  `export const LEGACY_APPS: Readonly<Record<string, string>> = ${JSON.stringify(sortedApps, null, 2)};\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(OUT, "utf8");
  if (current !== body) {
    console.error(`${path.relative(process.cwd(), OUT)} is stale: run npx tsx scripts/v2/build-legacy-redirects.ts`);
    process.exit(1);
  }
  console.log("legacy redirects: up to date", stats);
} else {
  writeFileSync(OUT, body);
  console.log("wrote", path.relative(process.cwd(), OUT), stats);
  if (process.argv.includes("--verbose")) console.log(`prefix matches (check by eye):\n  ${loose.join("\n  ")}`);
}
