import fs from "fs";
const files = fs.readdirSync("gen").filter((f) => f.endsWith("-ideas.NEW.json"));
const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
let totalDropped = 0, niches = 0, applied = 0;
for (const f of files) {
  const slug = f.replace("-ideas.NEW.json", "");
  if (!fs.existsSync(`gen/${slug}-reviews.json`)) { console.warn("skip (no reviews):", slug); continue; }
  const NEW = JSON.parse(fs.readFileSync(`gen/${f}`, "utf8"));
  const blob = JSON.parse(fs.readFileSync(`gen/${slug}-reviews.json`, "utf8")).reviews.map((r) => r.text).join("\n");
  const pc = ideas.filter((i) => i.category === slug).sort((a, b) => a.slug.localeCompare(b.slug, undefined, { numeric: true }));
  NEW.forEach((nw, idx) => {
    const t = pc[idx]; if (!t) return;
    t.title = nw.title; t.oneLiner = nw.oneLiner; t.gap = nw.gap;
    t.idea = t.idea || {}; t.idea.pitch = nw.pitch; t.idea.features = nw.features || []; t.idea.monetization = nw.monetization; t.idea.antiFeatures = t.idea.antiFeatures || [];
    t.reviewGrid = (nw.reviewGrid || []).filter((q) => { const ok = blob.includes((q.quote || "").trim()); if (!ok) totalDropped++; return ok; }).map((q) => ({ quote: q.quote, rating: q.rating, app: q.app }));
    if (Array.isArray(t.mechanisms) && t.mechanisms[0]) t.mechanisms[0].title = nw.title;
    applied++;
  });
  niches++;
}
fs.writeFileSync("src/data/ideas.json", JSON.stringify(ideas, null, 1));
console.log(`niches ${niches}, ideas applied ${applied}, dropped non-verbatim ${totalDropped}`);
