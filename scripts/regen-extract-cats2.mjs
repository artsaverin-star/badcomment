// Deep category extractor: aggregate the FULL observation pool of a category's
// apps (not just the ~8 synthesized items) so an agent can cluster many more
// product insights. Output → /tmp/regen2/src/cat-<slug>.json
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen2/src";
fs.mkdirSync(OUT, { recursive: true });
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const categories = J("src/data/categories.json");
const meta = J("src/data/categories-meta.json");
const insights = J("src/data/insights.json");
const seg = J("src/data/segment-insights.json");

const byPid = new Map(insights.map((a) => [a.productId, a]));
const avg = (ev) => (ev && ev.length ? ev.reduce((s, e) => s + (e.rating || 0), 0) / ev.length : 0);

let n = 0;
for (const slug of Object.keys(seg)) {
  // find the raw category
  let raw = null;
  for (const d of categories) {
    const c = (d.categories || []).find((x) => x.slug === slug);
    if (c) {
      raw = c;
      break;
    }
  }
  if (!raw) continue;

  const pids = (raw.apps || [])
    .map((q) => meta[`${slug}:${q}`]?.productId)
    .filter(Boolean);

  const obs = [];
  for (const q of raw.apps || []) {
    const m = meta[`${slug}:${q}`];
    const pid = m?.productId;
    if (!pid) continue;
    const a = byPid.get(pid);
    if (!a) continue;
    for (const o of a.insights || []) {
      obs.push({
        id: o.id,
        app: m.name || q,
        theme: o.theme ?? null,
        title: o.title,
        story: (o.story || "").slice(0, 220),
        count: o.observationCount ?? (o.evidence ? o.evidence.length : 0),
        avgRating: Math.round(avg(o.evidence) * 10) / 10,
      });
    }
  }
  // Cap to the strongest ~140 by cluster size to bound the prompt.
  obs.sort((a, b) => b.count - a.count);
  const top = obs.slice(0, 140);
  fs.writeFileSync(`${OUT}/cat-${slug}.json`, JSON.stringify({ slug, apps: pids.length, obs: top }));
  n++;
}
console.log(JSON.stringify({ categories: n, out: OUT }));
