// Builds src/site/sitedata/old-site.snapshot.json — a small, read-only digest of the OLD
// site's data that the new research pages link to (DECISIONS §3–§4, ARCHITECTURE §2 sitedata):
//
//   • names (ru/en) of the 72 active topics of the old site, exactly as the old topic page
//     shows them (peoplesRating name → review catalogue → categories.json);
//   • which topics have an old reviews hub (/<ru|en>/reviews/<slug>);
//   • per launch topic, which market-player apps (App Store id) have an old per-app page
//     (/<ru|en>/<app-slug>) and/or an old per-app review page (/<ru|en>/reviews/<slug>/<id>).
//
// Why a snapshot: the old loaders statically import ~80 MB of JSON (insights.json,
// reviewSourceIndex.json, peoplesRating/*). Pulling them into the new pages would bloat the
// server bundle and memory of the 2 GB box for a few booleans. The old data is frozen (the old
// site is hidden, DECISIONS §8), so a committed digest is exact. Re-run after old data changes:
//
//   npx tsx src/site/sitedata/build-old-site-snapshot.ts
//
// It uses the old site's own loaders (src/lib/**) so the rules match the old pages 1:1:
//   per-app page  = src/app/(old)/[slug]/page.tsx resolve(): hasInsight(pid) and the app is in
//                   an active category;
//   topic page    = src/app/(old)/segment/[slug]/page.tsx → NicheDossier: review corpus, rating set,
//                   dossier and thesis exist (e.g. `astrology` has no corpus and 404s);
//   reviews hub   = src/app/(old)/reviews/[slug]/page.tsx: getNiche(slug) != null;
//   app reviews   = src/app/(old)/reviews/[slug]/[id]/page.tsx: getApp(slug, id) && getNiche(slug).

import fs from "node:fs";
import path from "node:path";
import active from "@/data/active-categories.json";
import { DOSSIER_BY_SLUG } from "@/data/dossier";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import slugs from "@/data/app-slugs.json";
import { hasInsight } from "@/lib/readyApps";
import { getCategoryBySlug, listDomains } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getApp, getNiche, hasReviewCorpus } from "@/lib/reviews";
import { marketPlayersFor } from "@/lib/marketPlayers.server";
import { LAUNCH_CATEGORIES } from "../manifest.generated";
import type { OldSiteSnapshot } from "./types";

const ACTIVE = active as string[];
const RATING = RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string }>;
const DOSSIER = DOSSIER_BY_SLUG as Record<string, unknown>;

/** Mirrors the guards of the old topic page (NicheDossier). */
const hasOldTopicPage = (slug: string) =>
  hasReviewCorpus(slug) && !!RATING[slug] && !!DOSSIER[slug] && !!getNicheThesis(slug, "ru");
const SLUG_TO_PID = slugs as Record<string, string>;

function topicNames(slug: string): { ru: string; en: string } | null {
  const rating = RATING[slug];
  const niche = getNiche(slug);
  const cat = { ru: getCategoryBySlug(slug, "ru")?.name, en: getCategoryBySlug(slug, "en")?.name };
  const ru = rating?.name || niche?.name || cat.ru;
  const en = rating?.nameEn || niche?.nameEn || cat.en || ru;
  return ru && en ? { ru, en } : null;
}

// pid → category slugs (active only) that list it; appleId → pids (any category).
const pidInActive = new Set<string>();
const pidsByAppleId = new Map<string, Set<string>>();
for (const domain of listDomains("ru")) {
  for (const category of domain.categories) {
    for (const app of category.apps) {
      if (!app.productId) continue;
      if (ACTIVE.includes(category.slug)) pidInActive.add(app.productId);
      if (app.appleId) {
        const key = String(app.appleId);
        if (!pidsByAppleId.has(key)) pidsByAppleId.set(key, new Set());
        pidsByAppleId.get(key)!.add(app.productId);
      }
    }
  }
}
const slugsByPid = new Map<string, string[]>();
for (const [slug, pid] of Object.entries(SLUG_TO_PID)) {
  if (!slugsByPid.has(pid)) slugsByPid.set(pid, []);
  slugsByPid.get(pid)!.push(slug);
}

/** The old per-app page slug for an App Store id, or null (shortest working slug wins). */
function appPageSlug(appStoreId: string): string | null {
  const pids = new Set([...(pidsByAppleId.get(appStoreId) ?? []), `ext-${appStoreId}`]);
  const candidates: string[] = [];
  for (const pid of pids) {
    if (!hasInsight(pid) || !pidInActive.has(pid)) continue;
    candidates.push(...(slugsByPid.get(pid) ?? []));
  }
  candidates.sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
  return candidates[0] ?? null;
}

const snapshot: OldSiteSnapshot = {
  version: 1,
  generatedAt: new Date().toISOString().slice(0, 10),
  topics: {},
  topicPages: [],
  reviewHubs: [],
  apps: {},
};

for (const slug of ACTIVE) {
  const names = topicNames(slug);
  if (names) snapshot.topics[slug] = names;
  else console.warn(`[sitedata] no old name for ${slug}`);
  if (hasOldTopicPage(slug)) snapshot.topicPages.push(slug);
  if (getNiche(slug)) snapshot.reviewHubs.push(slug);
}

let pages = 0;
let reviewPages = 0;
for (const slug of LAUNCH_CATEGORIES) {
  const market = marketPlayersFor(slug);
  if (!market) {
    console.warn(`[sitedata] no market players for ${slug}`);
    continue;
  }
  const hub = !!getNiche(slug);
  const links: Record<string, { page?: string; reviews?: true }> = {};
  for (const app of market.apps) {
    const page = appPageSlug(app.appStoreId);
    const reviews = hub && !!getApp(slug, app.appStoreId);
    if (!page && !reviews) continue;
    links[app.appStoreId] = { ...(page ? { page } : {}), ...(reviews ? { reviews: true as const } : {}) };
    if (page) pages++;
    if (reviews) reviewPages++;
  }
  snapshot.apps[slug] = links;
}

snapshot.topicPages.sort();
snapshot.reviewHubs.sort();
const out = path.join(process.cwd(), "src/site/sitedata/old-site.snapshot.json");
fs.writeFileSync(out, JSON.stringify(snapshot, null, 1) + "\n");
console.log(
  `[sitedata] wrote ${path.relative(process.cwd(), out)}: ${Object.keys(snapshot.topics).length} topics, ` +
    `${snapshot.topicPages.length} topic pages, ${snapshot.reviewHubs.length} review hubs, ${pages} app pages, ${reviewPages} app review pages`,
);
