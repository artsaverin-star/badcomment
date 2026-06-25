import fs from "fs";

const slug = process.argv[2];
if (!slug) throw new Error("usage: _apply-ideas-pilot.mjs <slug>");

const NEW = JSON.parse(fs.readFileSync(`gen/${slug}-ideas.NEW.json`, "utf8"));
const reviews = JSON.parse(fs.readFileSync(`gen/${slug}-reviews.json`, "utf8"));
const blob = reviews.reviews.map((r) => r.text).join("\n");

const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
const pc = ideas.filter((i) => i.category === slug).sort((a, b) => a.slug.localeCompare(b.slug, undefined, { numeric: true }));
if (pc.length !== NEW.length) console.warn(`WARN counts: existing ${pc.length} vs new ${NEW.length}`);

let dropped = 0;
NEW.forEach((nw, idx) => {
  const t = pc[idx];
  if (!t) return;
  t.title = nw.title;
  t.oneLiner = nw.oneLiner;
  t.gap = nw.gap;
  t.idea = t.idea || {};
  t.idea.pitch = nw.pitch;
  t.idea.features = nw.features || [];
  t.idea.monetization = nw.monetization;
  t.idea.antiFeatures = t.idea.antiFeatures || [];
  const grid = (nw.reviewGrid || []).filter((q) => { const ok = blob.includes((q.quote || "").trim()); if (!ok) dropped++; return ok; }).map((q) => ({ quote: q.quote, rating: q.rating, app: q.app }));
  t.reviewGrid = grid;
  if (Array.isArray(t.mechanisms) && t.mechanisms[0]) t.mechanisms[0].title = nw.title;
});
fs.writeFileSync("src/data/ideas.json", JSON.stringify(ideas, null, 1));
console.log(`${slug}: applied ${NEW.length} ideas, dropped ${dropped} non-verbatim quotes`);
