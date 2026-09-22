#!/usr/bin/env node
// Site v2 audit helper (read-only): how much heap the content/v2 LRU in
// src/site/content/index.ts can pin, and how long JSON.parse of the biggest files takes.
//
//   node --expose-gc scripts/v2/audit/measure-content-memory.mjs [maxEntries=200]
//
// Scenarios:
//   worst  = the `maxEntries` largest JSON files parsed and kept alive (LRU worst case)
//   search = only the 5 search.json files (per-locale research search index)
//   all    = every JSON under content/v2 (upper bound if the LRU were unbounded)
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.CONTENT_V2_DIR ?? "content/v2");
const MAX = Number(process.argv[2] ?? 200);

if (typeof global.gc !== "function") {
  console.error("run with: node --expose-gc scripts/v2/audit/measure-content-memory.mjs");
  process.exit(2);
}

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "_build") continue;
      out.push(...walk(p));
    } else if (e.name.endsWith(".json")) out.push({ p, size: fs.statSync(p).size });
  }
  return out;
}

const files = walk(ROOT).sort((a, b) => b.size - a.size);
const mb = (n) => (n / 1048576).toFixed(1) + " MB";

function heap() {
  global.gc();
  global.gc();
  return process.memoryUsage().heapUsed;
}

function scenario(name, list) {
  const before = heap();
  const keep = [];
  let bytes = 0;
  const t0 = process.hrtime.bigint();
  for (const f of list) {
    const raw = fs.readFileSync(f.p, "utf8");
    bytes += f.size;
    keep.push(JSON.parse(raw));
  }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  const after = heap();
  console.log(
    `${name.padEnd(8)} files=${String(list.length).padStart(4)} on-disk=${mb(bytes).padStart(8)} ` +
      `retained-heap=${mb(after - before).padStart(8)} read+parse=${ms.toFixed(0)} ms`,
  );
  keep.length = 0;
  heap();
}

console.log(`content root: ${ROOT}; ${files.length} JSON files, ${mb(files.reduce((s, f) => s + f.size, 0))}`);
scenario("worst", files.slice(0, MAX));
scenario("search", files.filter((f) => f.p.endsWith("search.json")));
scenario("all", files);

// Single-file parse latency (event-loop block) for the biggest file, 20 runs.
const big = files[0];
const raw = fs.readFileSync(big.p, "utf8");
const runs = [];
for (let i = 0; i < 20; i++) {
  const t = process.hrtime.bigint();
  JSON.parse(raw);
  runs.push(Number(process.hrtime.bigint() - t) / 1e6);
}
runs.sort((a, b) => a - b);
console.log(
  `JSON.parse ${path.relative(ROOT, big.p)} (${mb(big.size)}): median ${runs[10].toFixed(1)} ms, max ${runs[19].toFixed(1)} ms`,
);
