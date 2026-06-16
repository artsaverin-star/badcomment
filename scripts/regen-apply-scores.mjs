// Apply critic scores to ideas.json: write score per idea, sort best-first,
// and report flagged (weak/weird) ideas for QA.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen4/out";
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const ideas = J(path.join(ROOT, "src/data/ideas.json"));
const scoreMap = new Map();
const flagged = [];
for (const f of fs.readdirSync(OUT).filter((x) => x.startsWith("score-"))) {
  let out;
  try {
    out = J(path.join(OUT, f));
  } catch {
    continue;
  }
  for (const s of out.scores || []) {
    if (typeof s.slug !== "string") continue;
    scoreMap.set(s.slug, s);
    if (s.flag) flagged.push(`${s.slug} (${s.score}) — ${s.why || ""}`);
  }
}

let scored = 0;
for (const i of ideas) {
  const s = scoreMap.get(i.slug);
  if (s && typeof s.score === "number") {
    i.score = s.score;
    scored++;
  }
}
ideas.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.stats?.observations ?? 0) - (a.stats?.observations ?? 0));
fs.writeFileSync(path.join(ROOT, "src/data/ideas.json"), JSON.stringify(ideas));

const scores = ideas.map((i) => i.score).filter((x) => typeof x === "number");
const avg = Math.round((scores.reduce((s, x) => s + x, 0) / Math.max(1, scores.length)) * 10) / 10;
console.log(JSON.stringify({ total: ideas.length, scored, avg, top: ideas.slice(0, 5).map((i) => `${i.score} ${i.title}`), flaggedCount: flagged.length }));
console.log("=== FLAGGED ===");
flagged.slice(0, 25).forEach((x) => console.log(" ·", x));
