#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const source = JSON.parse(fs.readFileSync(path.join(root, "src/data/reviewSourceIndex.json"), "utf8"));
const failures = [];
const fail = (message) => failures.push(message);
const sourceSlugs = Object.keys(source.niches).sort();

const apps = Object.values(source.niches).flat();
const reviews = apps.reduce((sum, app) => sum + Number(app.total || 0), 0);
if (sourceSlugs.length !== 71) fail(`review niches=${sourceSlugs.length}, expected=71`);
if (apps.length !== source.totalApps) fail(`review apps=${apps.length}, index=${source.totalApps}`);
if (reviews !== source.totalReviews) fail(`reviews=${reviews}, index=${source.totalReviews}`);

// Paid content must never sit under /public, where Next would serve it without
// the page/API authorization checks.
for (const legacy of ["public/reviews", "public/reviews-source"]) {
  if (fs.existsSync(path.join(root, legacy))) fail(`${legacy} still exists and bypasses the review paywall`);
}

const privateArchive = path.join(root, "review-data/reviews-source");
const archiveSlugs = fs.readdirSync(privateArchive).filter((name) => name.endsWith(".json.gz")).map((name) => name.slice(0, -8)).sort();
if (JSON.stringify(archiveSlugs) !== JSON.stringify(sourceSlugs)) fail("private review archives do not match the source index niches");

// Every app in the editorial rating of a live niche must resolve to the source
// archive, so links from findings and verdicts cannot end in a dead source page.
const ratingsDir = path.join(root, "src/data/peoplesRating");
let linkedRatingApps = 0;
for (const slug of sourceSlugs) {
  const ratingPath = path.join(ratingsDir, `${slug}.json`);
  if (!fs.existsSync(ratingPath)) {
    fail(`${slug}: people's-rating file is missing`);
    continue;
  }
  const rating = JSON.parse(fs.readFileSync(ratingPath, "utf8"));
  const sourceIds = new Set(source.niches[slug].map((app) => String(app.id)));
  for (const app of rating.apps || []) {
    linkedRatingApps++;
    if (!sourceIds.has(String(app.id))) fail(`${slug}/${app.id}: rating app has no source-review page`);
  }
}

const accessSource = fs.readFileSync(path.join(root, "src/lib/reviewAccess.ts"), "utf8");
if (!/FREE_REVIEW_CATEGORY\s*=\s*["']dating-apps["']/.test(accessSource)) fail("dating-apps is not the single declared free review category");

// These are the concrete false-generic examples reported by the owner. Keep
// them as regression checks so a future relabelling pass cannot flatten them.
const examples = [
  { slug: "dating-apps", text: "Never got to use it", topics: [/аккаунт заблокировали/i, /поддержка не отвечает/i] },
  { slug: "dating-apps", text: "Hinge is a JOKE", topics: [/аккаунт заблокирован/i, /апелляция/i] },
  { slug: "food-delivery", text: "Love the food but delivery has been a nightmare", topics: [/доставка опаздывает/i, /испорчены/i] },
  { slug: "ride-hailing", text: "“Write to us”", topics: [/связаться с поддержкой/i, /войти или зарегистрироваться/i] },
];
const archives = new Map();
for (const example of examples) {
  if (!archives.has(example.slug)) {
    const payload = JSON.parse(gunzipSync(fs.readFileSync(path.join(privateArchive, `${example.slug}.json.gz`))).toString("utf8"));
    archives.set(example.slug, (payload.apps || []).flatMap((app) => app.reviews || []));
  }
  const review = archives.get(example.slug).find((item) => String(item.text || "").includes(example.text));
  if (!review) {
    fail(`${example.slug}: regression example not found: ${example.text}`);
    continue;
  }
  const labels = review.themes || [review.theme].filter(Boolean);
  for (const topic of example.topics) if (!labels.some((label) => topic.test(label))) fail(`${example.slug}: "${example.text}" lacks expected topic ${topic}`);
  if (labels.some((label) => /без конкретной причины/i.test(label))) fail(`${example.slug}: "${example.text}" regressed to a generic fallback`);
}

console.log(JSON.stringify({
  status: failures.length ? "failed" : "ok",
  niches: sourceSlugs.length,
  apps: source.totalApps,
  reviews: source.totalReviews,
  linkedRatingApps,
  freeReviewCategory: "dating-apps",
  regressionExamples: examples.length,
  failures,
}, null, 2));

if (failures.length) process.exitCode = 1;
