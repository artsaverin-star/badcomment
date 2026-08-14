import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "reviewSourceIndex.json"), "utf8"));
const failures = [];
const counts = { niches: 0, apps: 0, reviews: 0, labelled: 0, specific: 0, niche: 0, universal: 0, fallback: 0, themeAssignments: 0 };

const fail = (message) => {
  failures.push(message);
  if (failures.length <= 25) console.error(`FAIL ${message}`);
};

for (const [slug, apps] of Object.entries(index.niches)) {
  counts.niches++;
  const archivePath = path.join(root, "public", "reviews-source", `${slug}.json.gz`);
  let archived = new Map();
  if (!fs.existsSync(archivePath)) {
    fail(`${slug}: archive is missing`);
  } else {
    const payload = JSON.parse(gunzipSync(fs.readFileSync(archivePath)).toString("utf8"));
    archived = new Map((payload.apps || []).map((app) => [String(app.id), app.reviews]));
  }

  for (const app of apps) {
    counts.apps++;
    const appKey = `${slug}/${app.id}`;
    if (!Array.isArray(app.themes) || app.themes.length === 0) fail(`${appKey}: no theme summary`);
    const themeNames = (app.themes || []).map((theme) => theme.name);
    if (themeNames.some((name) => typeof name !== "string" || !name.trim())) fail(`${appKey}: empty theme name`);
    if (new Set(themeNames).size !== themeNames.length) fail(`${appKey}: duplicate theme names`);

    const summaryTotal = (app.themes || []).reduce((sum, theme) => sum + Number(theme.count || 0), 0);
    if (summaryTotal !== app.themeAssignments) fail(`${appKey}: theme summary=${summaryTotal}, assignments=${app.themeAssignments}`);

    const reviews = archived.get(String(app.id)) || [];
    if (reviews.length !== app.total) fail(`${appKey}: review texts=${reviews.length}, expected=${app.total}`);
    const themes = new Map((app.themes || []).map((theme) => [theme.name, theme]));
    const actual = new Map();
    let appSpecific = 0;

    for (const [reviewIndex, review] of reviews.entries()) {
      counts.reviews++;
      if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) fail(`${appKey}#${reviewIndex}: invalid rating`);
      if (typeof review.text !== "string" || !review.text.trim()) fail(`${appKey}#${reviewIndex}: empty text`);
      if (!Array.isArray(review.themes) || review.themes.length === 0) {
        fail(`${appKey}#${reviewIndex}: missing per-review topics`);
        continue;
      }
      if (review.themes.some((name) => typeof name !== "string" || !name.trim())) fail(`${appKey}#${reviewIndex}: empty topic`);
      if (new Set(review.themes).size !== review.themes.length) fail(`${appKey}#${reviewIndex}: duplicate topics`);
      if (review.theme !== review.themes[0]) fail(`${appKey}#${reviewIndex}: primary topic is not the first topic`);
      counts.labelled++;

      let hasSpecific = false;
      let hasFallback = false;
      for (const name of review.themes) {
        counts.themeAssignments++;
        const theme = themes.get(name);
        if (!theme) {
          fail(`${appKey}#${reviewIndex}: topic "${name}" is absent from theme summary`);
          continue;
        }
        actual.set(name, (actual.get(name) || 0) + 1);
        if (theme.fallback) hasFallback = true;
        else hasSpecific = true;
        if (theme.scope === "niche") counts.niche++;
        if (theme.scope === "universal") counts.universal++;
      }
      if (hasSpecific && hasFallback) fail(`${appKey}#${reviewIndex}: fallback is mixed with specific topics`);
      if (hasSpecific) {
        counts.specific++;
        appSpecific++;
      } else if (hasFallback) counts.fallback++;
      else fail(`${appKey}#${reviewIndex}: neither a specific topic nor fallback`);
    }

    if (appSpecific !== app.specificReviews) fail(`${appKey}: specific reviews=${appSpecific}, expected=${app.specificReviews}`);
    for (const theme of app.themes || []) {
      if ((actual.get(theme.name) || 0) !== theme.count) {
        fail(`${appKey}: theme "${theme.name}" actual=${actual.get(theme.name) || 0}, summary=${theme.count}`);
      }
    }
  }
}

const expected = {
  niches: Object.keys(index.niches).length,
  apps: index.totalApps,
  reviews: index.totalReviews,
  labelled: index.labelledReviews,
  specific: index.specificLabelledReviews,
  niche: index.nicheLabelledReviews,
  universal: index.universalLabelledReviews,
  fallback: index.fallbackLabelledReviews,
  themeAssignments: index.themeAssignments,
};
for (const [key, value] of Object.entries(expected)) if (counts[key] !== value) fail(`global ${key}=${counts[key]}, expected=${value}`);
if (counts.specific + counts.fallback !== counts.reviews) fail("global specific + fallback does not equal reviews");

console.log(JSON.stringify({
  status: failures.length ? "failed" : "ok",
  ...counts,
  perReviewCoveragePct: counts.reviews ? Number(((counts.labelled / counts.reviews) * 100).toFixed(2)) : 0,
  specificCoveragePct: counts.reviews ? Number(((counts.specific / counts.reviews) * 100).toFixed(2)) : 0,
  avgTopicsPerReview: counts.reviews ? Number((counts.themeAssignments / counts.reviews).toFixed(3)) : 0,
  failures: failures.length,
}, null, 2));

if (failures.length) process.exitCode = 1;
