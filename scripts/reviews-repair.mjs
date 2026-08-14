#!/usr/bin/env node

// Conservative repair for the already-shipped corpus. It never invents a
// specific subject. It fixes known theme-order permutations, splits broad
// catchalls by observed sentiment, and moves only overwhelming polarity
// contradictions into honest generic buckets.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_PATH = path.join(ROOT, "src/data/reviewsIndex.json");
const apply = process.argv.includes("--apply");
const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const CATCHALL = /^(прочее|other|другое|остальное|разное\b|misc\b|общая оценка|general (rating|experience)|нет конкретики|без конкретики)/i;

const FALLBACKS = {
  love: { name: "общая положительная оценка", nameEn: "overall positive experience", polarity: "love", fallback: true },
  pain: { name: "негативный опыт без конкретной причины", nameEn: "negative experience without a specific reason", polarity: "pain", fallback: true },
  mixed: { name: "смешанная оценка без конкретной причины", nameEn: "mixed experience without a specific reason", polarity: "mixed", fallback: true },
};

// In these two outputs the model discovered good themes but reordered the
// theme array after producing numeric tags. Mapping the current cluster label
// to its actual meaning recovers the specific evidence before generic repair.
const KNOWN_ORDER_FIXES = {
  "guitar-tuner-learn/310457191": {
    "простота и надёжность": "альтернативные строи",
    "альтернативные строи": "реклама перекрывает кнопки",
    "реклама перекрывает кнопки": "простота и надёжность",
  },
  "travel-planning/434832826": {
    "гиды которые делают тур незабываемым": "жалобы на мошеннические туры и поддельные билеты",
    "жалобы на мошеннические туры и поддельные билеты": "гиды которые делают тур незабываемым",
  },
};

const isCatchall = (theme) => theme?.fallback || CATCHALL.test(theme?.name || "") || CATCHALL.test(theme?.nameEn || "");
const bucketForRating = (rating) => (rating >= 4 ? "love" : rating <= 2 ? "pain" : "mixed");
const stableJson = (value, pretty = false) => JSON.stringify(value, null, pretty ? 1 : 0);

let changedApps = 0;
let changedReviews = 0;
let catchallReviews = 0;
let suspectReviews = 0;
let knownOrderReviews = 0;
const touchedFiles = [];

for (const [slug, niche] of Object.entries(index)) {
  for (const app of niche.apps) {
    const key = `${slug}/${app.id}`;
    const file = path.join(ROOT, "review-data/reviews", slug, `${app.id}.json`);
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const definitions = new Map(app.themes.map((theme) => [theme.name, { ...theme }]));
    const knownFixCandidate = KNOWN_ORDER_FIXES[key] || null;
    const initialGrouped = new Map();
    for (const review of data.reviews) {
      const stat = initialGrouped.get(review.theme) || { count: 0, positive: 0, negative: 0 };
      stat.count++;
      stat.positive += review.rating >= 4 ? 1 : 0;
      stat.negative += review.rating <= 2 ? 1 : 0;
      initialGrouped.set(review.theme, stat);
    }
    // A known order fix is applied only while its unmistakable polarity
    // contradiction is still present, making the repair pass idempotent.
    const needsKnownFix =
      knownFixCandidate &&
      Object.keys(knownFixCandidate).some((name) => {
        const theme = definitions.get(name);
        const stat = initialGrouped.get(name);
        if (!theme || !stat || stat.count < 8) return false;
        return (
          (theme.polarity === "pain" && stat.positive / stat.count >= 0.8) ||
          (theme.polarity === "love" && stat.negative / stat.count >= 0.8)
        );
      });
    const knownFix = needsKnownFix ? knownFixCandidate : null;

    let appChanged = false;
    let reviews = data.reviews.map((review) => {
      const target = knownFix?.[review.theme];
      if (!target) return { ...review };
      appChanged = true;
      changedReviews++;
      knownOrderReviews++;
      return { ...review, theme: target };
    });

    const grouped = new Map();
    for (const review of reviews) {
      const stat = grouped.get(review.theme) || { count: 0, positive: 0, negative: 0 };
      stat.count++;
      stat.positive += review.rating >= 4 ? 1 : 0;
      stat.negative += review.rating <= 2 ? 1 : 0;
      grouped.set(review.theme, stat);
    }

    const replacement = new Map();
    for (const [name, stat] of grouped) {
      const theme = definitions.get(name);
      if (!theme) continue;
      if (isCatchall(theme)) {
        replacement.set(name, "by-rating");
        catchallReviews += stat.count;
        continue;
      }
      if (stat.count < 8) continue;
      const positiveShare = stat.positive / stat.count;
      const negativeShare = stat.negative / stat.count;
      if (theme.polarity === "pain" && positiveShare >= 0.8) {
        replacement.set(name, "love");
        suspectReviews += stat.count;
      } else if (theme.polarity === "love" && negativeShare >= 0.8) {
        replacement.set(name, "pain");
        suspectReviews += stat.count;
      }
    }

    if (replacement.size) {
      reviews = reviews.map((review) => {
        const mode = replacement.get(review.theme);
        if (!mode) return review;
        const bucket = mode === "by-rating" ? bucketForRating(review.rating) : mode;
        const theme = FALLBACKS[bucket];
        if (review.theme === theme.name) return review;
        appChanged = true;
        changedReviews++;
        return { ...review, theme: theme.name };
      });
    }

    if (!appChanged) continue;

    const counts = new Map();
    for (const review of reviews) counts.set(review.theme, (counts.get(review.theme) || 0) + 1);
    const themes = [];
    for (const original of app.themes) {
      if (isCatchall(original)) continue;
      const count = counts.get(original.name) || 0;
      if (count) themes.push({ ...original, count });
    }
    for (const fallback of Object.values(FALLBACKS)) {
      const count = counts.get(fallback.name) || 0;
      if (count) themes.push({ ...fallback, count });
    }
    themes.sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count);

    app.themes = themes;
    data.themes = themes;
    data.reviews = reviews;
    changedApps++;
    touchedFiles.push(path.relative(ROOT, file));
    if (apply) fs.writeFileSync(file, stableJson(data));
  }
}

if (apply && changedApps) fs.writeFileSync(INDEX_PATH, stableJson(index, true));

console.log({
  mode: apply ? "applied" : "dry-run",
  changedApps,
  changedReviews,
  catchallReviews,
  suspectReviews,
  knownOrderReviews,
  touchedFiles: touchedFiles.length,
});
if (!apply) console.log("Run with --apply to write the repaired corpus.");
