// Assemble freshly-invented ideas (/tmp/regen3/out) into ideas.json. Mechanisms
// and reviewGrid are taken from the real insight cards the agent referenced
// (mechIdx → segment-cards.json), so quotes/counts stay real. REPLACES ideas.json
// (backup kept in git) and clears the idea-cards overlay.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen3/out";
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const readOut = (n) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, n), "utf8"));
  } catch {
    return null;
  }
};
const ASOF = new Date().toISOString().slice(0, 10);

const segCards = J("src/data/segment-cards.json");
const seg = J("src/data/segment-insights.json");
const categories = J("src/data/categories.json");
const catName = {};
for (const d of categories) for (const c of d.categories || []) catName[c.slug] = c.ru?.name || c.slug;

const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : "");
const arr = (a) => (Array.isArray(a) ? a.map(clean).filter(Boolean) : []);

const ideas = [];
let ok = 0, miss = 0;

for (const slug of Object.keys(segCards)) {
  const out = readOut(`ideas-${slug}.json`);
  const product = segCards[slug]?.product || [];
  if (!out || !Array.isArray(out.ideas) || !product.length) {
    miss++;
    continue;
  }
  let n = 0;
  for (const it of out.ideas) {
    if (!clean(it.title)) continue;
    const idx = (it.mechIdx || []).filter((i) => Number.isInteger(i) && product[i]);
    const cards = idx.length ? idx.map((i) => product[i]) : product.slice(0, 3);
    const mechanisms = cards.map((c) => ({
      title: c.title,
      obsCount: c.count || 0,
      apps: c.apps || [],
      polarity: c.plus && !c.minus ? "love" : "pain",
    }));
    const reviewGrid = [];
    for (const c of cards) for (const e of c.evidence || []) reviewGrid.push({ rating: e.rating, quote: e.quoteRu || e.quote, app: e.app });
    const obs = mechanisms.reduce((s, m) => s + (m.obsCount || 0), 0);
    n++;
    ideas.push({
      slug: `${slug}-${n}`,
      category: slug,
      categoryName: catName[slug] || slug,
      title: clean(it.title),
      oneLiner: clean(it.oneLiner),
      asOf: ASOF,
      stats: { apps: seg[slug]?.appsCount || cards.length, reviews: seg[slug]?.reviewsScanned || 0, observations: obs },
      reviewGrid: reviewGrid.slice(0, 8),
      mechanisms,
      gap: clean(it.gap),
      idea: {
        pitch: clean(it.pitch),
        features: arr(it.features),
        antiFeatures: arr(it.antiFeatures),
        monetization: clean(it.monetization),
      },
    });
  }
  ok++;
}

if (ideas.length < 100) {
  console.log(JSON.stringify({ error: "too few ideas, aborting", ideas: ideas.length, ok, miss }));
  process.exit(1);
}

fs.writeFileSync(path.join(ROOT, "src/data/ideas.json"), JSON.stringify(ideas));
fs.writeFileSync(path.join(ROOT, "src/data/idea-cards.json"), "{}");
console.log(JSON.stringify({ ok, miss, ideas: ideas.length }));
