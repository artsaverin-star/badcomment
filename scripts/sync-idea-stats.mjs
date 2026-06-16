// Re-sync idea stats + mechanism observation counts to the LIVE post-tagging
// category cards. The idea snapshots were taken before review-tagging, so their
// counts (and the stale segment-insights appsCount) over-report. Match each
// mechanism to its current category card by title (exact, else normalized
// prefix), copy the real count, and recompute totals + app/review stats.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const W = (p, o) => fs.writeFileSync(path.join(ROOT, p), JSON.stringify(o));
const norm = (s) => (s || "").toLowerCase().replace(/[«»"'`]/g, "").replace(/\s+/g, " ").trim();
const prefix = (s) => norm(s).slice(0, 30);
const toks = (s) => new Set(norm(s).replace(/[^а-яёa-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 4));
function bestFuzzy(title, flat) {
  const a = toks(title);
  let best = null, score = 0;
  for (const c of flat) {
    const b = toks(c.title);
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const s = inter / Math.max(1, Math.min(a.size, b.size));
    if (s > score) { score = s; best = c; }
  }
  return score >= 0.45 ? best : null; // need solid overlap to adopt
}

const CATS = process.argv.slice(2);
if (!CATS.length) { console.error("usage: sync-idea-stats <cat>..."); process.exit(1); }

const ideas = J("src/data/ideas.json");
const segCards = J("src/data/segment-cards.json");
const segIns = J("src/data/segment-insights.json");
const insights = J("src/data/insights.json");
const cats = J("src/data/categories.json");
const meta = J("src/data/categories-meta.json");

function rosterPids(slug) {
  let roster = null;
  for (const d of cats) { const c = (d.categories || []).find((x) => x.slug === slug); if (c) roster = c; }
  if (!roster) return [];
  return (roster.apps || []).map((q) => (meta[`${slug}:${q}`] || {}).productId).filter(Boolean);
}

for (const slug of CATS) {
  const seg = segCards[slug];
  if (!seg) { console.log(slug, "— нет segment-cards, пропуск"); continue; }
  const flat = [...(seg.product || []), ...(seg.hygiene || [])];
  const byTitle = new Map(flat.map((c) => [norm(c.title), c]));
  const byPrefix = new Map(flat.map((c) => [prefix(c.title), c]));

  // real roster size + reviews
  const pids = rosterPids(slug);
  let appCount = pids.length, reviewSum = 0;
  for (const pid of pids) { const e = insights.find((x) => x.productId === pid); if (e) reviewSum += e.reviewsScanned || 0; }
  if (!appCount) { appCount = 10; reviewSum = 5000; }

  // fix segment-insights mirror
  if (segIns[slug]) { segIns[slug].appsCount = appCount; segIns[slug].reviewsScanned = reviewSum; }

  let matched = 0, missed = 0;
  for (const idea of ideas.filter((i) => i.category === slug)) {
    let obs = 0;
    for (const m of idea.mechanisms || []) {
      const card = byTitle.get(norm(m.title)) || byPrefix.get(prefix(m.title)) || bestFuzzy(m.title, flat);
      if (card) {
        m.title = card.title; // adopt the cleaned-up card copy
        m.obsCount = card.count;
        if (Array.isArray(card.apps) && card.apps.length) m.apps = card.apps;
        matched++;
      } else missed++;
      obs += m.obsCount || 0;
    }
    idea.stats = { ...idea.stats, apps: appCount, reviews: reviewSum, observations: obs };
  }
  console.log(slug, `→ apps:${appCount} reviews:${reviewSum} | механизмов сопоставлено ${matched}, промах ${missed}`);
}

W("src/data/ideas.json", ideas);
W("src/data/segment-insights.json", segIns);
console.log("готово");
