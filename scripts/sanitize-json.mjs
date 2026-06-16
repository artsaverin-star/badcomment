// Strip lone UTF-16 surrogates (emoji sliced mid-pair by .slice on review text)
// and disallowed control chars from the bundled data JSON, so Turbopack's strict
// serde JSON loader accepts them. Idempotent.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const FILES = ["app-cards.json", "segment-cards.json", "ideas.json", "insights.json", "segment-insights.json"];
const loneSurr = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;
// control chars except \t (09) \n (0A) \r (0D) — built from string to keep source clean
const ctrl = new RegExp("[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]", "g");
const clean = (v) => {
  if (typeof v === "string") return v.replace(loneSurr, "").replace(ctrl, "");
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") { const o = {}; for (const k in v) o[k] = clean(v[k]); return o; }
  return v;
};
let total = 0;
for (const f of FILES) {
  const p = path.join(ROOT, "src/data", f);
  if (!fs.existsSync(p)) continue;
  const before = fs.readFileSync(p, "utf8");
  const after = JSON.stringify(clean(JSON.parse(before)));
  fs.writeFileSync(p, after);
  console.log(f, "delta", before.length - after.length);
  total += before.length - after.length;
}
console.log("total removed:", total);
