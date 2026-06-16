import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const insights = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/insights.json"), "utf8"));
const out = JSON.parse(fs.readFileSync("/tmp/habit/desc-out.json", "utf8")).desc || [];
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : "");
const map = new Map(out.map((o) => [o.pid, clean(o.description)]));
let n = 0;
for (const p of insights) {
  const d = map.get(p.productId);
  if (d) { p.description = d; n++; }
}
fs.writeFileSync(path.join(ROOT, "src/data/insights.json"), JSON.stringify(insights));
console.log("описаний добавлено:", n);
