// Merge re-extracted sobriety app cards (/tmp/period/out/<pid>.json) into
// app-cards.json. Quotes → real evidence; kind routes product vs «база».
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/period/out";
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);

const meta = J("/tmp/period/meta.json");
const name = {};
for (const m of meta) name[m.productId || `ext-${m.appleId}`] = m.name;
const appCards = J(path.join(ROOT, "src/data/app-cards.json"));

let done = 0;
for (const f of fs.readdirSync(OUT).filter((x) => x.endsWith(".json"))) {
  const pid = f.replace(/\.json$/, "");
  let out;
  try {
    out = J(path.join(OUT, f));
  } catch {
    continue;
  }
  if (!Array.isArray(out.product)) continue;
  const product = [];
  const hygiene = [];
  for (const c of out.product) {
    if (!clean(c.title)) continue;
    const ev = (c.quotes || [])
      .filter((q) => q && clean(q.quote))
      .map((q) => ({ rating: Number(q.rating) || 0, quote: q.quote, app: name[pid] }));
    const card = {
      title: clean(c.title),
      plus: clean(c.plus),
      minus: clean(c.minus),
      count: Number(c.count) || ev.length || 1,
      apps: [name[pid]].filter(Boolean),
      evidence: ev,
    };
    (c.kind === "base" ? hygiene : product).push(card);
  }
  if (!product.length && !hygiene.length) continue;
  appCards[pid] = { product, hygiene };
  done++;
}
fs.writeFileSync(path.join(ROOT, "src/data/app-cards.json"), JSON.stringify(appCards));
console.log(JSON.stringify({ updated: done }));
