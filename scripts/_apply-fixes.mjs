import fs from "fs";

// Apply per-slug strong-money rewrites from gen/fix-<slug>.json into ideas.json.
// Only the named slugs change. Quotes validated verbatim against that idea's
// category reviews cache.
const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
const bySlug = new Map(ideas.map((i) => [i.slug, i]));
const blobCache = {};
function blobFor(cat) {
  if (blobCache[cat]) return blobCache[cat];
  const path = `gen/${cat}-reviews.json`;
  if (!fs.existsSync(path)) { blobCache[cat] = ""; return ""; }
  const r = JSON.parse(fs.readFileSync(path, "utf8"));
  blobCache[cat] = r.reviews.map((x) => x.text).join("\n");
  return blobCache[cat];
}

const files = fs.readdirSync("gen").filter((f) => /^fix-.*\.json$/.test(f));
let applied = 0, dropped = 0;
const report = [];
for (const f of files) {
  const nw = JSON.parse(fs.readFileSync(`gen/${f}`, "utf8"));
  const t = bySlug.get(nw.slug);
  if (!t) { console.warn(`SKIP unknown slug ${nw.slug} (${f})`); continue; }
  const blob = blobFor(t.category);
  t.title = nw.title;
  t.oneLiner = nw.oneLiner;
  t.gap = nw.gap;
  t.idea = t.idea || {};
  t.idea.pitch = nw.pitch;
  t.idea.features = nw.features || [];
  t.idea.monetization = nw.monetization;
  t.idea.antiFeatures = t.idea.antiFeatures || [];
  const grid = (nw.reviewGrid || []).filter((q) => {
    const ok = blob.includes((q.quote || "").trim());
    if (!ok) dropped++;
    return ok;
  }).map((q) => ({ quote: q.quote, rating: q.rating, app: q.app }));
  t.reviewGrid = grid;
  if (Array.isArray(t.mechanisms) && t.mechanisms[0]) t.mechanisms[0].title = nw.title;
  applied++;
  const tooLong = nw.title.length > 48 ? ` [TITLE ${nw.title.length}>48]` : "";
  report.push(`  ${nw.slug}: ${nw.title}${tooLong} (quotes ${grid.length})`);
}
fs.writeFileSync("src/data/ideas.json", JSON.stringify(ideas, null, 1));
console.log(`applied ${applied} fixes, dropped ${dropped} non-verbatim quotes`);
report.forEach((r) => console.log(r));
