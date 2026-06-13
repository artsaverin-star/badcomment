// Register harvested ext-<appleId> apps into the catalog WITHOUT a prod DB row:
//  - iTunes lookup for canonical name/icon/bundleId/developer (tsc needs these)
//  - add categories-meta["<slug>:<Name>"] = {query,name,icon,appleId,bundleId,developer,productId}
//  - append Name to the category's apps[] in categories.json
// Input: /tmp/round17-selected.json  [{pid,slug,name,apple,google,dev,ratings}]
import { readFileSync, writeFileSync } from "node:fs";

const sel = JSON.parse(readFileSync("/tmp/round17-selected.json", "utf8"));
const cats = JSON.parse(readFileSync("src/data/categories.json", "utf8"));
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8"));

const leafBySlug = {};
cats.forEach((d) => d.categories.forEach((c) => { leafBySlug[c.slug] = c; }));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let added = 0, skipped = 0;
const registered = [];

for (const s of sel) {
  const leaf = leafBySlug[s.slug];
  if (!leaf) { skipped++; continue; }
  let name = s.name, icon = "", bundleId = s.google || "", dev = s.dev || "";
  try {
    const r = await fetch(`https://itunes.apple.com/lookup?id=${s.apple}&country=us`);
    const j = await r.json();
    const it = (j.results || [])[0];
    if (it) {
      name = it.trackName || name;
      icon = it.artworkUrl512 || it.artworkUrl100 || "";
      bundleId = it.bundleId || bundleId;
      dev = it.artistName || dev;
    }
  } catch { }
  await sleep(150);
  const key = s.slug + ":" + name;
  if (meta[key]) { skipped++; continue; }
  meta[key] = { query: name, name, icon, appleId: Number(s.apple), bundleId, developer: dev, productId: s.pid };
  if (!leaf.apps) leaf.apps = [];
  if (!leaf.apps.includes(name)) leaf.apps.push(name);
  registered.push({ pid: s.pid, slug: s.slug, name, ctxslug: (name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)) + "-" + s.apple, domain: s.slug.replace(/-/g, " ") });
  added++;
}

writeFileSync("src/data/categories.json", JSON.stringify(cats, null, 2));
writeFileSync("src/data/categories-meta.json", JSON.stringify(meta, null, 2));
writeFileSync("/tmp/round17-registered.json", JSON.stringify(registered, null, 2));
console.log("registered:", added, "| skipped:", skipped);
// flag any missing icon/bundle (tsc risk)
const weak = registered.filter((r) => !meta[r.slug + ":" + r.name].icon || !meta[r.slug + ":" + r.name].bundleId);
console.log("weak meta (no icon/bundle):", weak.length, weak.slice(0, 8).map((w) => w.name).join(", "));
