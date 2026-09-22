// Site v2 audit helper (read-only): CPU cost of the catalogue search helpers
// (src/site/content/search.ts) for a normal query and for the longest `?q=` an 8 KB request
// line allows. Research search runs on the server (spec 09 G10), so a slow worst case is a
// cheap way to pin both vCPUs of the production box.
//
//   node --import tsx scripts/v2/audit/bench-search.ts [--budget-ms=20]
//
// Exits 1 when any worst-case query costs more than the budget (per request, this machine).
import fs from "node:fs";
import path from "node:path";

import { filterIdeas, searchResearch } from "../../../src/site/content/search";
import type { LocaleCode } from "../../../src/site/content/types";

const ROOT = process.cwd();
const BUDGET = Number((process.argv.find((a) => a.startsWith("--budget-ms=")) ?? "--budget-ms=20").split("=")[1]);
const read = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, "content", "v2", rel), "utf8"));

function ms(fn: () => unknown, runs = 3): number {
  fn(); // warm-up
  const t = process.hrtime.bigint();
  for (let i = 0; i < runs; i++) fn();
  return Number(process.hrtime.bigint() - t) / 1e6 / runs;
}

let failed = false;
const cases: Array<[LocaleCode, string, string]> = [
  // [locale, normal query, worst case that fits an 8 KB request line after URL encoding]
  ["en", "habit tracker", "a ".repeat(4000).trim()],
  ["ru", "трекер привычек", "и ".repeat(1100).trim()],
];
for (const [locale, normal, worst] of cases) {
  const index = read(`${locale}/search.json`);
  const catalog = read(`${locale}/catalog.json`);
  const categories = catalog.categories.map((c: { slug: string; name: string }) => ({ slug: c.slug, name: c.name }));
  for (const [label, q] of [
    ["normal", normal],
    ["8KB ?q=", worst],
  ] as const) {
    const research = ms(() => searchResearch(index, categories, q, locale));
    const ideas = ms(() =>
      filterIdeas(catalog.ideas, { query: q, locale, canRead: () => true, haystacks: index.ideas }),
    );
    const bad = label !== "normal" && (research > BUDGET || ideas > BUDGET);
    if (bad) failed = true;
    console.log(
      `${bad ? "FAIL" : "ok  "} ${locale} ${label.padEnd(8)} searchResearch ${research.toFixed(2).padStart(8)} ms  filterIdeas ${ideas.toFixed(2).padStart(8)} ms`,
    );
  }
}
process.exit(failed ? 1 : 0);
