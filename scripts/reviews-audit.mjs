#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "src/data/reviewsIndex.json");
const INDEX = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const json = process.argv.includes("--json");
const strict = process.argv.includes("--strict");

const CATCHALL = /^(прочее|other|другое|остальное|разное\b|misc\b|общая оценка|general (rating|experience)|нет конкретики|без конкретики)/i;
const isFallback = (theme) => Boolean(theme.fallback);
const isOpaqueCatchall = (theme) => !isFallback(theme) && (CATCHALL.test(theme.name) || CATCHALL.test(theme.nameEn || ""));
const round = (n, digits = 2) => Number(n.toFixed(digits));

const report = {
  totals: { niches: 0, apps: 0, reviews: 0, themes: 0 },
  consistency: { missingFiles: 0, countMismatches: 0, orphanAssignments: 0 },
  quality: {
    opaqueCatchallReviews: 0,
    opaqueCatchallSharePct: 0,
    appsWithOpaqueCatchall: 0,
    fallbackReviews: 0,
    fallbackSharePct: 0,
    appsWithFallback: 0,
    specificCoveragePct: 0,
    dominantThemeApps: 0,
    severePolarityConflicts: 0,
    reviewsInsideSevereConflicts: 0,
  },
  worstOpaqueCatchalls: [],
  largestFallbacks: [],
  severeConflicts: [],
};

report.totals.niches = Object.keys(INDEX).length;

for (const [slug, niche] of Object.entries(INDEX)) {
  for (const app of niche.apps) {
    report.totals.apps++;
    report.totals.reviews += app.total;
    report.totals.themes += app.themes.length;

    const file = path.join(ROOT, "public/reviews", slug, `${app.id}.json`);
    if (!fs.existsSync(file)) {
      report.consistency.missingFiles++;
      continue;
    }

    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const reviews = Array.isArray(data.reviews) ? data.reviews : [];
    const byTheme = new Map();
    for (const review of reviews) {
      const stat = byTheme.get(review.theme) || { count: 0, stars: 0, positive: 0, negative: 0 };
      stat.count++;
      stat.stars += review.rating;
      stat.positive += review.rating >= 4 ? 1 : 0;
      stat.negative += review.rating <= 2 ? 1 : 0;
      byTheme.set(review.theme, stat);
    }

    const indexed = app.themes.reduce((sum, theme) => sum + theme.count, 0);
    if (indexed !== app.total || reviews.length !== app.total) report.consistency.countMismatches++;
    for (const [name, stat] of byTheme) {
      if (!app.themes.some((theme) => theme.name === name)) report.consistency.orphanAssignments += stat.count;
    }

    let opaqueCatchall = 0;
    let fallback = 0;
    for (const theme of app.themes) {
      const stat = byTheme.get(theme.name);
      if (!stat) continue;
      if (isOpaqueCatchall(theme)) opaqueCatchall += stat.count;
      if (isFallback(theme)) fallback += stat.count;

      const positiveShare = stat.positive / stat.count;
      const negativeShare = stat.negative / stat.count;
      const conflict =
        stat.count >= 8 &&
        ((theme.polarity === "pain" && positiveShare >= 0.8) ||
          (theme.polarity === "love" && negativeShare >= 0.8));
      if (conflict && !isFallback(theme) && !isOpaqueCatchall(theme)) {
        report.quality.severePolarityConflicts++;
        report.quality.reviewsInsideSevereConflicts += stat.count;
        report.severeConflicts.push({
          slug,
          appId: app.id,
          app: app.title,
          theme: theme.name,
          polarity: theme.polarity,
          reviews: stat.count,
          averageRating: round(stat.stars / stat.count),
          positiveSharePct: round(positiveShare * 100, 1),
          negativeSharePct: round(negativeShare * 100, 1),
        });
      }
    }

    if (opaqueCatchall > 0) {
      report.quality.appsWithOpaqueCatchall++;
      report.quality.opaqueCatchallReviews += opaqueCatchall;
      report.worstOpaqueCatchalls.push({
        slug,
        appId: app.id,
        app: app.title,
        reviews: opaqueCatchall,
        sharePct: round((opaqueCatchall / app.total) * 100, 1),
      });
    }
    if (fallback > 0) {
      report.quality.appsWithFallback++;
      report.quality.fallbackReviews += fallback;
      report.largestFallbacks.push({
        slug,
        appId: app.id,
        app: app.title,
        reviews: fallback,
        sharePct: round((fallback / app.total) * 100, 1),
      });
    }

    const largest = Math.max(0, ...app.themes.map((theme) => theme.count));
    if (app.total && largest / app.total >= 0.65) report.quality.dominantThemeApps++;
  }
}

report.quality.opaqueCatchallSharePct = round((report.quality.opaqueCatchallReviews / Math.max(report.totals.reviews, 1)) * 100);
report.quality.fallbackSharePct = round((report.quality.fallbackReviews / Math.max(report.totals.reviews, 1)) * 100);
report.quality.specificCoveragePct = round(100 - report.quality.fallbackSharePct - report.quality.opaqueCatchallSharePct);
report.worstOpaqueCatchalls.sort((a, b) => b.sharePct - a.sharePct || b.reviews - a.reviews);
report.largestFallbacks.sort((a, b) => b.sharePct - a.sharePct || b.reviews - a.reviews);
report.severeConflicts.sort((a, b) => b.reviews - a.reviews);
report.worstOpaqueCatchalls = report.worstOpaqueCatchalls.slice(0, 30);
report.largestFallbacks = report.largestFallbacks.slice(0, 30);
report.severeConflicts = report.severeConflicts.slice(0, 50);

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("Review theme quality audit");
  console.log(report.totals);
  console.log(report.consistency);
  console.log(report.quality);
  console.log("\nWorst opaque catchalls");
  console.table(report.worstOpaqueCatchalls);
  console.log("\nLargest honest fallbacks");
  console.table(report.largestFallbacks);
  console.log("\nSevere polarity conflicts");
  console.table(report.severeConflicts);
}

if (
  strict &&
  (report.consistency.missingFiles ||
    report.consistency.countMismatches ||
    report.consistency.orphanAssignments ||
    report.quality.severePolarityConflicts)
) {
  process.exitCode = 1;
}
