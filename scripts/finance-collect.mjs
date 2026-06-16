// Run ON THE PROD BOX (Google Play reachable there). Resolves each candidate's
// Google package by HTML search, pulls app meta (title/icon/screenshots/rating)
// and up to 500 NEWEST reviews across country×lang, deduped. Writes per-app
// /tmp/finance/src/<key>.json = [{rating,text}] + a /tmp/finance/collect-meta.json
// digest for picking the final 10 by real yield.
import gplayPkg from "google-play-scraper";
const gplay = gplayPkg.default || gplayPkg;
import fs from "node:fs";

const CANDIDATES = [
  { key: "moneymanager", q: "Money Manager Expense Budget realbyte" },
  { key: "wallet", q: "Wallet Budget Expense Tracker BudgetBakers" },
  { key: "spendee", q: "Spendee budget tracker" },
  { key: "monefy", q: "Monefy budget money manager" },
  { key: "moneylover", q: "Money Lover expense manager budget" },
  { key: "goodbudget", q: "Goodbudget envelope budget planner" },
  { key: "ynab", q: "YNAB You Need A Budget" },
  { key: "rocketmoney", q: "Rocket Money bills budget" },
  { key: "pocketguard", q: "PocketGuard budget tracker" },
  { key: "bluecoins", q: "Bluecoins finance budget" },
  { key: "1money", q: "1Money expense tracker budget" },
  { key: "fortunecity", q: "Fortune City expense manager" },
  { key: "spendingtracker", q: "Spending Tracker mhriley" },
];

const COUNTRIES = ["us", "gb", "in", "ca", "au"];
const LANGS = ["en", "es", "pt", "de", "fr", "it"];
const OUT = "/tmp/finance/src";
fs.mkdirSync(OUT, { recursive: true });

async function resolvePackage(q) {
  const url = `https://play.google.com/store/search?c=apps&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { "accept-language": "en-US,en;q=0.9" } });
  const html = await res.text();
  const m = html.match(/store\/apps\/details\?id=([\w.]+)/);
  return m ? m[1] : null;
}

async function collect(c) {
  const pkg = await resolvePackage(c.q);
  if (!pkg) return { key: c.key, q: c.q, error: "no-package" };
  let meta = {};
  try {
    const a = await gplay.app({ appId: pkg, country: "us", lang: "en" });
    meta = { title: a.title, icon: a.icon, screenshots: (a.screenshots || []).slice(0, 6), score: a.score, ratings: a.ratings };
  } catch { /* ignore meta errors */ }

  const seen = new Set();
  const out = [];
  outer: for (const country of COUNTRIES) {
    for (const lang of LANGS) {
      let token = null;
      do {
        let r;
        try {
          r = await gplay.reviews({ appId: pkg, sort: gplay.sort.NEWEST, num: 150, paginate: true, nextPaginationToken: token, country, lang });
        } catch { break; }
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
  return { key: c.key, q: c.q, pkg, title: meta.title, icon: meta.icon, screenshots: meta.screenshots, score: meta.score, ratings: meta.ratings, got: out.length, rb };
}

const results = [];
for (const c of CANDIDATES) {
  const r = await collect(c);
  results.push(r);
  console.log(JSON.stringify({ key: r.key, pkg: r.pkg, title: r.title, got: r.got, err: r.error }));
}
fs.writeFileSync("/tmp/finance/collect-meta.json", JSON.stringify(results, null, 2));
console.log("DONE");
