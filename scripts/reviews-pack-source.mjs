import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

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
const archiveOverrides = {};

const reviewKey = (review) => `${review.rating}|${review.text.normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()}`;

for (const [slug, apps] of [...byNiche.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  apps.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  niches[slug] = apps;
  indexedApps += apps.length;
  indexedReviews += apps.reduce((sum, app) => sum + app.total, 0);

  const rawApps = [];
  for (const app of apps) {
    const detailedPath = path.join(detailedRoot, slug, `${app.id}.json`);
    if (fs.existsSync(detailedPath)) {
      detailedApps++;
      const detailed = JSON.parse(fs.readFileSync(detailedPath, "utf8"));
      if (detailed.reviews?.length === app.total) continue;

      const sourcePath = path.join(sourceRoot, slug, `${app.id}.json`);
      const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
      const themesByReview = new Map();
      for (const review of detailed.reviews || []) {
        const key = reviewKey(review);
        const themes = themesByReview.get(key) || [];
        themes.push(review.theme);
        themesByReview.set(key, themes);
      }
      let matched = 0;
      const repaired = source.reviews.map((review) => {
        const themes = themesByReview.get(reviewKey(review));
        const theme = themes?.shift();
        if (theme) matched++;
        return theme ? { ...review, theme } : review;
      });
      if (matched !== detailed.reviews.length || repaired.length !== app.total) {
        throw new Error(`${slug}/${app.id}: could not merge ${detailed.reviews.length} labelled reviews into ${app.total} source reviews (matched ${matched})`);
      }
      rawApps.push({ id: app.id, reviews: repaired });
      (archiveOverrides[slug] ||= []).push(app.id);
      repairedApps++;
      repairedReviews += repaired.length;
      continue;
    }

    const sourcePath = path.join(sourceRoot, slug, `${app.id}.json`);
    const source = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
    if (!Array.isArray(source.reviews) || source.reviews.length !== app.total) {
      throw new Error(`${slug}/${app.id}: manifest=${app.total}, source=${source.reviews?.length ?? "missing"}`);
    }
    rawApps.push({ id: app.id, reviews: source.reviews });
    archivedApps++;
    archivedReviews += source.reviews.length;
  }

  if (rawApps.length > 0) {
    const payload = Buffer.from(JSON.stringify({ apps: rawApps }));
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
  archiveFiles: fs.readdirSync(archiveRoot).filter((name) => name.endsWith(".json.gz")).length,
}, null, 2));
