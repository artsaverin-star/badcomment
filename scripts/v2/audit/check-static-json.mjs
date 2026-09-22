#!/usr/bin/env node
// Site v2 audit helper (read-only): which JSON is STATICALLY bundled into the proxy and into
// new-site server code. Big JSON in these graphs costs heap on the 1.9 GB production box and
// parse time on the first request after every restart.
//
//   node scripts/v2/audit/check-static-json.mjs [--max-kb=256] [--verbose]
//
// Two views:
//   1. SOURCE graph (always): follows relative and "@/..." imports from src/proxy.ts,
//      src/app/(site)/**, src/app/api/site/**, src/site/**. It does NOT model tree shaking, so a
//      JSON listed here may be dropped by Turbopack — treat it as "one refactor away".
//   2. BUILT graph (when .next/server exists, i.e. after `next build`): reads the chunks each
//      new-site page/route and the proxy actually load, and lists the JSON modules inside them
//      (from the chunk source maps). This is authoritative for the current build.
// Exit 1 when: the proxy reaches any JSON (either view) or > 32 KB of project source; any view
// reaches content/v2/** (ARCHITECTURE §2: read it with fs); a BUILT new-site entry bundles a
// JSON module larger than --max-kb (default 256).
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const NEXT_SERVER = path.join(ROOT, ".next", "server");
const args = process.argv.slice(2);
const MAX_KB = Number((args.find((a) => a.startsWith("--max-kb=")) ?? "--max-kb=256").split("=")[1]);
const VERBOSE = args.includes("--verbose");
const PROXY_SRC_BUDGET = 32 * 1024;

const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx", ".json"];
const IMPORT_RE =
  /(?:^|[^\w$.])(?:import|export)\s+(?:type\s+)?(?:[\w$*{}\s,]+\s+from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)|require\(\s*["']([^"']+)["']\s*\)/gm;

const rel = (p) => path.relative(ROOT, p);
const kb = (n) => (n / 1024).toFixed(1) + " KB";
let failed = false;
const fail = (msg) => {
  failed = true;
  console.log("  FAIL " + msg);
};

// ---------------------------------------------------------------- 1. source graph

function resolveSpec(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // a package: not followed
  const candidates = [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, "index" + e))];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {}
  }
  return null;
}

// `import type {...} from "x"` never reaches a bundle.
const stripTypeOnly = (src) =>
  src.replace(/^\s*(?:import|export)\s+type\s+[^;]*?from\s+["'][^"']+["'];?/gm, "");

function walk(entry) {
  const prev = new Map([[entry, null]]);
  const json = new Map();
  let srcBytes = 0;
  const queue = [entry];
  while (queue.length) {
    const file = queue.shift();
    const size = fs.statSync(file).size;
    if (file.endsWith(".json")) {
      json.set(file, size);
      continue;
    }
    if (!/\.(m?[jt]sx?)$/.test(file)) continue;
    srcBytes += size;
    for (const m of stripTypeOnly(fs.readFileSync(file, "utf8")).matchAll(IMPORT_RE)) {
      const r = resolveSpec(file, m[1] ?? m[2] ?? m[3]);
      if (r && !prev.has(r)) {
        prev.set(r, file);
        queue.push(r);
      }
    }
  }
  const chain = (target) => {
    const out = [];
    for (let c = target; c; c = prev.get(c)) out.unshift(rel(c));
    return out.join(" -> ");
  };
  return { files: [...prev.keys()], json, srcBytes, chain };
}

function listFiles(dir, re = /\.(m?[jt]sx?)$/) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, re));
    else if (re.test(e.name)) out.push(p);
  }
  return out;
}

console.log("== SOURCE graph (no tree shaking)");
const proxy = walk(path.join(SRC, "proxy.ts"));
console.log(`proxy: ${proxy.files.length} project modules, ${kb(proxy.srcBytes)} source, ${proxy.json.size} JSON`);
if (VERBOSE) for (const f of proxy.files) console.log("    " + rel(f));
for (const [f, s] of proxy.json) fail(`proxy imports JSON ${rel(f)} (${kb(s)}): ${proxy.chain(f)}`);
if (proxy.srcBytes > PROXY_SRC_BUDGET) fail(`proxy source ${kb(proxy.srcBytes)} > ${kb(PROXY_SRC_BUDGET)}`);

