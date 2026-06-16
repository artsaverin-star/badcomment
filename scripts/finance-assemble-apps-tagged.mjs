import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);
const meta = J("/tmp/finance/meta.json");
const name = {};
for (const m of meta) name[m.productId || `ext-${m.appleId}`] = m.name;
const appCards = J(path.join(ROOT, "src/data/app-cards.json"));
let done = 0;
for (const f of fs.readdirSync("/tmp/finance/out2").filter((x) => x.endsWith(".json"))) {
  const pid = f.replace(/\.json$/, "");
  let out, revs;
  try { out = J(`/tmp/finance/out2/${f}`); revs = J(`/tmp/finance/src/${pid}.json`); } catch { continue; }
  if (!Array.isArray(out.product)) continue;
  const product = [], hygiene = [];
  for (const c of out.product) {
    if (!clean(c.title)) continue;
    const idx = (c.reviewIdx || []).filter((i) => Number.isInteger(i) && revs[i]);
    const ev = idx.map((i) => ({ rating: revs[i].rating, quote: (revs[i].text || "").slice(0, 400), app: name[pid] }));
    const card = { title: clean(c.title), plus: clean(c.plus), minus: clean(c.minus), count: ev.length || idx.length || 1, apps: [name[pid]].filter(Boolean), evidence: ev.slice(0, 120) };
    (c.kind === "base" ? hygiene : product).push(card);
  }
  if (!product.length && !hygiene.length) continue;
  appCards[pid] = { product, hygiene };
  done++;
}
fs.writeFileSync(path.join(ROOT, "src/data/app-cards.json"), JSON.stringify(appCards));
console.log(JSON.stringify({ updated: done }));
