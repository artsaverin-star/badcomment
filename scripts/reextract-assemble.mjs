// Merge re-extracted pilot cards (/tmp/reextract/out/<pid>.json) into
// app-cards.json. Quotes become real evidence; kind routes product vs «база».
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/reextract/out";
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);

const pick = J("/tmp/reextract_pick.json");
const name = {};
for (const p of pick) name[p.pid] = p.name || p.slug;
const appCards = J(path.join(ROOT, "src/data/app-cards.json"));

let done = 0;
for (const p of pick) {
  let out;
  try {
    out = J(path.join(OUT, `${p.pid}.json`));
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
      .map((q) => ({ rating: Number(q.rating) || 0, quote: q.quote, app: name[p.pid] }));
    const card = {
      title: clean(c.title),
      plus: clean(c.plus),
      minus: clean(c.minus),
      count: Number(c.count) || ev.length || 1,
      apps: [name[p.pid]],
      evidence: ev,
    };
    (c.kind === "base" ? hygiene : product).push(card);
  }
  if (!product.length && !hygiene.length) continue;
  appCards[p.pid] = { product, hygiene };
  done++;
}

fs.writeFileSync(path.join(ROOT, "src/data/app-cards.json"), JSON.stringify(appCards));
console.log(JSON.stringify({ updated: done }));