const entries = [
  ...listFiles(path.join(SRC, "app", "(site)")),
  ...listFiles(path.join(SRC, "app", "api", "site")),
  ...listFiles(path.join(SRC, "site")),
];
const reach = new Map(); // json -> { size, entries:Set, chain }
for (const e of entries) {
  const g = walk(e);
  for (const [f, size] of g.json) {
    if (!reach.has(f)) reach.set(f, { size, entries: new Set(), chain: g.chain(f) });
    reach.get(f).entries.add(e);
  }
}
const srcRows = [...reach].sort((a, b) => b[1].size - a[1].size);
const srcTotal = srcRows.reduce((s, [, r]) => s + r.size, 0);
console.log(`new site: ${entries.length} modules; ${srcRows.length} JSON reachable in source, ${kb(srcTotal)}`);
const shown = VERBOSE ? srcRows : srcRows.slice(0, 8);
for (const [f, r] of shown) {
  if (rel(f).startsWith("content/v2/")) fail(`content/v2 imported statically: ${r.chain}`);
  console.log(`  ${kb(r.size).padStart(10)}  ${rel(f)}\n              via ${r.chain}`);
}
if (shown.length < srcRows.length) console.log(`  … ${srcRows.length - shown.length} more (use --verbose)`);

// ---------------------------------------------------------------- 2. built graph

function chunksOf(entryJs) {
  const text = fs.readFileSync(entryJs, "utf8");
  return [...text.matchAll(/R\.c\("server\/([^"]+)"\)/g)].map((m) => path.join(NEXT_SERVER, m[1]));
}

const mapCache = new Map();
function jsonModulesInChunk(chunk) {
  if (mapCache.has(chunk)) return mapCache.get(chunk);
  const out = new Map();
  const mapFile = chunk + ".map";
  if (fs.existsSync(mapFile)) {
    const m = JSON.parse(fs.readFileSync(mapFile, "utf8"));
    for (const sec of m.sections ?? [m]) {
      const mm = sec.map ?? sec;
      (mm.sources ?? []).forEach((s, i) => {
        const hit = decodeURIComponent(s).match(/turbopack:\/\/\/(.+\.json)$/) ?? decodeURIComponent(s).match(/(src\/.+\.json)/);
        if (hit) out.set(hit[1], (mm.sourcesContent?.[i] ?? "").length);
      });
    }
  }
  mapCache.set(chunk, out);
  return out;
}

if (!fs.existsSync(NEXT_SERVER)) {
  console.log("\n== BUILT graph: skipped (no .next/server; run after `next build`)");
} else {
  const built = fs.statSync(path.join(ROOT, ".next", "BUILD_ID")).mtime;
  console.log(`\n== BUILT graph (.next built ${built.toISOString()})`);
  const proxyEntry = path.join(NEXT_SERVER, "middleware.js");
  if (fs.existsSync(proxyEntry)) {
    const pj = new Map();
    let bytes = 0;
    for (const c of chunksOf(proxyEntry)) {
      if (!fs.existsSync(c)) continue;
      bytes += fs.statSync(c).size;
      for (const [j, s] of jsonModulesInChunk(c)) pj.set(j, s);
    }
    console.log(`proxy: chunks ${kb(bytes)}, ${pj.size} JSON modules`);
    for (const [j, s] of pj) fail(`built proxy bundles ${j} (${kb(s)})`);
  }
  const builtEntries = [
    ...listFiles(path.join(NEXT_SERVER, "app", "(site)"), /^(page|route)\.js$/),
    ...listFiles(path.join(NEXT_SERVER, "app", "api", "site"), /^(page|route)\.js$/),
  ];
  for (const e of builtEntries) {
    let bytes = 0;
    const js = new Map();
    for (const c of chunksOf(e)) {
      if (!fs.existsSync(c)) continue;
      bytes += fs.statSync(c).size;
      for (const [j, s] of jsonModulesInChunk(c)) js.set(j, s);
    }
    const jsonBytes = [...js.values()].reduce((a, b) => a + b, 0);
    const name = rel(e).replace(/^\.next\/server\/app\//, "");
    console.log(`  ${name}: chunks ${kb(bytes)}, JSON ${js.size} (${kb(jsonBytes)})`);
    for (const [j, s] of [...js].sort((a, b) => b[1] - a[1])) {
      if (j.startsWith("content/v2/")) fail(`${name} bundles ${j}`);
      else if (s > MAX_KB * 1024) fail(`${name} bundles ${j} (${kb(s)} > ${MAX_KB} KB)`);
      else if (VERBOSE) console.log(`      ${kb(s).padStart(10)}  ${j}`);
    }
  }
}

process.exit(failed ? 1 : 0);
