// Assemble sobriety category summary + ideas from the clustered fresh data.
//  /tmp/cal/summary.json  (category clusters with cardIdx into pool)
//  /tmp/cal/pool.json     (app cards with quotes)
//  /tmp/cal/ideas-out.json(ideas with mechIdx into summary.product)
// → segment-cards.json[sobriety] + ideas.json (sobriety entries).
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : "");
const arr = (a) => (Array.isArray(a) ? a.map(clean).filter(Boolean) : []);
const ASOF = new Date().toISOString().slice(0, 10);

const pool = J("/tmp/cal/pool.json").cards;
const byIdx = new Map(pool.map((c) => [c.i, c]));
const summary = J("/tmp/cal/summary.json").product || [];
const seg = J(path.join(ROOT, "src/data/segment-insights.json"))['calendars-tasks'] || {};

// Build category cards (product/hygiene) with real evidence from member quotes.
const product = [];
const hygiene = [];
const catCards = []; // ordered, for idea mechIdx reference
for (const cl of summary) {
  const members = (cl.cardIdx || []).map((i) => byIdx.get(i)).filter(Boolean);
  const ev = [];
  const apps = new Set();
  let count = 0;
  for (const m of members) {
    count += m.count || 1;
    if (m.app) apps.add(m.app);
    for (const q of m.quotes || []) if (clean(q.quote)) ev.push({ rating: Number(q.rating) || 0, quote: q.quote, app: m.app });
  }
  const card = {
    title: clean(cl.title),
    plus: clean(cl.plus) || undefined,
    minus: clean(cl.minus) || undefined,
    count: count || members.length,
    apps: [...apps].slice(0, 3),
    evidence: ev.slice(0, 40),
  };
  catCards.push({ ...card, kind: cl.kind });
  (cl.kind === "base" ? hygiene : product).push(card);
}
const segCards = J(path.join(ROOT, "src/data/segment-cards.json"));
segCards['calendars-tasks'] = { product, hygiene };
fs.writeFileSync(path.join(ROOT, "src/data/segment-cards.json"), JSON.stringify(segCards));

// Ideas
const ideasOut = J("/tmp/cal/ideas-out.json").ideas || [];
const ideas = [];
let n = 0;
for (const it of ideasOut) {
  if (!clean(it.title)) continue;
  const idx = (it.mechIdx || []).filter((i) => Number.isInteger(i) && catCards[i]);
  const mechs = (idx.length ? idx.map((i) => catCards[i]) : catCards.slice(0, 3));
  const mechanisms = mechs.map((c) => ({ title: c.title, obsCount: c.count || 0, apps: c.apps || [], polarity: c.plus && !c.minus ? "love" : "pain" }));
  const reviewGrid = [];
  for (const c of mechs) for (const e of c.evidence || []) reviewGrid.push({ rating: e.rating, quote: e.quote, app: e.app });
  const obs = mechanisms.reduce((s, m) => s + (m.obsCount || 0), 0);
  n++;
  ideas.push({
    slug: `calendars-tasks-${n}`,
    category: "calendars-tasks",
    categoryName: "Календари и задачи",
    title: clean(it.title),
    oneLiner: clean(it.oneLiner),
    asOf: ASOF,
    stats: { apps: seg.appsCount || mechs.length, reviews: seg.reviewsScanned || 0, observations: obs },
    reviewGrid: reviewGrid.slice(0, 8),
    mechanisms,
    gap: clean(it.gap),
    idea: { pitch: clean(it.pitch), features: arr(it.features), antiFeatures: arr(it.antiFeatures), monetization: clean(it.monetization) },
  });
}
// Merge: keep other categories' ideas, replace calendars-tasks ones.
const existing = J(path.join(ROOT, "src/data/ideas.json"));
const merged = existing.filter((i) => i.category !== "calendars-tasks").concat(ideas);
fs.writeFileSync(path.join(ROOT, "src/data/ideas.json"), JSON.stringify(merged));
console.log(JSON.stringify({ product: product.length, hygiene: hygiene.length, periodIdeas: ideas.length, totalIdeas: merged.length }));
