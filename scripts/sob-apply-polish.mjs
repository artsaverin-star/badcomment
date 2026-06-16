import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const seg = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/segment-cards.json"), "utf8"));
const polish = JSON.parse(fs.readFileSync("/tmp/sob/polish-out.json", "utf8")).items || [];
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);
const flat = [...seg.sobriety.product, ...seg.sobriety.hygiene];
let n = 0;
for (const p of polish) {
  const c = flat[p.i];
  if (!c) continue;
  if (clean(p.title)) c.title = clean(p.title);
  c.plus = clean(p.plus);
  c.minus = clean(p.minus);
  n++;
}
fs.writeFileSync(path.join(ROOT, "src/data/segment-cards.json"), JSON.stringify(seg));
console.log("обновлено карточек:", n);
