#!/usr/bin/env node

// Validate the deployable category-wide layer independently from the per-app
// theme audit. A cross-app pattern must be repeated, multi-product and backed
// by inspectable review evidence.

import fs from "node:fs";

const patterns = JSON.parse(fs.readFileSync("src/data/reviewNichePatterns.json", "utf8"));
const catalog = JSON.parse(fs.readFileSync("src/data/reviewNicheCatalog.json", "utf8"));
const issues = [];

for (const [slug, list] of Object.entries(patterns)) {
  const seen = new Set();
  for (const [index, pattern] of list.entries()) {
    const location = `${slug}[${index}]`;
    const title = String(pattern.title || "").toLocaleLowerCase("ru").trim();
    if (!title) issues.push(`${location}: missing title`);
    if (seen.has(title)) issues.push(`${location}: duplicate title`);
    seen.add(title);
    if (!["love", "pain", "mixed"].includes(pattern.polarity)) issues.push(`${location}: invalid polarity`);
    if ((Number(pattern.count) || 0) < 8) issues.push(`${location}: fewer than 8 signals`);
    if (!Array.isArray(pattern.apps) || new Set(pattern.apps).size < 3) issues.push(`${location}: fewer than 3 apps`);
    if (!Array.isArray(pattern.evidence) || !pattern.evidence.length) issues.push(`${location}: no evidence`);
    for (const evidence of pattern.evidence || []) {
      if (!evidence.app || !evidence.quote || evidence.rating < 0 || evidence.rating > 5) issues.push(`${location}: malformed evidence`);
    }
  }
  if (catalog[slug]?.patterns !== list.length) issues.push(`${slug}: catalog pattern count mismatch`);
}

for (const slug of Object.keys(catalog)) {
  if (!patterns[slug]?.length) issues.push(`${slug}: no category patterns`);
}

const report = {
  niches: Object.keys(catalog).length,
  patternNiches: Object.keys(patterns).length,
  patterns: Object.values(patterns).flat().length,
  sourceApps: Object.values(catalog).reduce((sum, niche) => sum + niche.appsPlanned, 0),
  sourceReviews: Object.values(catalog).reduce((sum, niche) => sum + niche.sourceReviews, 0),
  issues: issues.length,
};

console.log("Category pattern quality audit");
console.log(report);
if (issues.length) {
  console.log(issues.join("\n"));
  process.exitCode = 1;
}
