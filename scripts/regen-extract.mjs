// One-off: split the big synthesis files into small per-unit source slices that
// regeneration agents can Read cheaply. Output → /tmp/regen/src/*.json
//   cat-<slug>.json   — category items to rewrite into share-worthy +/- cards
//   ideas-<cat>.json  — a category's ideas to rewrite into share-worthy copy
//   app-<productId>.json — an app's top observations to rewrite
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen/src";
fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const seg = J("src/data/segment-insights.json");
const ideas = J("src/data/ideas.json");
const insights = J("src/data/insights.json");

const q2 = (ev) => (ev || []).slice(0, 2).map((e) => (e.quoteRu || e.quote || "").slice(0, 240)).filter(Boolean);
const avg = (ev) => (ev && ev.length ? ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length : 0);

// Categories
let nCat = 0;
for (const [slug, c] of Object.entries(seg)) {
  const items = (c.items || []).map((it) => ({
    id: it.id,
    theme: it.theme,
    title: it.title,
    body: it.body,
    count: it.observationCount,
    apps: (it.apps || []).slice(0, 3),
    quotes: q2(it.evidence),
  }));
  fs.writeFileSync(`${OUT}/cat-${slug}.json`, JSON.stringify({ kind: "category", slug, items }));
  nCat++;
}

// Ideas grouped by category
const byCat = {};
for (const i of ideas) (byCat[i.category] ||= []).push({ slug: i.slug, title: i.title, oneLiner: i.oneLiner, gap: i.gap });
let nIdea = 0;
for (const [cat, list] of Object.entries(byCat)) {
  fs.writeFileSync(`${OUT}/ideas-${cat}.json`, JSON.stringify({ kind: "ideas", category: cat, ideas: list }));
  nIdea++;
}

// Apps — top observations by cluster size
let nApp = 0;
for (const a of insights) {
  const obs = a.insights || [];
  if (!obs.length) continue;
  const top = [...obs]
    .sort((x, y) => (y.observationCount ?? y.evidence.length) - (x.observationCount ?? x.evidence.length))
    .slice(0, 18)
    .map((o) => ({
      id: o.id,
      theme: o.theme ?? null,
      title: o.title,
      story: o.story || "",
      count: o.observationCount ?? o.evidence.length,
      avgRating: Math.round(avg(o.evidence) * 10) / 10,
      quotes: q2(o.evidence),
    }));
  fs.writeFileSync(`${OUT}/app-${a.productId}.json`, JSON.stringify({ kind: "app", productId: a.productId, items: top }));
  nApp++;
}

console.log(JSON.stringify({ categories: nCat, ideaGroups: nIdea, apps: nApp, out: OUT }));
