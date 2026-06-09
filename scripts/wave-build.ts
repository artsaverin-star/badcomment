import { readFileSync, readdirSync, existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

// Pick the next N extract-ready catalog apps and (optionally) prep their extract
// batches in one shot, so a large overnight wave is push-button.
//
// "Extract-ready" = the catalog app-name resolves to a productId (kebab →
// app-slugs.json), that pid is NOT already a balanced разбор, it has an
// app-context file, and it has local filtered review data. Gem categories
// (hand-authored) are excluded so a bulk run can never clobber them.
//
// Writes the selection to extract/wave.tsv (pid \t ctxSlug \t category \t name \t reviewCount),
// which the extract / cluster / assemble drivers read.
//
// Usage:
//   npx tsx scripts/wave-build.ts [count=50]            # select + write wave.tsv
//   npx tsx scripts/wave-build.ts [count=50] --prep     # also run app-extract-prep for each
//   npx tsx scripts/wave-build.ts [count=50] --prep --sample 500

const COUNT = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 50);
const DO_PREP = process.argv.includes("--prep");
const sampleArg = process.argv.indexOf("--sample");
const SAMPLE = sampleArg >= 0 ? Number(process.argv[sampleArg + 1]) : 500;

// Hand-authored Calm-style разборы live in these categories — never bulk-process.
const GEMS = new Set(["meditation-mindfulness", "sleep-audio"]);
const WAVE_PATH = "extract/wave.tsv";

const kebab = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// pid → app-context filename (slug used by app-extract-prep / app-cluster-prep)
const pidToCtx: Record<string, string> = {};
for (const f of readdirSync("app-context")) {
  if (!f.endsWith(".json") || f.startsWith("_")) continue;
  try {
    const c = JSON.parse(readFileSync(`app-context/${f}`, "utf8")) as { productId?: string };
    if (c.productId) pidToCtx[c.productId] = f.replace(/\.json$/, "");
  } catch {
    /* skip unreadable context */
  }
}

const slugs = JSON.parse(readFileSync("src/data/app-slugs.json", "utf8")) as Record<string, string>;
const slugKeys = Object.keys(slugs);
function resolvePid(name: string): string | null {
  const k = kebab(name);
  if (slugs[k]) return slugs[k];
  const pre = slugKeys.find((x) => x === k || x.startsWith(k + "-") || k.startsWith(x + "-"));
  return pre ? slugs[pre] : null;
}

const insights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Array<{
  productId?: string;
  balanced?: boolean;
  insights?: unknown[];
}>;
const balanced = new Set(
  insights
    .filter((p) => p.balanced === true && p.productId && Array.isArray(p.insights) && p.insights.length > 0)
    .map((p) => p.productId as string),
);

type Candidate = { pid: string; ctx: string; category: string; name: string; reviews: number };
const ready: Candidate[] = [];
const seen = new Set<string>();
const domains = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Array<{
  categories: Array<{ slug: string; apps?: string[] }>;
}>;

for (const d of domains) {
  for (const c of d.categories) {
    if (GEMS.has(c.slug)) continue;
    for (const name of c.apps ?? []) {
      const pid = resolvePid(name);
      if (!pid || balanced.has(pid) || seen.has(pid)) continue;
      const ctx = pidToCtx[pid];
      if (!ctx) continue;
      const dataFile = `data/${pid}-filtered.json`;
      if (!existsSync(dataFile)) continue;
      let reviews = 0;
      try {
        reviews = (JSON.parse(readFileSync(dataFile, "utf8")) as unknown[]).length;
      } catch {
        continue;
      }
      seen.add(pid);
      ready.push({ pid, ctx, category: c.slug, name, reviews });
    }
  }
}

ready.sort((a, b) => b.reviews - a.reviews);
const wave = ready.slice(0, COUNT);

const lines = wave.map((w) => `${w.pid}\t${w.ctx}\t${w.category}\t${w.name}\t${w.reviews}`);
writeFileSync(WAVE_PATH, lines.join("\n") + "\n");

console.log(`extract-ready pool: ${ready.length} apps (non-gem, not balanced, has context + data)`);
console.log(`selected ${wave.length} for this wave → ${WAVE_PATH}\n`);
const byCat: Record<string, number> = {};
for (const w of wave) byCat[w.category] = (byCat[w.category] ?? 0) + 1;
for (const [cat, n] of Object.entries(byCat).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(n).padStart(2)} · ${cat}`);
}

if (!DO_PREP) {
  console.log(`\n(dry select. re-run with --prep to build extract batches for all ${wave.length})`);
  process.exit(0);
}

console.log(`\nprepping extract batches (sample=${SAMPLE}/app)…`);
let ok = 0;
let totalBatches = 0;
for (const w of wave) {
  try {
    const out = execSync(`npx tsx scripts/app-extract-prep.ts ${w.ctx} 50 ${SAMPLE}`, { encoding: "utf8" });
    const m = out.match(/(\d+)\s+batch/i);
    const nb = m ? Number(m[1]) : 0;
    totalBatches += nb;
    ok++;
    console.log(`  ✓ ${w.ctx} (${w.pid})`);
  } catch (e) {
    console.error(`  ✗ ${w.ctx} (${w.pid}): prep failed`);
    console.error(String((e as { stderr?: Buffer }).stderr ?? e).slice(0, 200));
  }
}
console.log(`\nprepped ${ok}/${wave.length} apps · ~${totalBatches} batches total`);
console.log(`next: launch extract agents, then  npx tsx scripts/extract-validate.ts --wave <pids>`);
