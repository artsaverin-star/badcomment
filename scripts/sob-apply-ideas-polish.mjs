import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const ideas = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/ideas.json"), "utf8"));
const out = JSON.parse(fs.readFileSync("/tmp/sob/ideas-polish-out.json", "utf8")).ideas || [];
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : "");
const arr = (a) => (Array.isArray(a) ? a.map(clean).filter(Boolean) : null);
const map = new Map(out.map((o) => [o.slug, o]));
let n = 0;
for (const i of ideas) {
  const o = map.get(i.slug);
  if (!o) continue;
  if (clean(o.title)) i.title = clean(o.title);
  if (clean(o.oneLiner)) i.oneLiner = clean(o.oneLiner);
  if (clean(o.gap)) i.gap = clean(o.gap);
  if (clean(o.pitch)) i.idea.pitch = clean(o.pitch);
  if (arr(o.features)) i.idea.features = arr(o.features);
  if (arr(o.antiFeatures)) i.idea.antiFeatures = arr(o.antiFeatures);
  if (clean(o.monetization)) i.idea.monetization = clean(o.monetization);
  n++;
}
fs.writeFileSync(path.join(ROOT, "src/data/ideas.json"), JSON.stringify(ideas));
console.log("обновлено идей:", n);
