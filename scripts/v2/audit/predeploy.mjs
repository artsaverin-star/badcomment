#!/usr/bin/env node
// Site v2 pre-deploy gate: runs every phase-A audit check and prints one summary.
// See docs/site-v2/AUDIT-PHASE-A.md for what each failure means and how to fix it.
//
// Usage (from the repo root):
//   node scripts/v2/audit/predeploy.mjs            # offline checks only
//   node scripts/v2/audit/predeploy.mjs --built    # also inspect the .next build (after `next build`)
//   node scripts/v2/audit/predeploy.mjs --live URL # also smoke a running build (GET only)
//
// Read-only: no files are written, no server is started. Exit 1 when any check fails.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../../..", import.meta.url));
const args = process.argv.slice(2);
const BUILT = args.includes("--built");
const liveIdx = args.indexOf("--live");
const LIVE = liveIdx >= 0 ? args[liveIdx + 1] : null;

const TSX = ["--import", "tsx"];
const checks = [
  { id: "routing-tests", why: "decideRoute contract", cmd: ["npm", ["run", "-s", "test:v2-routing"]] },
  { id: "proxy-attack", why: "NEW rewrites without a page, unsafe return paths", cmd: ["node", [...TSX, "scripts/v2/audit/proxy-attack.ts"]] },
  { id: "seo-routes", why: "sitemap/feed/llms URLs vs routing, noindex, canonicals", cmd: ["node", [...TSX, "scripts/v2/audit/seo-routes.ts", "--source", "code", "--strict"]] },
  { id: "search-cost", why: "?q= worst case (search-query-cap.patch)", cmd: ["node", [...TSX, "scripts/v2/audit/bench-search.ts"]] },
  { id: "old-links", why: "old navigation stays under /<L>/old", cmd: ["node", ["scripts/check-old-links.mjs"]] },
  { id: "content", why: "content/v2 and public/media consistent", cmd: ["node", [...TSX, "scripts/v2/check-content.ts"]] },
];
if (BUILT) {
  checks.push({ id: "static-json", why: "no large JSON bundled into proxy/new pages", cmd: ["node", ["scripts/v2/audit/check-static-json.mjs"]] });
}
if (LIVE) {
  checks.push({ id: "live-smoke", why: `old/new/legal/payment smoke against ${LIVE}`, cmd: ["node", ["scripts/v2/audit/old-site-smoke.mjs", LIVE]] });
}

/** Public new-site pages that still render a "TODO · … placeholder" badge. */
function placeholderScan() {
  const dir = join(ROOT, "src/app/(site)/site/[lang]");
  const hits = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "page.tsx" && /TODO\s*·[^<]*placeholder/.test(readFileSync(p, "utf8"))) hits.push(relative(ROOT, p));
    }
  };
  if (existsSync(dir)) walk(dir);
  return hits;
}

const results = [];
for (const c of checks) {
  const [bin, argv] = c.cmd;
  const r = spawnSync(bin, argv, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const ok = r.status === 0;
  const tail = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-6).join("\n    ");
  results.push({ id: c.id, ok, why: c.why, tail });
}
const placeholders = placeholderScan();
results.push({
  id: "placeholders",
  ok: placeholders.length === 0,
  why: "public new-site pages still showing TODO placeholders",
  tail: placeholders.join("\n    "),
});

for (const r of results) {
  console.log(`${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(14)} ${r.why}`);
  if (!r.ok && r.tail) console.log(`    ${r.tail}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${failed ? `${failed} check(s) failed` : "all checks passed"} — see docs/site-v2/AUDIT-PHASE-A.md`);
process.exit(failed ? 1 : 0);
