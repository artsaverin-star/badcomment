// Scout harvest candidates for under-filled CURRENT-catalog categories.
// For each live leaf category with <10 balanced apps, query the iTunes Search
// API for the category's English name, keep apps with a high rating count that
// are NOT already in the catalog, and emit a candidate pool for harvesting.
// Read-only (iTunes Search), no prod, no agents.
import { readFileSync, writeFileSync } from "node:fs";

const insights = JSON.parse(readFileSync("src/data/insights.json", "utf8"));
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8"));
const cats = JSON.parse(readFileSync("src/data/categories.json", "utf8"));
const bal = new Set(insights.filter((a) => typeof a.pipeline === "string" && /·\s*500\s*отзывов/.test(a.pipeline)).map((a) => a.productId));

// existing appleIds + normalized names already in catalog (to exclude)
const haveApple = new Set(), haveName = new Set();
for (const [k, m] of Object.entries(meta)) { if (m.appleId) haveApple.add(String(m.appleId)); if (m.name) haveName.add(m.name.toLowerCase().replace(/[^a-z0-9]/g, "")); }

const leaves = [];
cats.forEach((d) => d.categories.forEach((c) => {
  const done = (c.apps || []).filter((a) => { const m = meta[c.slug + ":" + a]; return m && bal.has(m.productId); }).length;
  if (done < 10) leaves.push({ slug: c.slug, term: (c.en && c.en.name) || c.slug.replace(/-/g, " "), need: 10 - done, done });
}));

const MIN_RATINGS = 4000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function search(term) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=us&entity=software&limit=40`;
  try { const r = await fetch(url); const j = await r.json(); return j.results || []; } catch { return []; }
}

const out = {};
let totalCand = 0;
for (const lf of leaves) {
  const res = await search(lf.term);
  const cands = [];
  for (const a of res) {
    const apple = String(a.trackId);
    const nname = (a.trackName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (haveApple.has(apple) || haveName.has(nname)) continue;
    if ((a.userRatingCount || 0) < MIN_RATINGS) continue;
    cands.push({ name: a.trackName, apple, google: a.bundleId, ratings: a.userRatingCount, dev: a.artistName });
  }
  cands.sort((x, y) => y.ratings - x.ratings);
  out[lf.slug] = { need: lf.need, done: lf.done, candidates: cands.slice(0, Math.max(lf.need + 3, 6)) };
  totalCand += out[lf.slug].candidates.length;
  await sleep(300);
}
writeFileSync("/tmp/scout-gaps.json", JSON.stringify(out, null, 2));
console.log("under-filled categories scouted:", leaves.length);
console.log("total candidates found:", totalCand);
for (const [slug, v] of Object.entries(out)) console.log(`  ${slug} [${v.done}/10 need ${v.need}] → ${v.candidates.length} cand` + (v.candidates.length ? "  e.g. " + v.candidates.slice(0, 2).map((c) => c.name + "(" + c.ratings + ")").join(", ") : "  ⛔ none"));
