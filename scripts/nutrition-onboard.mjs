// Onboard the 10 fresh Google-Play habit apps into nutrition-calories, replacing the
// old (partly iOS-only) roster. Writes insights.json, categories-meta.json,
// the categories.json roster (exactly 10) and app-slugs.json.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const R = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const W = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o));
const ASOF = new Date().toISOString().slice(0, 10);
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const SLUG = "nutrition-calories";

const metaList = JSON.parse(fs.readFileSync("/tmp/nutrition/meta.json", "utf8"));
const insights = R("src/data/insights.json");
const meta = R("src/data/categories-meta.json");
const cats = R("src/data/categories.json");
const slugs = R("src/data/app-slugs.json");

// locate the category + drop its old meta keys/roster
let cat = null;
for (const d of cats) { const c = (d.categories || []).find((x) => x.slug === SLUG); if (c) cat = c; }
for (const k of Object.keys(meta)) if (k.startsWith(`${SLUG}:`)) delete meta[k];
cat.apps = [];
if (cat.ru) cat.ru.kicker = "MyFitnessPal, Yazio, FatSecret — счёт калорий и питание";
if (cat.en) cat.en.kicker = "MyFitnessPal, Yazio, FatSecret — calorie & nutrition tracking";

for (const m of metaList) {
  const pid = m.pid;
  const out = JSON.parse(fs.readFileSync(`/tmp/nutrition/out/${pid}.json`, "utf8"));
  const ins = (out.product || []).map((c, i) => ({
    id: `${pid}-${i}`, category: "strategic", title: c.title,
    story: [c.plus, c.minus].filter(Boolean).join(" / "), who: [], featureArea: "", novelty: "medium",
    evidence: (c.quotes || []).map((q) => ({ rating: Number(q.rating) || 0, date: ASOF, reviewId: "", quote: q.quote })),
    observationCount: Number(c.count) || 1, theme: c.kind === "base" ? "payment" : "strategy", implies: "",
  }));
  const entry = {
    productId: pid, reviewsScanned: 500, ratingBreakdown: m.rb, pipeline: "reextract",
    asOf: ASOF, sampleSize: 500, balanced: true, insights: ins, personaPatterns: [], commodityBaseline: [],
  };
  const idx = insights.findIndex((p) => p.productId === pid);
  if (idx >= 0) insights[idx] = entry; else insights.push(entry);

  meta[`${SLUG}:${m.name}`] = {
    query: m.name, name: m.name, icon: m.icon || "", appleId: 0, bundleId: m.pkg || "",
    developer: "", productId: pid, screenshots: m.screenshots || [],
  };
  cat.apps.push(m.name);
  const slug = kebab(m.name);
  slugs[slug] = pid;
  console.log("onboarded", m.name, "→ slug:", slug, "insights:", ins.length);
}

W("src/data/insights.json", insights);
W("src/data/categories-meta.json", meta);
W("src/data/categories.json", cats);
W("src/data/app-slugs.json", slugs);
console.log("nutrition-calories roster now:", cat.apps.length, "apps");
