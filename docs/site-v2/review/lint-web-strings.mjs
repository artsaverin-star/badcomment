#!/usr/bin/env node
// Typography / tone lint of the web-only string tables (src/site/**/strings.ts) per locale.
// Read-only. Usage: node docs/site-v2/review/lint-web-strings.mjs
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const ts = createRequire(path.join(ROOT, "package.json"))("typescript");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name === "strings.ts") out.push(p);
  }
  return out;
}

const RULES = {
  all: [
    [/\.\.\./, "three dots → …"],
    [/"/, "straight double quote"],
    [/ {2,}/, "double space"],
    [/\s$|^\s/, "leading/trailing space"],
  ],
  ru: [
    [/(^|[^\p{L}])(т\. ?п\.|т\. ?е\.|т\. ?д\.)/u, "abbrev: use NBSP inside «т. п.» / «т. е.»"],
    [/ - /, "hyphen as dash → —"],
    [/“|”|„/, "non-Russian quotes"],
    [/\b(вы|вас|вам|ваш|ваша|ваши|вашего|Вы|Вас|Вам|Ваш)\b/u, "formal «вы»"],
  ],
  en: [
    [/'/, "straight apostrophe → ’"],
    [/«|»|„/, "foreign quotes"],
  ],
  de: [
    [/\b(Sie|Ihnen|Ihr|Ihre|Ihren|Ihrem|Ihrer)\b/, "formal Sie (app uses du)"],
    [/«|»|“[^“”]*”/, "non-German quotes (use „…“)"],
    [/ …/, "space before … (app: no space)"],
    [/ – /, "en dash (app de pack uses — em dash)"],
    [/App Store-|App-Store (?=[A-Z])/, "hyphenation of App-Store compounds"],
    [/'/, "straight apostrophe"],
  ],
  fr: [
    [/\b(vous|votre|vos)\b/i, "formal vous (app uses tu)"],
    [/ [:;!?»]/, "plain space before : ; ! ? » (app fr pack uses U+00A0)"],
    [/« /, "plain space after « (app fr pack uses U+00A0)"],
    [/[^\s  ][;!?»]/, "no space before ; ! ? »"],
    [/“|”|„/, "non-French quotes (use « … »)"],
    [/'/, "straight apostrophe → ’"],
  ],
  ja: [
    [/いただ|ございます|ご利用|ご購入|ご連絡|お問い合わせください/, "keigo (app ja pack never uses いただく/ご〜いただけ)"],
    [/だよ|だね|してね|しよう|ろう[。！]?$|よう[。！]?$/, "casual volitional/sentence-final (app: です・ます)"],
    [/[A-Za-z0-9}] [぀-ヿ一-鿿]|[぀-ヿ一-鿿] [A-Za-z{]/, "space between Japanese and Latin (app: none)"],
    [/[^\x00-\x7f][:?!(]|[:?!)][^\x00-\x7f]/, "ASCII punctuation next to Japanese (use ：？！（）)"],
    [/«|»|“|”|„/, "non-Japanese quotes (use 「」)"],
    [/ — | – /, "Western dash with spaces (use ——/（）)"],
    [/\{\w+\}つ/, "number + つ counter (wrong above 9; use 件/個 or no counter)"],
  ],
};

const rows = [];
for (const file of walk(path.join(ROOT, "src/site"))) {
  const src = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
  sf.forEachChild(function visit(n) {
    if (ts.isCallExpression(n) && n.expression.getText() === "defineStrings" && ts.isObjectLiteralExpression(n.arguments[0])) {
      for (const block of n.arguments[0].properties) {
        const L = block.name.getText().replace(/["']/g, "");
        if (!ts.isObjectLiteralExpression(block.initializer)) continue;
        for (const p of block.initializer.properties) {
          if (!ts.isPropertyAssignment(p) || !ts.isStringLiteralLike(p.initializer)) continue;
          const v = p.initializer.text;
          const line = sf.getLineAndCharacterOfPosition(p.getStart(sf)).line + 1;
          for (const [re, why] of [...RULES.all, ...(RULES[L] ?? [])]) {
            if (re.test(v)) rows.push({ file: path.relative(ROOT, file), line, L, id: p.name.getText(), why, v });
          }
        }
      }
    }
    n.forEachChild(visit);
  });
}
rows.sort((a, b) => a.L.localeCompare(b.L) || a.why.localeCompare(b.why) || a.file.localeCompare(b.file) || a.line - b.line);
let last = "";
for (const r of rows) {
  const head = `${r.L} · ${r.why}`;
  if (head !== last) console.log(`\n== ${head}`);
  last = head;
  console.log(`- ${r.file}:${r.line} ${r.id}: ${JSON.stringify(r.v).slice(0, 170)}`);
}
console.log(`\n${rows.length} hits`);
