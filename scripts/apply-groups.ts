import { readFileSync, writeFileSync, readdirSync } from "node:fs";

// Applies per-app narrative section groups (group: {id, name}) onto the
// insights in src/data/insights.json. Group files are authored offline (one
// per app) in segment-meta/groups/<productId>.json with the shape:
//   { productId, groups: [{id, name}, ...], assign: { "<exact insight title>": "groupId" } }
// Every insight title must be assigned to a known group; the script refuses to
// write a partially-grouped app so nothing silently falls back to a generic
// theme label.
//
// Run: npx tsx scripts/apply-groups.ts

type Group = { id: string; name: string };
type GroupFile = { productId: string; groups: Group[]; assign: Record<string, string> };
type Insight = { title: string; group?: Group };
type ProductInsights = { productId: string; insights: Insight[] };

const INSIGHTS = "src/data/insights.json";
const GROUPS_DIR = "segment-meta/groups";

function main() {
  const products = JSON.parse(readFileSync(INSIGHTS, "utf8")) as ProductInsights[];
  const byPid = new Map(products.map((p) => [p.productId, p]));

  const files = readdirSync(GROUPS_DIR).filter((f) => f.endsWith(".json") && !f.startsWith("_"));
  let applied = 0;
  const problems: string[] = [];

  for (const f of files) {
    const gf = JSON.parse(readFileSync(`${GROUPS_DIR}/${f}`, "utf8")) as GroupFile;
    const product = byPid.get(gf.productId);
    if (!product) { problems.push(`${f}: productId ${gf.productId} not in insights.json`); continue; }

    const groupById = new Map(gf.groups.map((g) => [g.id, g]));
    const titles = new Set(product.insights.map((i) => i.title));

    // Validate assignment references before mutating anything.
    const localProblems: string[] = [];
    for (const [title, gid] of Object.entries(gf.assign)) {
      if (!titles.has(title)) localProblems.push(`  unknown title: ${title}`);
      if (!groupById.has(gid)) localProblems.push(`  unknown group id "${gid}" for: ${title}`);
    }
    for (const i of product.insights) {
      if (!(i.title in gf.assign)) localProblems.push(`  UNASSIGNED insight: ${i.title}`);
    }
    if (localProblems.length) {
      problems.push(`${gf.productId} (${f}):\n${localProblems.join("\n")}`);
      continue;
    }

    for (const i of product.insights) i.group = groupById.get(gf.assign[i.title])!;
    applied++;
    console.log(`✓ ${gf.productId}: ${product.insights.length} insights → ${gf.groups.length} groups`);
  }

  if (problems.length) {
    console.error(`\n!! ${problems.length} app(s) NOT applied:\n${problems.join("\n\n")}`);
  }

  writeFileSync(INSIGHTS, JSON.stringify(products, null, 2) + "\n");
  console.log(`\napplied groups to ${applied} app(s); wrote ${INSIGHTS}`);
  if (problems.length) process.exitCode = 1;
}

main();
