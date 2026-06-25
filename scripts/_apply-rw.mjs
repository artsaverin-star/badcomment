import fs from "fs";

const dir = "gen/rw";
const RU = {}, EN = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  let obj;
  try { obj = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8")); }
  catch (e) { console.error("BAD JSON:", f, e.message); process.exit(1); }
  for (const [slug, v] of Object.entries(obj)) {
    if (v.title && v.oneLiner) RU[slug] = { t: v.title.trim(), o: v.oneLiner.trim() };
    if (v.titleEn && v.oneLinerEn) EN[slug] = { t: v.titleEn.trim(), o: v.oneLinerEn.trim() };
  }
}

const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
let n = 0, longTitles = [];
for (const i of ideas) {
  const r = RU[i.slug];
  if (!r) continue;
  i.title = r.t;
  i.oneLiner = r.o;
  if (Array.isArray(i.mechanisms) && i.mechanisms[0]) i.mechanisms[0].title = r.t;
  if (r.t.length > 48) longTitles.push(`${i.slug}: ${r.t.length} — ${r.t}`);
  n++;
}
fs.writeFileSync("src/data/ideas.json", JSON.stringify(ideas, null, 1));

const en = JSON.parse(fs.readFileSync("src/data/ideas-content.en.json", "utf8"));
let m = 0;
for (const [slug, e] of Object.entries(EN)) {
  if (!en[slug]) continue;
  en[slug].title = e.t;
  en[slug].oneLiner = e.o;
  m++;
}
fs.writeFileSync("src/data/ideas-content.en.json", JSON.stringify(en, null, 1));

console.log(`RU patched ${n}, EN patched ${m}, unique slugs ${Object.keys(RU).length}`);
if (longTitles.length) { console.log("\nLONG RU TITLES (>48 chars):"); longTitles.forEach((t) => console.log("  " + t)); }
else console.log("all RU titles <= 48 chars ✓");
