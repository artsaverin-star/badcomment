// Apply review tagging: for each sobriety insight card, gather ALL reviews
// across apps that were tagged to it → count = real number, evidence = those
// exact reviews. Keeps the (already polished) card text.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const seg = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/segment-cards.json"), "utf8"));
const meta = JSON.parse(fs.readFileSync("/tmp/habit/meta.json", "utf8"));
const name = {};
for (const m of meta) name[m.productId || `ext-${m.appleId}`] = m.name;

const flat = [...seg['habit-tracking'].product, ...seg['habit-tracking'].hygiene]; // id = index
const byCardEvidence = flat.map(() => []);

for (const f of fs.readdirSync("/tmp/habit/classify-out").filter((x) => x.endsWith(".json"))) {
  const pid = f.replace(/\.json$/, "");
  let out;
  try { out = JSON.parse(fs.readFileSync(`/tmp/habit/classify-out/${f}`, "utf8")); } catch { continue; }
  const revs = JSON.parse(fs.readFileSync(`/tmp/habit/src/${pid}.json`, "utf8"));
  const app = name[pid] || pid;
  const byCard = out.byCard || {};
  for (const [cardId, idxs] of Object.entries(byCard)) {
    const id = Number(cardId);
    if (!flat[id] || !Array.isArray(idxs)) continue;
    for (const idx of idxs) {
      const r = revs[idx];
      if (r && (r.text || "").trim()) byCardEvidence[id].push({ rating: r.rating, quote: r.text.slice(0, 400), app });
    }
  }
}

let updated = 0;
flat.forEach((c, id) => {
  const ev = byCardEvidence[id];
  if (!ev || ev.length === 0) return; // keep existing when classifier found none
  // sort: loudest first (low rating for pains, high for praise) — keep variety
  ev.sort((a, b) => (a.rating || 0) - (b.rating || 0));
  c.evidence = ev.slice(0, 120);
  c.count = ev.length;
  updated++;
});

fs.writeFileSync(path.join(ROOT, "src/data/segment-cards.json"), JSON.stringify(seg));
const counts = flat.map((c) => c.count);
console.log(JSON.stringify({ updated, totalCards: flat.length, sampleCounts: counts.slice(0, 8), maxCount: Math.max(...counts) }));
