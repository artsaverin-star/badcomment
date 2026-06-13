// One-off quality pass: make every evidence quote a verbatim span of its cited review.
// For the 36 apps in this session (tiers 1-3), for each insight.evidence entry:
//   - if the (punctuation-normalized) quote is a substring of the cited review's text -> keep
//   - else replace quote with the real review text (trimmed, surrogate-safe)
// Only touches apps listed in /tmp/t{1,2,3}-apps.tsv; leaves the rest of the catalog untouched.
import { readFileSync, writeFileSync } from "node:fs";

const norm = (s) => (s || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9а-я]/gi, "");
function safeTrim(s, n) {
  let out = (s || "").slice(0, n).trim();
  // drop a dangling lone high surrogate (would break the bundler)
  const last = out.charCodeAt(out.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
  // trim back to a word boundary if we cut mid-word and there's room
  if ((s || "").length > n) {
    const sp = out.lastIndexOf(" ");
    if (sp > n * 0.6) out = out.slice(0, sp);
  }
  return out.trim();
}

const pids = new Set();
for (const f of ["/tmp/t1-apps.tsv", "/tmp/t2-apps.tsv", "/tmp/t3-apps.tsv"]) {
  for (const line of readFileSync(f, "utf8").trim().split("\n")) {
    const pid = line.split("\t")[0].trim();
    if (pid) pids.add(pid);
  }
}

const insights = JSON.parse(readFileSync("src/data/insights.json", "utf8"));
let kept = 0, replaced = 0, unresolved = 0, apps = 0;

for (const a of insights) {
  if (!pids.has(a.productId)) continue;
  apps++;
  let reviews = [];
  try { reviews = JSON.parse(readFileSync(`data/${a.productId}-reviews.json`, "utf8")); } catch { }
  const byId = new Map();
  for (const r of reviews) byId.set(r.externalId, ((r.title || "") + " " + (r.text || "")).trim());
  for (const ins of a.insights || []) {
    for (const ev of ins.evidence || []) {
      const real = byId.get(ev.reviewId);
      if (!real) { unresolved++; continue; }          // can't verify -> leave as-is
      const nq = norm(ev.quote);
      if (nq.length >= 6 && norm(real).includes(nq)) { kept++; continue; }  // already verbatim
      ev.quote = safeTrim(real, 240);                 // replace with real review text
      replaced++;
    }
  }
}

writeFileSync("src/data/insights.json", JSON.stringify(insights, null, 2));
console.log(`apps scrubbed: ${apps}`);
console.log(`quotes kept verbatim: ${kept}`);
console.log(`quotes replaced with real review text: ${replaced}`);
console.log(`unresolved (reviewId not in dump, left as-is): ${unresolved}`);
