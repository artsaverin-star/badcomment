import { readFileSync, existsSync } from "node:fs";

// Gate between the extract and merge steps. For every pid passed, checks that
// each batch the manifest promised actually landed as a valid, non-empty
// extract/out/<pid>-NNNN.json. Exits non-zero if ANY batch is missing, unparseable,
// or looks like a Haiku truncation/padding batch (near-zero reviews or zero
// observations across the whole batch). merge silently skips bad files and
// reviewsScanned is taken from the manifest, so without this gate a разбор can
// claim "прочитано 500 отзывов" while really analysing far fewer.
//
// Usage: npx tsx scripts/extract-validate.ts <pid> [<pid> ...]
//   or:  npx tsx scripts/extract-validate.ts --wave wave.txt   (one pid per line)

const OUT_DIR = "extract/out";
const IN_DIR = "extract/in";

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

type Result = { review_id?: string; rating?: number; observations?: unknown[] };

let pids: string[];
if (process.argv[2] === "--wave") {
  const wavePath = process.argv[3];
  if (!wavePath || !existsSync(wavePath)) {
    console.error("usage: extract-validate.ts --wave <file>  (one pid per line)");
    process.exit(1);
  }
  pids = readFileSync(wavePath, "utf8").split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
} else {
  pids = process.argv.slice(2);
}

if (pids.length === 0) {
  console.error("usage: extract-validate.ts <pid> [<pid> ...]");
  process.exit(1);
}

// A batch with at least this many reviews is treated as a real batch; below it,
// the agent almost certainly truncated. Padding batches typically collapse to
// a handful of empty-observation stubs.
const MIN_REVIEWS_PER_BATCH = 20;

type BatchProblem = { batch: number; reason: string };

let totalProblems = 0;
const summary: { pid: string; ok: boolean; batches: number; problems: BatchProblem[] }[] = [];

for (const pid of pids) {
  const manifestPath = `${IN_DIR}/${pid}/manifest.json`;
  if (!existsSync(manifestPath)) {
    console.error(`✗ ${pid}: missing ${manifestPath}`);
    summary.push({ pid, ok: false, batches: 0, problems: [{ batch: 0, reason: "no manifest" }] });
    totalProblems++;
    continue;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { batches?: number; batchSize?: number };
  const batches = manifest.batches ?? 0;
  const problems: BatchProblem[] = [];

  for (let n = 1; n <= batches; n++) {
    const file = `${OUT_DIR}/${pid}-${String(n).padStart(4, "0")}.json`;
    if (!existsSync(file)) {
      problems.push({ batch: n, reason: "missing" });
      continue;
    }
    let parsed: { results?: Result[] };
    try {
      parsed = JSON.parse(stripFences(readFileSync(file, "utf8")));
    } catch {
      problems.push({ batch: n, reason: "invalid JSON" });
      continue;
    }
    if (!parsed.results || !Array.isArray(parsed.results)) {
      problems.push({ batch: n, reason: "no results[]" });
      continue;
    }
    const reviews = parsed.results.length;
    const obs = parsed.results.reduce((s, r) => s + (r.observations?.length ?? 0), 0);
    if (reviews < MIN_REVIEWS_PER_BATCH) {
      problems.push({ batch: n, reason: `truncated (${reviews} reviews)` });
      continue;
    }
    if (obs === 0) {
      problems.push({ batch: n, reason: `empty (0 observations / ${reviews} reviews)` });
      continue;
    }
  }

  const ok = problems.length === 0;
  summary.push({ pid, ok, batches, problems });
  totalProblems += problems.length;

  if (ok) {
    console.log(`✓ ${pid}: ${batches}/${batches} batches valid`);
  } else {
    console.log(`✗ ${pid}: ${batches - problems.length}/${batches} valid — ${problems.length} need repair`);
    for (const p of problems) console.log(`    batch ${String(p.batch).padStart(2)}: ${p.reason}`);
  }
}

const okCount = summary.filter((s) => s.ok).length;
console.log(`\n${okCount}/${summary.length} apps fully valid · ${totalProblems} batches need repair`);

if (totalProblems > 0) {
  console.log("\nREPAIR LIST (rerun these batches, escalate to Sonnet if Haiku re-corrupts):");
  for (const s of summary) {
    if (s.ok) continue;
    const list = s.problems.map((p) => p.batch).join(",");
    console.log(`  ${s.pid}: ${list}`);
  }
  process.exit(1);
}
console.log("\nall clear — safe to merge");
