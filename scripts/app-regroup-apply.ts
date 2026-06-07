import { readFileSync, writeFileSync, existsSync } from "node:fs";

// Apply the second-pass grouping: read regroup/out/<PID>.json (bespoke parent
// themes), stamp each insight with group: { id, name }, and reorder insights
// so groups appear in the agent's order (loudest first). The page renders by
// `group` when present, falling back to the generic themes otherwise.
//
// Usage: npx tsx scripts/app-regroup-apply.ts <slug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-regroup-apply.ts <slug>");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath}`);
  process.exit(1);
}
const ctx = JSON.parse(readFileSync(contextPath, "utf8")) as { productId: string; name: string };
const PRODUCT_ID = ctx.productId;

type GroupIn = { id: string; name: string; insight_ids: string[] };
type RegroupOut = { groups: GroupIn[] };

const raw = readFileSync(`regroup/out/${PRODUCT_ID}.json`, "utf8");
const stripped = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const regroup = JSON.parse(stripped) as RegroupOut;
if (!regroup.groups || !Array.isArray(regroup.groups)) throw new Error("missing 'groups' array");

type Insight = { id: string; group?: { id: string; name: string }; [k: string]: unknown };
type Product = { productId: string; insights: Insight[]; [k: string]: unknown };

const all = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Product[];
const product = all.find((p) => p.productId === PRODUCT_ID);
if (!product) throw new Error(`no insights for ${PRODUCT_ID}`);

const byId = new Map(product.insights.map((i) => [i.id, i]));

// Validate coverage
const assigned = new Set<string>();
for (const g of regroup.groups) for (const id of g.insight_ids) assigned.add(id);
const missing = product.insights.filter((i) => !assigned.has(i.id)).map((i) => i.id);
if (missing.length) console.warn(`WARN: ${missing.length} insights not in any group:`, missing.slice(0, 5));

// Rebuild insights in group order, stamping group on each
const reordered: Insight[] = [];
for (const g of regroup.groups) {
  for (const id of g.insight_ids) {
    const ins = byId.get(id);
    if (!ins) {
      console.warn(`  unknown insight id in group ${g.id}: ${id}`);
      continue;
    }
    ins.group = { id: g.id, name: g.name };
    reordered.push(ins);
  }
}
// Append any unassigned (keep them, ungrouped)
for (const ins of product.insights) {
  if (!assigned.has(ins.id)) {
    delete ins.group;
    reordered.push(ins);
  }
}
product.insights = reordered;

writeFileSync("src/data/insights.json", JSON.stringify(all, null, 2));

console.log(`applied ${regroup.groups.length} bespoke groups to ${ctx.name}`);
for (const g of regroup.groups) console.log(`  ${g.insight_ids.length.toString().padStart(2)} · ${g.name}`);
