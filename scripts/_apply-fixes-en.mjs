import fs from "fs";

// Patch the EN overlay for the 8 strong-money fixes from gen/fix-en.json
// (dict slug -> {title,oneLiner,gap,pitch,features,monetization}). categoryName
// is preserved from the existing overlay entry.
const EN = JSON.parse(fs.readFileSync("gen/fix-en.json", "utf8"));
const en = JSON.parse(fs.readFileSync("src/data/ideas-content.en.json", "utf8"));

let n = 0;
const longs = [];
for (const [slug, e] of Object.entries(EN)) {
  const cur = en[slug] || {};
  en[slug] = {
    categoryName: cur.categoryName,
    title: e.title,
    oneLiner: e.oneLiner,
    gap: e.gap,
    pitch: e.pitch,
    features: e.features || [],
    monetization: e.monetization,
  };
  n++;
  if ((e.title || "").length > 48) longs.push(`${slug}: ${e.title.length} — ${e.title}`);
}
fs.writeFileSync("src/data/ideas-content.en.json", JSON.stringify(en, null, 1));
console.log(`EN fixes applied: ${n}`);
if (longs.length) { console.log("LONG EN TITLES (>48):"); longs.forEach((t) => console.log("  " + t)); }
else console.log("all EN titles <= 48 ✓");
