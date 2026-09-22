#!/usr/bin/env node
// French typography codemod for the web-only copy (review/i18n-quality.md, finding M1).
// The app's ui.fr.json puts U+00A0 before « : ; ! ? » » and after « (344 times); the web-only
// fr strings use a plain space. This rewrites ONLY string literals / JSX text inside the `fr`
// part of each file:
//   * src/site/**/strings.ts           → the `fr: { … }` block of defineStrings(...)
//   * src/site/features/legal/*.tsx    → `function fr(…)` or the `case "fr":` branch
// Default is a dry run that prints every change; pass --write to apply (owners only).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const ts = createRequire(path.join(ROOT, "package.json"))("typescript");
const WRITE = process.argv.includes("--write");

const fix = (s) =>
  s
    .replace(/ ([:;!?»])/g, " $1") // plain space before : ; ! ? »
    .replace(/« /g, "« ") // plain space after «
    .replace(/([^\s  (])([;!?])(?=\s|$)/g, "$1 $2"); // no space at all before ; ! ?

const files = fs
  .readdirSync(path.join(ROOT, "src/site"), { recursive: true })
  .map((f) => path.join("src/site", f))
  .filter((f) => /strings\.ts$/.test(f) || /features\/legal\/(terms|privacy|support)\.tsx$/.test(f));

let total = 0;
for (const rel of files) {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, rel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const ranges = [];
  sf.forEachChild(function visit(n) {
    if (ts.isPropertyAssignment(n) && n.name.getText() === "fr" && ts.isObjectLiteralExpression(n.initializer)) ranges.push([n.getStart(sf), n.end]);
    if (ts.isFunctionDeclaration(n) && n.name?.getText() === "fr") ranges.push([n.getStart(sf), n.end]);
    if (ts.isCaseClause(n) && n.expression.getText() === '"fr"') ranges.push([n.getStart(sf), n.end]);
    n.forEachChild(visit);
  });
  const edits = [];
  sf.forEachChild(function visit(n) {
    const inFr = ranges.some(([a, b]) => n.getStart(sf) >= a && n.end <= b);
    if (inFr && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n))) {
      const start = n.getStart(sf);
      const raw = src.slice(start, n.end);
      const next = fix(raw);
      if (next !== raw) edits.push([start, n.end, raw, next]);
    }
    n.forEachChild(visit);
  });
  if (!edits.length) continue;
  total += edits.length;
  console.log(`\n${rel}: ${edits.length} literal(s)`);
  for (const [s, , raw, next] of edits) {
    const line = sf.getLineAndCharacterOfPosition(s).line + 1;
    console.log(`  ${line}: ${JSON.stringify(raw.trim()).slice(0, 110)}\n     → ${JSON.stringify(next.trim()).slice(0, 110)}`);
  }
  if (WRITE) {
    let out = src;
    for (const [s, e, , next] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + next + out.slice(e);
    fs.writeFileSync(file, out);
  }
}
console.log(`\n${total} literal(s) ${WRITE ? "rewritten" : "would change (dry run; --write to apply)"}`);
