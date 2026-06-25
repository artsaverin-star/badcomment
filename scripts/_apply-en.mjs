import fs from "fs";

// Apply gen/<niche>-ideas.en.json (list of 7, slug-order) into the EN overlay
// src/data/ideas-content.en.json (dict keyed by idea slug). categoryName is
// preserved from the existing overlay; only the translatable fields update.
const PREMIUM = [
  "notes-pkm", "photo-editing", "calendars-tasks", "study-aids",
  "nutrition-calories", "document-scanners", "weather-apps",
  "intermittent-fasting", "affirmations", "plant-care",
  "habit-tracking", "personal-finance", "astrology", "pet-care",
];

const ideas = JSON.parse(fs.readFileSync("src/data/ideas.json", "utf8"));
const en = JSON.parse(fs.readFileSync("src/data/ideas-content.en.json", "utf8"));

let total = 0;
const longs = [];
for (const niche of PREMIUM) {
  const path = `gen/${niche}-ideas.en.json`;
  if (!fs.existsSync(path)) { console.warn(`MISSING ${path}`); continue; }
  const NEW = JSON.parse(fs.readFileSync(path, "utf8"));
  const slugs = ideas
    .filter((i) => i.category === niche)
    .sort((a, b) => a.slug.localeCompare(b.slug, undefined, { numeric: true }))
    .map((i) => i.slug);
  if (slugs.length !== NEW.length) console.warn(`WARN ${niche}: ${slugs.length} slugs vs ${NEW.length} EN`);
  NEW.forEach((e, idx) => {
    const slug = slugs[idx];
    if (!slug) return;
    const cur = en[slug] || {};
    en[slug] = {
      categoryName: cur.categoryName, // keep existing localized category label
      title: e.title,
      oneLiner: e.oneLiner,
      gap: e.gap,
      pitch: e.pitch,
      features: e.features || [],
      monetization: e.monetization,
    };
    total++;
    if ((e.title || "").length > 48) longs.push(`${slug}: ${e.title.length} — ${e.title}`);
  });
}
fs.writeFileSync("src/data/ideas-content.en.json", JSON.stringify(en, null, 1));
console.log(`EN applied: ${total} ideas across ${PREMIUM.length} niches`);
if (longs.length) { console.log("LONG EN TITLES (>48):"); longs.forEach((t) => console.log("  " + t)); }
else console.log("all EN titles <= 48 ✓");
