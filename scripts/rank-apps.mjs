// Run ON PROD. Meta-only ranking pass: for each candidate query, pull ALL package
// ids off the Google Play HTML search results, fetch gplay.app for the top few,
// and keep the BEST match (most ratings — kills companion/knockoff apps the old
// first-hit resolver grabbed). Outputs a ranking by installs/ratings so we pick
// the genuinely most-established 10 apps, not whoever happened to yield reviews.
//
//   node rank-apps.mjs > /tmp/rank.json   (args: a category key file is inlined)
import gplayPkg from "google-play-scraper";
const gplay = gplayPkg.default || gplayPkg;

const QUERIES = JSON.parse(process.env.QUERIES || "[]");
const MUST = (process.env.MUST || "").toLowerCase(); // a keyword the title should contain (loose)

async function packagesFor(q) {
  const url = `https://play.google.com/store/search?c=apps&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "accept-language": "en-US,en;q=0.9" } });
  const html = await res.text();
  const ids = [...html.matchAll(/store\/apps\/details\?id=([\w.]+)/g)].map((m) => m[1]);
  return [...new Set(ids)].slice(0, 8);
}

// Union of all package ids across every query, then meta each UNIQUE package
// once and rank the distinct set.
const ids = new Set();
for (const q of QUERIES) {
  try { (await packagesFor(q)).forEach((id) => ids.add(id)); } catch { /* ignore */ }
}
console.error("unique packages found:", ids.size);

const out = [];
for (const id of ids) {
  let a;
  try { a = await gplay.app({ appId: id, country: "us", lang: "en" }); } catch { continue; }
  out.push({ pkg: id, title: a.title, genre: a.genre, ratings: a.ratings || 0, installs: a.minInstalls || 0, score: a.score || 0, icon: a.icon, screenshots: (a.screenshots || []).slice(0, 6) });
}
out.sort((a, b) => (b.installs || 0) - (a.installs || 0) || (b.ratings || 0) - (a.ratings || 0));
process.stdout.write(JSON.stringify(out, null, 2));
