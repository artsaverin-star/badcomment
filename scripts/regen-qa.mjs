// QA scan of regenerated content for anomalies: empty fields, billing/bug copy
// that leaked into product cards, English-only titles, duplicates, zero counts.
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(import.meta.dirname, "..");
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));

const segCards = J("src/data/segment-cards.json");
const appCards = J("src/data/app-cards.json");
const ideas = J("src/data/ideas.json");

const BILLING = /подписк|оплат|списа|деньг|возврат|refund|charge|пейвол|paywall|стоимост|биллинг|trial|пробн[ыо]|donat|пожертв/i;
const BUG = /кра[шх]|вылета|зависа|\bбаг|не работает|сломан|глюч|crash|freeze/i;
const hasCyr = (s) => /[а-яё]/i.test(s || "");
const report = { segProductBilling: [], segEmpty: [], segZero: [], segNoEvidence: [], segDupTitles: [], appProductBilling: 0, appEmpty: 0, ideaEmpty: [], ideaNoMech: [], ideaNoReview: [], ideaNoCyr: [] };

for (const [slug, set] of Object.entries(segCards)) {
  const titles = new Set();
  for (const c of set.product || []) {
    if (!c.title) report.segEmpty.push(slug);
    if (BILLING.test(c.title) || BILLING.test(c.minus || "")) report.segProductBilling.push(`${slug}: ${c.title}`);
    if (!c.count) report.segZero.push(`${slug}: ${c.title}`);
    if (!c.evidence || !c.evidence.length) report.segNoEvidence.push(`${slug}: ${c.title}`);
    if (titles.has(c.title)) report.segDupTitles.push(`${slug}: ${c.title}`);
    titles.add(c.title);
  }
}
for (const [, set] of Object.entries(appCards)) {
  for (const c of set.product || []) {
    if (!c.title) report.appEmpty++;
    if (BILLING.test(c.title) || BUG.test(c.title)) report.appProductBilling++;
  }
}
const slugs = new Set();
for (const i of ideas) {
  if (!i.oneLiner || !i.idea?.pitch || !(i.idea?.features || []).length) report.ideaEmpty.push(i.slug);
  if (!(i.mechanisms || []).length) report.ideaNoMech.push(i.slug);
  if (!(i.reviewGrid || []).length) report.ideaNoReview.push(i.slug);
  if (!hasCyr(i.title)) report.ideaNoCyr.push(`${i.slug}: ${i.title}`);
  if (slugs.has(i.slug)) report.ideaNoCyr.push(`DUP SLUG ${i.slug}`);
  slugs.add(i.slug);
}

const sum = (a) => (Array.isArray(a) ? a.length : a);
console.log("=== QA REPORT ===");
console.log("segProductBilling (билинг просочился в продукт):", sum(report.segProductBilling));
report.segProductBilling.slice(0, 12).forEach((x) => console.log("   ·", x));
console.log("segEmptyTitle:", sum(report.segEmpty), "| segZeroCount:", sum(report.segZero), "| segNoEvidence:", sum(report.segNoEvidence), "| segDupTitles:", sum(report.segDupTitles));
report.segDupTitles.slice(0, 8).forEach((x) => console.log("   dup·", x));
console.log("appProductBillingOrBug:", report.appProductBilling, "| appEmptyTitle:", report.appEmpty);
console.log("ideaEmpty(pitch/oneliner/features):", sum(report.ideaEmpty), "| ideaNoMech:", sum(report.ideaNoMech), "| ideaNoReview:", sum(report.ideaNoReview), "| ideaNoCyr/dup:", sum(report.ideaNoCyr));
report.ideaEmpty.slice(0, 10).forEach((x) => console.log("   empty·", x));
report.ideaNoCyr.slice(0, 10).forEach((x) => console.log("   nocyr·", x));
