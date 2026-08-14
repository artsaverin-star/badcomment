import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { createCorpusLabeler, summarizeThemes } from "./lib/review-corpus-labeler.mjs";

const root = process.cwd();
const manifestPath = path.join(root, "gen", "rev-manifest-all.json");
const sourceRoot = path.join(root, "gen", "rev-src");
const detailedRoot = path.join(root, "public", "reviews");
const archiveRoot = path.join(root, "public", "reviews-source");
const indexPath = path.join(root, "src", "data", "reviewSourceIndex.json");

if (!fs.existsSync(manifestPath) || !fs.existsSync(sourceRoot)) {
  throw new Error("Missing gen/rev-manifest-all.json or gen/rev-src. Restore the review source dump before packing.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const labelReview = createCorpusLabeler();
const byNiche = new Map();
for (const item of manifest) {
  const apps = byNiche.get(item.slug) || [];
  apps.push({ id: String(item.id), title: item.title, total: Number(item.n) || 0 });
  byNiche.set(item.slug, apps);
}

fs.mkdirSync(archiveRoot, { recursive: true });
for (const name of fs.readdirSync(archiveRoot)) {
  if (name.endsWith(".json.gz")) fs.rmSync(path.join(archiveRoot, name));
}

const niches = {};
let indexedApps = 0;
let indexedReviews = 0;
let archivedApps = 0;
let archivedReviews = 0;
let detailedApps = 0;
let repairedApps = 0;
let repairedReviews = 0;
let labelledReviews = 0;
let specificLabelledReviews = 0;
let nicheLabelledReviews = 0;
let universalLabelledReviews = 0;
let fallbackLabelledReviews = 0;
let themeAssignments = 0;
const archiveOverrides = {};

const reviewKey = (review) => `${review.rating}|${review.text.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`;

for (const [slug, apps] of [...byNiche.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  apps.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  const indexedNicheApps = [];
  niches[slug] = indexedNicheApps;
  indexedApps += apps.length;
  indexedReviews += apps.reduce((sum, app) => sum + app.total, 0);

  const archivedNicheApps = [];
  for (const app of apps) {
    const detailedPath = path.join(detailedRoot, slug, `${app.id}.json`);
    const sourcePath = path.join(sourceRoot, slug, `${app.id}.json`);
    const hasDetailed = fs.existsSync(detailedPath);
    const detailed = hasDetailed ? JSON.parse(fs.readFileSync(detailedPath, "utf8")) : null;
    if (hasDetailed) {
      detailedApps++;
    }

    const source = detailed?.reviews?.length === app.total ? { reviews: detailed.reviews } : JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    if (!Array.isArray(source.reviews) || source.reviews.length !== app.total) {
      throw new Error(`${slug}/${app.id}: manifest=${app.total}, source=${source.reviews?.length ?? "missing"}`);
    }

    const deepThemeByReview = new Map();
    if (detailed) {
      for (const review of detailed.reviews || []) {
        const key = reviewKey(review);
        const assigned = deepThemeByReview.get(key) || [];
        assigned.push(review.theme);
        deepThemeByReview.set(key, assigned);
      }
      if (detailed.reviews?.length !== app.total) {
        repairedApps++;
        repairedReviews += app.total;
      }
    }

    let matchedDeepReviews = 0;
    const deepMetadata = new Map((detailed?.themes || []).map((theme) => [theme.name, { ...theme, scope: theme.fallback ? "fallback" : "app" }]));
    const metadata = new Map(deepMetadata);
    const labelled = source.reviews.map((review) => {
      const deepNames = deepThemeByReview.get(reviewKey(review));
      const deepName = deepNames?.shift();
      if (deepName) matchedDeepReviews++;
      const deepAssignment = deepName ? deepMetadata.get(deepName) : null;
      const corpusAssignments = labelReview(slug, review);
      const specific = [];
      if (deepAssignment && !deepAssignment.fallback) specific.push(deepAssignment);
      for (const assignment of corpusAssignments) if (!assignment.fallback && !specific.some((item) => item.name === assignment.name)) specific.push(assignment);
      const assignments = specific.length ? specific : [deepAssignment?.fallback ? deepAssignment : corpusAssignments[0]];
      for (const assignment of assignments) {
        metadata.set(assignment.name, assignment);
      }
      labelledReviews++;
      themeAssignments += assignments.length;
      if (specific.length) specificLabelledReviews++;
      else fallbackLabelledReviews++;
      const names = assignments.map((assignment) => assignment.name);
      return { rating: review.rating, text: review.text, theme: names[0], themes: names };
    });
    if (detailed && matchedDeepReviews !== detailed.reviews.length) {
      throw new Error(`${slug}/${app.id}: could not merge ${detailed.reviews.length} deep labels into source reviews (matched ${matchedDeepReviews})`);
    }
    const themes = summarizeThemes(labelled, metadata);
    nicheLabelledReviews += themes.filter((theme) => theme.scope === "niche").reduce((sum, theme) => sum + theme.count, 0);
    universalLabelledReviews += themes.filter((theme) => theme.scope === "universal").reduce((sum, theme) => sum + theme.count, 0);
    const specificReviews = labelled.filter((review) => review.themes.some((name) => !metadata.get(name)?.fallback)).length;
    indexedNicheApps.push({ ...app, themes, specificReviews, themeAssignments: themes.reduce((sum, theme) => sum + theme.count, 0), labelling: detailed ? "app+corpus" : "corpus" });
    archivedNicheApps.push({ id: app.id, reviews: labelled });
    archivedApps++;
    archivedReviews += source.reviews.length;
  }

  if (archivedNicheApps.length > 0) {
    const payload = Buffer.from(JSON.stringify({ apps: archivedNicheApps }));
    fs.writeFileSync(path.join(archiveRoot, `${slug}.json.gz`), gzipSync(payload, { level: 9 }));
  }
}

const index = {
  totalApps: indexedApps,
  totalReviews: indexedReviews,
  detailedApps,
  archivedApps,
  archivedReviews,
  repairedApps,
  repairedReviews,
  labelledReviews,
  specificLabelledReviews,
  nicheLabelledReviews,
  universalLabelledReviews,
  fallbackLabelledReviews,
  themeAssignments,
  archiveOverrides,
  niches,
};
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

console.log(JSON.stringify({
  niches: Object.keys(niches).length,
  indexedApps,
  indexedReviews,
  detailedApps,
  archivedApps,
  archivedReviews,
  repairedApps,
  repairedReviews,
  labelledReviews,
  specificLabelledReviews,
  nicheLabelledReviews,
  universalLabelledReviews,
  fallbackLabelledReviews,
  themeAssignments,
  archiveFiles: fs.readdirSync(archiveRoot).filter((name) => name.endsWith(".json.gz")).length,
}, null, 2));
