// Onboard Flo + Clue into period-cycle; drop dupe/thin apps from roster.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const R = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const W = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o));
const newMeta = JSON.parse(fs.readFileSync("/tmp/period/newmeta.json", "utf8"));
const ASOF = new Date().toISOString().slice(0, 10);
const kebab = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const SLUG = "period-cycle";
const DROP_PIDS = new Set(["ext-703547387", "ext-1459096552", "cmqaoza0v01bpugkx96t7fn3m"]); // Life, My Cycle, Cycles

const insights = R("src/data/insights.json");
const meta = R("src/data/categories-meta.json");
const cats = R("src/data/categories.json");
const slugs = R("src/data/app-slugs.json");

let cat = null;
for (const d of cats) { const c = (d.categories || []).find((x) => x.slug === SLUG); if (c) cat = c; }
// drop by productId (resolve query->pid via meta)
cat.apps = cat.apps.filter((q) => { const m = meta[`${SLUG}:${q}`]; return !(m && DROP_PIDS.has(m.productId)); });

for (const m of newMeta) {
  const pid = m.pid, name = m.name;
  const revs = JSON.parse(fs.readFileSync(`/tmp/period/src/${pid}.json`, "utf8"));
  const rb = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
  for (const r of revs) if (rb[String(r.rating)] != null) rb[String(r.rating)]++;
  const out = JSON.parse(fs.readFileSync(`/tmp/period/out/${pid}.json`, "utf8"));
  const ins = (out.product || []).map((c, i) => ({
    id: `${pid}-${i}`, category: "strategic", title: c.title, story: [c.plus, c.minus].filter(Boolean).join(" / "),
    who: [], featureArea: "", novelty: "medium",
    evidence: (c.quotes || []).map((q) => ({ rating: Number(q.rating) || 0, date: ASOF, reviewId: "", quote: q.quote })),
    observationCount: Number(c.count) || 1, theme: c.kind === "base" ? "payment" : "strategy", implies: "",
  }));
  const idx = insights.findIndex((p) => p.productId === pid);
  const entry = { productId: pid, reviewsScanned: 500, ratingBreakdown: rb, pipeline: "reextract", asOf: ASOF, sampleSize: 500, balanced: true, insights: ins, personaPatterns: [], commodityBaseline: [] };
  if (idx >= 0) insights[idx] = entry; else insights.push(entry);
  meta[`${SLUG}:${name}`] = { query: name, name, icon: m.icon || "", appleId: m.appleId, bundleId: "", developer: m.developer || "", productId: pid };
  cat.apps.push(name);
  const slug = `${kebab(name)}-${m.appleId}`;
  slugs[slug] = pid;
  console.log("onboarded", name, "slug:", slug, "insights:", ins.length);
}
W("src/data/insights.json", insights);
W("src/data/categories-meta.json", meta);
W("src/data/categories.json", cats);
W("src/data/app-slugs.json", slugs);
console.log("period-cycle roster now:", cat.apps.length, "apps");
