#!/usr/bin/env node

// Assemble v2 review-theme output into the shipped index and per-app evidence
// files. String theme IDs are the source of truth; numeric tags are supported
// only for legacy output. Invalid or incomplete assignments are rejected rather
// than silently truncating the corpus.

import fs from "node:fs";

const clean = (value) =>
  typeof value === "string"
    ? value.replace(/[—–]/g, " ").replace(/;/g, ",").replace(/[ \t]+/g, " ").trim()
    : value;

const FALLBACKS = {
  "other-love": { id: "other-love", name: "общая положительная оценка", nameEn: "overall positive experience", polarity: "love", fallback: true },
  "other-mixed": { id: "other-mixed", name: "смешанная оценка без конкретной причины", nameEn: "mixed experience without a specific reason", polarity: "mixed", fallback: true },
  "other-pain": { id: "other-pain", name: "негативный опыт без конкретной причины", nameEn: "negative experience without a specific reason", polarity: "pain", fallback: true },
};

const names = {};
const icons = {};
try {
  for (const file of fs.readdirSync("src/data/peoplesRating").filter((name) => name.endsWith(".json"))) {
    const slug = file.replace(".json", "");
    const data = JSON.parse(fs.readFileSync(`src/data/peoplesRating/${file}`, "utf8"));
    names[slug] = { name: data.name, nameEn: data.nameEn || data.name };
    icons[slug] = Object.fromEntries((data.apps || []).filter((app) => app.icon).map((app) => [String(app.id), app.icon]));
  }
} catch {
  // The review pages still work without rating metadata.
}

const planned = {};
try {
  for (const item of JSON.parse(fs.readFileSync("gen/rev-manifest-all.json", "utf8"))) {
    planned[item.slug] = (planned[item.slug] || 0) + 1;
  }
} catch {
  // A partial local run can assemble without the full manifest.
}

const root = "gen/rev-out";
const slugs = fs.existsSync(root)
  ? fs.readdirSync(root).filter((entry) => fs.statSync(`${root}/${entry}`).isDirectory())
  : [];
const index = {};
const errors = [];
let appCount = 0;
let reviewCount = 0;

fs.mkdirSync("public/reviews", { recursive: true });

for (const slug of slugs) {
  const apps = [];
  fs.mkdirSync(`public/reviews/${slug}`, { recursive: true });
  for (const file of fs.readdirSync(`${root}/${slug}`).filter((name) => name.endsWith(".json"))) {
    const sourcePath = `gen/rev-src/${slug}/${file}`;
    const outputPath = `${root}/${slug}/${file}`;
    let output;
    let source;
    try {
      output = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    } catch (error) {
      errors.push(`${slug}/${file}: unreadable JSON (${error.message})`);
      continue;
    }

    if (!Array.isArray(output.themes) || !Array.isArray(output.tags) || !Array.isArray(source.reviews)) {
      errors.push(`${slug}/${file}: missing themes, tags, or source reviews`);
      continue;
    }
    if (output.tags.length !== source.reviews.length) {
      errors.push(`${slug}/${file}: ${output.tags.length} tags for ${source.reviews.length} reviews`);
      continue;
    }

    const themes = output.themes.map((theme, index) => ({
      id: String(theme.id || `legacy-${index}`),
      name: clean(theme.name),
      nameEn: clean(theme.nameEn || theme.name),
      polarity: ["love", "pain", "mixed"].includes(theme.polarity) ? theme.polarity : "mixed",
      count: 0,
      ...(theme.fallback ? { fallback: true } : {}),
    }));
    const ids = themes.map((theme) => theme.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(`${slug}/${file}: duplicate theme ids`);
      continue;
    }
    if (themes.some((theme) => !theme.name || !theme.nameEn)) {
      errors.push(`${slug}/${file}: empty theme name`);
      continue;
    }
    const byId = new Map(themes.map((theme) => [theme.id, theme]));
    const reviews = [];
    let invalidTag = null;

    for (let i = 0; i < source.reviews.length; i++) {
      const tag = output.tags[i];
      let theme;
      if (typeof tag === "number") theme = themes[tag];
      else if (typeof tag === "string") {
        theme = byId.get(tag);
        if (!theme && FALLBACKS[tag]) {
          theme = { ...FALLBACKS[tag], count: 0 };
          themes.push(theme);
          byId.set(tag, theme);
        }
      }
      if (!theme) {
        invalidTag = `${String(tag)} at review ${i}`;
        break;
      }
      theme.count++;
      reviews.push({ rating: source.reviews[i].rating, text: clean(source.reviews[i].text), theme: theme.name });
    }
    if (invalidTag) {
      errors.push(`${slug}/${file}: invalid tag ${invalidTag}`);
      continue;
    }

    const keptThemes = themes
      .filter((theme) => theme.count > 0)
      .map((theme) => ({
        name: theme.name,
        nameEn: theme.nameEn,
        polarity: theme.polarity,
        count: theme.count,
        ...(theme.fallback ? { fallback: true } : {}),
      }))
      .sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count);
    const id = String(output.id);
    const icon = icons[slug]?.[id];
    const app = {
      id,
      title: output.title || source.title,
      total: reviews.length,
      themes: keptThemes,
      ...(icon ? { icon } : {}),
    };
    apps.push(app);
    fs.writeFileSync(
      `public/reviews/${slug}/${id}.json`,
      JSON.stringify({ id, title: app.title, themes: keptThemes, reviews }),
    );
    appCount++;
    reviewCount += reviews.length;
  }

  apps.sort((a, b) => b.total - a.total);
  if (apps.length) {
    index[slug] = {
      name: names[slug]?.name || slug,
      nameEn: names[slug]?.nameEn || slug,
      appsPlanned: Math.max(planned[slug] || 0, apps.length),
      apps,
    };
  }
}

if (errors.length) {
  console.error(`Rejected ${errors.length} app outputs:`);
  for (const error of errors.slice(0, 50)) console.error(`- ${error}`);
  if (errors.length > 50) console.error(`- …and ${errors.length - 50} more`);
  process.exitCode = 1;
} else {
  fs.writeFileSync("src/data/reviewsIndex.json", JSON.stringify(index, null, 1));
  const plannedNiches = Object.keys(planned).length || Object.keys(index).length;
  const plannedApps = Object.values(planned).reduce((sum, count) => sum + count, 0) || appCount;
  fs.writeFileSync(
    "src/data/reviewsProgress.json",
    JSON.stringify(
      {
        nichesDone: Object.keys(index).length,
        nichesPlanned: plannedNiches,
        appsDone: appCount,
        appsPlanned: plannedApps,
        reviews: reviewCount,
        updatedAt: new Date().toISOString().slice(0, 10),
      },
      null,
      1,
    ),
  );
  console.log(`reviewsIndex: ${Object.keys(index).length} niches, ${appCount} apps, ${reviewCount} reviews`);
}
