import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Experiment scaffolding: clone the Calm app-context under 3 synthetic product
// ids (one per extract-model variant), copy the same 500-review filtered set to
// each, and generate identical extract batches. Only the extract MODEL differs
// downstream; cluster/regroup stay Opus for all. See exp comparison page.
//
// Usage: npx tsx scripts/exp-setup.ts

const REAL = "cmpstwzc422tyug8p31xzftzd";
const VARIANTS = ["calmopus500", "calmsonnet500", "calmhaiku500"];

const baseCtx = JSON.parse(readFileSync("app-context/calm.json", "utf8")) as Record<string, unknown>;

for (const v of VARIANTS) {
  writeFileSync(`app-context/${v}.json`, JSON.stringify({ ...baseCtx, productId: v, slug: v }, null, 2));
  copyFileSync(`data/${REAL}-filtered.json`, `data/${v}-filtered.json`);
  // batchSize 50, sample 500 (filtered is already 500, so ALL)
  execSync(`npx tsx scripts/app-extract-prep.ts ${v} 50 500`, { stdio: "inherit" });
}

console.log(`\nscaffolded ${VARIANTS.length} variants: ${VARIANTS.join(", ")}`);
