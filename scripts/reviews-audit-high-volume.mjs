#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createCorpusLabeler } from "./lib/review-corpus-labeler.mjs";

const root = process.cwd();
const index = JSON.parse(fs.readFileSync(path.join(root, "src", "data", "reviewSourceIndex.json"), "utf8"));
const requestedThreshold = Number(process.argv.find((arg) => arg.startsWith("--threshold="))?.split("=")[1] || 20);
const threshold = Number.isInteger(requestedThreshold) && requestedThreshold >= 1 ? requestedThreshold : 20;
const labelReview = createCorpusLabeler();
const failures = [];
const polarityConflicts = [];
const fallbackGroups = [];
const byScope = { app: 0, niche: 0, universal: 0, fallback: 0, unknown: 0 };
let groups = 0;
let assignments = 0;
let evidenceChecks = 0;
let longFallbackReviews = 0;

const fail = (message) => {
  if (failures.length < 100) failures.push(message);
};

for (const [slug, apps] of Object.entries(index.niches)) {
  const archivePath = path.join(root, "review-data", "reviews-source", `${slug}.json.gz`);
  const archive = JSON.parse(gunzipSync(fs.readFileSync(archivePath)).toString("utf8"));
  const reviewsByApp = new Map((archive.apps || []).map((app) => [String(app.id), app.reviews || []]));

  for (const app of apps) {
    const highThemes = app.themes.filter((theme) => Number(theme.count) > threshold);
    if (!highThemes.length) continue;
    const reviews = reviewsByApp.get(String(app.id)) || [];
    const tracked = new Map(highThemes.map((theme) => [theme.name, {
      ...theme,
      actual: 0,
      positive: 0,
      negative: 0,
      longFallbacks: 0,
    }]));

    groups += highThemes.length;
    for (const theme of highThemes) {
      const scope = theme.scope || "unknown";
      byScope[scope in byScope ? scope : "unknown"]++;
    }

    for (let reviewIndex = 0; reviewIndex < reviews.length; reviewIndex++) {
      const review = reviews[reviewIndex];
      const names = Array.isArray(review.themes) && review.themes.length
        ? [...new Set(review.themes)]
        : review.theme
          ? [review.theme]
          : [];
      const relevant = names.filter((name) => tracked.has(name));
      if (!relevant.length) continue;

      let reproduced;
      for (const name of relevant) {
        const stat = tracked.get(name);
        stat.actual++;
        assignments++;
        if (Number(review.rating) >= 4) stat.positive++;
        if (Number(review.rating) <= 2) stat.negative++;

        if (stat.fallback && String(review.text || "").trim().length >= 160) {
          stat.longFallbacks++;
          longFallbackReviews++;
        }

        if (stat.scope === "universal" || stat.scope === "niche" || stat.fallback) {
          reproduced ||= labelReview(slug, review).map((theme) => theme.name);
          evidenceChecks++;
          if (!reproduced.includes(name)) {
            fail(`${slug}/${app.id}#${reviewIndex}: high-volume topic "${name}" is not reproduced by the current labeler`);
          }
        }
      }
    }

    for (const stat of tracked.values()) {
      if (stat.actual !== Number(stat.count)) {
        fail(`${slug}/${app.id}: high-volume topic "${stat.name}" actual=${stat.actual}, summary=${stat.count}`);
      }

      const positiveShare = stat.actual ? stat.positive / stat.actual : 0;
      const negativeShare = stat.actual ? stat.negative / stat.actual : 0;
      const conflict =
        (stat.polarity === "pain" && positiveShare >= 0.85) ||
        (stat.polarity === "love" && negativeShare >= 0.85);
      if (conflict) {
        polarityConflicts.push({
          slug,
          appId: String(app.id),
          app: app.title,
          theme: stat.name,
          polarity: stat.polarity,
          count: stat.actual,
          positiveSharePct: Number((positiveShare * 100).toFixed(1)),
          negativeSharePct: Number((negativeShare * 100).toFixed(1)),
        });
      }

      if (stat.fallback) {
        fallbackGroups.push({
          slug,
          appId: String(app.id),
          app: app.title,
          theme: stat.name,
          count: stat.actual,
          longFallbacks: stat.longFallbacks,
          longSharePct: stat.actual ? Number(((stat.longFallbacks / stat.actual) * 100).toFixed(1)) : 0,
        });
      }
    }
  }
}

polarityConflicts.sort((a, b) => b.count - a.count);
fallbackGroups.sort((a, b) => b.longFallbacks - a.longFallbacks || b.count - a.count);
const conflictThemeCounts = new Map();
for (const conflict of polarityConflicts) {
  const current = conflictThemeCounts.get(conflict.theme) || { theme: conflict.theme, groups: 0, assignments: 0 };
  current.groups++;
  current.assignments += conflict.count;
  conflictThemeCounts.set(conflict.theme, current);
}
const polarityConflictThemes = [...conflictThemeCounts.values()]
  .sort((a, b) => b.groups - a.groups || b.assignments - a.assignments);

const report = {
  status: failures.length || polarityConflicts.length ? "attention" : "ok",
  thresholdExclusive: threshold,
  highVolumeGroups: groups,
  assignmentsReviewed: assignments,
  evidenceChecks,
  groupsByScope: byScope,
  highVolumeFallbackGroups: fallbackGroups.length,
  longFallbackReviews,
  polarityConflictGroups: polarityConflicts.length,
  polarityConflictThemes,
  failures,
  largestLongFallbackGroups: fallbackGroups.slice(0, 30),
  polarityConflicts: polarityConflicts.slice(0, 30),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
