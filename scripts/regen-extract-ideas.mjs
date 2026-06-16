// Idea regeneration source: feed each category's rich insight cards (from the
// regenerated segment-cards.json) to an agent that invents sharp product ideas
// grounded in them. Output → /tmp/regen3/src/ideas-<slug>.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen3/src";
fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const segCards = J("src/data/segment-cards.json");
const categories = J("src/data/categories.json");

const catName = {};
for (const d of categories) for (const c of d.categories || []) catName[c.slug] = c.ru?.name || c.slug;

let n = 0;
for (const [slug, set] of Object.entries(segCards)) {
  const cards = (set.product || []).map((c, i) => ({
    i,
    title: c.title,
    plus: c.plus || "",
    minus: c.minus || "",
    count: c.count,
    apps: c.apps || [],
  }));
  if (cards.length < 3) continue;
  fs.writeFileSync(`${OUT}/ideas-${slug}.json`, JSON.stringify({ slug, name: catName[slug] || slug, cards }));
  n++;
}
console.log(JSON.stringify({ categories: n, out: OUT }));
