// Run ON PROD. Scrapes up to 500 NEWEST reviews per app by EXPLICIT package id
// (packages picked from the popularity ranking, so no name-resolution guesswork).
// Pulls app meta (title/icon/screenshots) from Google Play. Writes per-app
// /tmp/cal/src/<key>.json + /tmp/cal/collect-meta.json.
import gplayPkg from "google-play-scraper";
const gplay = gplayPkg.default || gplayPkg;
import fs from "node:fs";

const APPS = [
  { key: "gcal", pkg: "com.google.android.calendar" },
  { key: "todoist", pkg: "com.todoist" },
  { key: "ticktick", pkg: "com.ticktick.task" },
  { key: "anydo", pkg: "com.anydo" },
  { key: "mstodo", pkg: "com.microsoft.todos" },
  { key: "gtasks", pkg: "com.google.android.apps.tasks" },
  { key: "timetree", pkg: "works.jubilee.timetree" },
  { key: "cozi", pkg: "com.cozi.androidfree" },
  { key: "bizcal", pkg: "com.appgenix.bizcal" },
  { key: "sectograph", pkg: "prox.lab.calclock" },
];

const COUNTRIES = ["us", "gb", "in", "ca", "au"];
const LANGS = ["en", "es", "pt", "de", "fr", "it"];
const OUT = "/tmp/cal/src";
fs.mkdirSync(OUT, { recursive: true });

async function collect(c) {
  let meta = {};
  try {
    const a = await gplay.app({ appId: c.pkg, country: "us", lang: "en" });
    meta = { title: a.title, icon: a.icon, screenshots: (a.screenshots || []).slice(0, 6), score: a.score, ratings: a.ratings };
  } catch { /* ignore */ }
  const seen = new Set();
  const out = [];
  outer: for (const country of COUNTRIES) {
    for (const lang of LANGS) {
      let token = null;
      do {
        let r;
        try { r = await gplay.reviews({ appId: c.pkg, sort: gplay.sort.NEWEST, num: 150, paginate: true, nextPaginationToken: token, country, lang }); }
        catch { break; }
        for (const rev of r.data || []) {
          const t = (rev.text || "").trim();
          if (!t) continue;
          const k = t.slice(0, 80);
          if (seen.has(k)) continue;
          seen.add(k);
          out.push({ rating: rev.score, text: t });
          if (out.length >= 500) break outer;
        }
        token = r.nextPaginationToken;
      } while (token && out.length < 500);
    }
  }
  const rb = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of out) if (rb[r.rating] != null) rb[r.rating]++;
  fs.writeFileSync(`${OUT}/${c.key}.json`, JSON.stringify(out.slice(0, 500)));
  return { key: c.key, pkg: c.pkg, title: meta.title, icon: meta.icon, screenshots: meta.screenshots, score: meta.score, ratings: meta.ratings, got: out.length, rb };
}

const results = [];
for (const c of APPS) {
  const r = await collect(c);
  results.push(r);
  console.log(JSON.stringify({ key: r.key, title: r.title, got: r.got }));
}
fs.writeFileSync("/tmp/cal/collect-meta.json", JSON.stringify(results, null, 2));
console.log("DONE");
