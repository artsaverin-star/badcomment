import { readFileSync, existsSync } from "node:fs";

// Gate between the cluster and assemble steps. For every pid passed, checks that
// cluster/out/<pid>.json landed as valid JSON with a non-empty clusters[] array
// and usable observation ids. Exits non-zero if ANY app is missing/unparseable/
// empty, so a bulk assemble can't crash one pid at a time — you get the whole
// repair list up front. Missing bespoke groups[] is a soft warning (assemble
// falls back to the fixed theme taxonomy), per the per-app insight-page format.
//
// Usage: npx tsx scripts/cluster-validate.ts <pid> [<pid> ...]
//   or:  npx tsx scripts/cluster-validate.ts --wave extract/wave.tsv   (col 1 = pid)

const OUT_DIR = "cluster/out";

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

type ClusterIn = { id?: string; title?: string; observation_ids?: number[]; obs_ids?: number[] };
type ClusterOut = { clusters?: ClusterIn[]; groups?: unknown[] };

let pids: string[];
if (process.argv[2] === "--wave") {
  const wavePath = process.argv[3];
  if (!wavePath || !existsSync(wavePath)) {
    console.error("usage: cluster-validate.ts --wave <file>  (col 1 = pid, tab-separated)");
    process.exit(1);
  }
  pids = readFileSync(wavePath, "utf8")
    .split("\n")
    .map((l) => l.split("\t")[0].trim())
    .filter((l) => l && !l.startsWith("#"));
} else {
  pids = process.argv.slice(2);
}

if (pids.length === 0) {
  console.error("usage: cluster-validate.ts <pid> [<pid> ...]");
  process.exit(1);
}

const bad: { pid: string; reason: string }[] = [];
let okCount = 0;
let noGroups = 0;

for (const pid of pids) {
  const file = `${OUT_DIR}/${pid}.json`;
  if (!existsSync(file)) {
    bad.push({ pid, reason: "missing" });
    continue;
  }
  let parsed: ClusterOut;
  try {
    parsed = JSON.parse(stripFences(readFileSync(file, "utf8")));
  } catch {
    bad.push({ pid, reason: "invalid JSON" });
    continue;
  }
  if (!parsed.clusters || !Array.isArray(parsed.clusters) || parsed.clusters.length === 0) {
    bad.push({ pid, reason: "no clusters[]" });
    continue;
  }
  const emptyIds = parsed.clusters.filter((c) => {
    const ids = c.observation_ids ?? c.obs_ids;
    return !Array.isArray(ids) || ids.length === 0;
  }).length;
  if (emptyIds === parsed.clusters.length) {
    bad.push({ pid, reason: `all ${parsed.clusters.length} clusters have no observation ids` });
    continue;
  }
  const groups = Array.isArray(parsed.groups) ? parsed.groups.length : 0;
  if (groups === 0) {
    noGroups++;
    console.log(`✓ ${pid}: ${parsed.clusters.length} clusters · ⚠ no bespoke groups (will fall back to themes)`);
  } else {
    console.log(`✓ ${pid}: ${parsed.clusters.length} clusters · ${groups} groups`);
  }
  okCount++;
}

console.log(`\n${okCount}/${pids.length} cluster outputs valid${noGroups ? ` · ${noGroups} without bespoke groups` : ""}`);

if (bad.length > 0) {
  console.log(`\n${bad.length} need re-cluster (rerun the Sonnet cluster agent):`);
  for (const b of bad) console.log(`  ${b.pid}: ${b.reason}`);
  process.exit(1);
}
console.log("\nall clear — safe to assemble");
