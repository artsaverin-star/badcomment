#!/usr/bin/env node
// Localization audit helper for the new site (review/i18n-quality.md).
// Read-only: parses src/site/** and src/app/(site)/** with the TypeScript compiler API and
//   1. extracts every app-UI key passed to t("…"), t.count("…"), t.plural("…") (literal first
//      argument; dynamic arguments are resolved through same-file object/array literals when
//      possible and listed otherwise) plus every literal in a *_KEYS array;
//   2. checks each key against content/v2/<L>/ui.json (strings for t(), plurals for
//      t.count/t.plural) for en, de, fr, ja (+ ru as the source) and says what the fallback
//      chain would render when the key is missing (own → builtin → en → Russian key);
//   3. checks that keys used in "use client" files are handed to the client by some
//      *_KEYS array (t.pick) — a client t() of a key nobody picked renders Russian in
//      production (makeT(locale, emptyPack, null, strings) → BUILTIN_UI → the key);
//   4. lists hard-coded Cyrillic string literals / JSX text that are not keys and not the
//      `ru:` side of a strings table (leak candidates).
//
// Usage: node docs/site-v2/review/check-ui-keys.mjs [--json]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../..");
const require = createRequire(path.join(ROOT, "package.json"));
const ts = require("typescript");

const DIRS = ["src/site", "src/app/(site)"];
const LOCALES = ["ru", "en", "de", "fr", "ja"];
const CYR = /[А-Яа-яЁё]/;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.generated\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

const packs = {};
for (const L of LOCALES) {
  const f = path.join(ROOT, "content/v2", L, "ui.json");
  packs[L] = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { strings: {}, plurals: {} };
}

// BUILTIN_UI (src/site/i18n/builtin.ts) — parsed, not imported.
const builtin = {};
{
  const f = path.join(ROOT, "src/site/i18n/builtin.ts");
  const sf = ts.createSourceFile(f, fs.readFileSync(f, "utf8"), ts.ScriptTarget.Latest, true);
  sf.forEachChild(function visit(n) {
    if (ts.isVariableDeclaration(n) && n.name.getText() === "BUILTIN_UI" && n.initializer && ts.isObjectLiteralExpression(n.initializer)) {
      for (const p of n.initializer.properties) {
        const L = p.name.getText().replace(/["']/g, "");
        builtin[L] = {};
        for (const q of p.initializer.properties) builtin[L][q.name.text] = q.initializer.text;
      }
    }
    n.forEachChild(visit);
  });
}

const uses = []; // {key, kind: t|count|plural, file, line, client}
const dynamic = []; // {file, line, text}
const keyArrays = new Map(); // name -> {file, items: [], spreads: []}
const cyr = []; // {file, line, text, context}

const rel = (f) => path.relative(ROOT, f);

for (const dir of DIRS) {
  for (const file of walk(path.join(ROOT, dir))) {
    const src = fs.readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const client = /^\s*["']use client["']/.test(src);
    const line = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
    const isStringsTable = /\/strings\.ts$/.test(file);
    const isBuiltin = file.endsWith("i18n/builtin.ts");

    // same-file literal maps, for t(MAP[x])
    const literalMaps = new Map();
    sf.forEachChild(function collect(n) {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        let init = n.initializer;
        while (ts.isAsExpression(init) || ts.isSatisfiesExpression?.(init) || ts.isTypeAssertionExpression?.(init)) init = init.expression;
        const vals = [];
        if (ts.isObjectLiteralExpression(init)) {
          for (const p of init.properties) if (ts.isPropertyAssignment(p) && ts.isStringLiteralLike(p.initializer)) vals.push(p.initializer.text);
        } else if (ts.isArrayLiteralExpression(init)) {
          for (const e of init.elements) if (ts.isStringLiteralLike(e)) vals.push(e.text);
        }
        if (vals.length) literalMaps.set(n.name.getText(), vals);
        if (/_KEYS$/.test(n.name.getText()) && ts.isArrayLiteralExpression(init)) {
          const items = [];
          const spreads = [];
          for (const e of init.elements) {
            if (ts.isStringLiteralLike(e)) items.push(e.text);
            else if (ts.isSpreadElement(e)) spreads.push(e.expression.getText());
          }
          keyArrays.set(n.name.getText(), { file: rel(file), items, spreads });
        }
      }
      n.forEachChild(collect);
    });

    const inside = (n, pred) => {
      for (let p = n.parent; p; p = p.parent) if (pred(p)) return p;
      return null;
    };

    sf.forEachChild(function visit(n) {
      if (ts.isCallExpression(n)) {
        const callee = n.expression.getText();
        const m = /^(?:props\.|ctx\.)?t(\.count|\.plural)?$/.exec(callee);
        if (m && n.arguments.length) {
          const kind = m[1] ? m[1].slice(1) : "t";
          const a = n.arguments[0];
          if (ts.isStringLiteralLike(a)) uses.push({ key: a.text, kind, file: rel(file), line: line(n), client });
          else {
            // t(MAP[x]) / t(NAME)
            let resolved = false;
            const base = ts.isElementAccessExpression(a) ? a.expression.getText() : ts.isIdentifier(a) ? a.getText() : null;
            if (base && literalMaps.has(base)) {
              for (const k of literalMaps.get(base)) uses.push({ key: k, kind, file: rel(file), line: line(n), client, via: base });
              resolved = true;
            }
            if (!resolved) dynamic.push({ file: rel(file), line: line(n), text: n.getText(sf).slice(0, 120) });
          }
        }
      }
      if ((ts.isStringLiteralLike(n) || ts.isJsxText(n)) && CYR.test(n.text ?? n.getText())) {
        const text = (n.text ?? n.getText()).trim();
        let context = "literal";
        const call = inside(n, (p) => ts.isCallExpression(p) && /^(?:props\.|ctx\.)?t(\.count|\.plural)?$/.test(p.expression.getText()));
        const keysArr = inside(n, (p) => ts.isVariableDeclaration(p) && /_KEYS$/.test(p.name.getText()));
        const ruProp = inside(n, (p) => ts.isPropertyAssignment(p) && /^["']?ru["']?$/.test(p.name.getText()));
        const ruFn = inside(n, (p) => (ts.isFunctionDeclaration(p) && p.name?.getText() === "ru") || (ts.isCaseClause(p) && /["']ru["']/.test(p.expression.getText())));
        if (call) context = "t-key";
        else if (keysArr) context = "keys-array";
        else if (isBuiltin) context = "builtin";
        else if (isStringsTable && ruProp) context = "strings-ru";
        else if (ruProp || ruFn) context = "ru-branch";
        else if (literalMaps.size && inside(n, (p) => ts.isVariableDeclaration(p) && literalMaps.has(p.name.getText()))) context = "map-literal";
        if (packs.ru.strings[text] !== undefined && context === "literal") context = "literal-is-ui-key";
        cyr.push({ file: rel(file), line: line(n), text: text.slice(0, 140), context });
      }
      n.forEachChild(visit);
    });
  }
}

// resolve *_KEYS spreads
const resolveArray = (name, seen = new Set()) => {
  if (seen.has(name)) return [];
  seen.add(name);
  const a = keyArrays.get(name);
  if (!a) return [];
  return [...a.items, ...a.spreads.flatMap((s) => resolveArray(s, seen))];
};
const provided = new Set();
for (const name of keyArrays.keys()) for (const k of resolveArray(name)) provided.add(k);
for (const name of keyArrays.keys()) {
  for (const k of keyArrays.get(name).items) uses.push({ key: k, kind: "t", file: keyArrays.get(name).file, line: 0, client: false, via: name });
}

// check presence
function effective(L, key, kind) {
  if (L === "ru") return { value: key, source: "identity" };
  if (kind !== "t") {
    const own = packs[L].plurals?.[key];
    if (own) return { value: JSON.stringify(own), source: "own" };
    return { value: key, source: "MISSING-plural(fallback key/ru)" };
  }
  if (packs[L].strings[key] !== undefined) return { value: packs[L].strings[key], source: "own" };
  if (builtin[L]?.[key] !== undefined) return { value: builtin[L][key], source: "builtin" };
  if (packs.en.strings[key] !== undefined) return { value: packs.en.strings[key], source: "en-fallback" };
  if (builtin.en?.[key] !== undefined) return { value: builtin.en[key], source: "builtin-en" };
  return { value: key, source: "RUSSIAN-KEY" };
}

const byKey = new Map();
for (const u of uses) {
  const id = `${u.kind}\u0000${u.key}`;
  if (!byKey.has(id)) byKey.set(id, { key: u.key, kind: u.kind, sites: [] });
  byKey.get(id).sites.push(u);
}

const missing = [];
for (const { key, kind, sites } of byKey.values()) {
  const row = { key, kind, sites: sites.map((s) => `${s.file}:${s.line}${s.via ? ` (${s.via})` : ""}`) };
  let bad = false;
  row.ruPack = kind === "t" ? key in packs.ru.strings : !!packs.ru.plurals?.[key];
  for (const L of ["en", "de", "fr", "ja"]) {
    const e = effective(L, key, kind);
    row[L] = e.source;
    if (e.source !== "own") bad = true;
  }
  if (bad || !row.ruPack) missing.push(row);
}

const clientMissing = [];
for (const u of uses.filter((u) => u.client && u.kind === "t")) {
  if (!provided.has(u.key)) clientMissing.push(`${u.file}:${u.line}  t(${JSON.stringify(u.key)})${u.via ? ` via ${u.via}` : ""}`);
}

// Per-file provider coverage (which <I18nProvider strings={t.pick(…)}> wraps each client file;
// SHELL_UI_KEYS from the root layout wraps everything). Hand-maintained from the pages.
const COVER = {
  "src/site/shell/": ["SHELL_UI_KEYS"],
  "src/site/features/research/ArticleChrome.tsx": ["RESEARCH_ARTICLE_UI_KEYS"],
  "src/site/features/library/components.tsx": ["LIBRARY_UI_KEYS"],
  "src/site/features/library/SavedScreen.tsx": ["SAVED_UI_KEYS"],
  "src/site/features/ideas/IdeaReader.tsx": ["IDEA_READER_UI_KEYS"],
  "src/site/features/ideas/ExportSheet.tsx": ["EXPORT_UI_KEYS"],
  "src/site/features/ideas/IdeasCatalog.tsx": ["IDEAS_CATALOG_UI_KEYS"],
  "src/site/features/auth/": ["PLUS_UI_KEYS"],
  "src/site/features/plus/": ["PLUS_UI_KEYS"],
  // The shared Plus card renders inside /<L>/settings (caption "account": SETTINGS_CLIENT_KEYS)
  // and /<L>/mcp (caption "static": MCP_UI_KEYS). Coverage is "any of", so a key only the
  // account caption uses must stay out of the static branch (PlusCard.tsx keeps them apart).
  "src/site/features/plus/PlusCard.tsx": ["SETTINGS_CLIENT_KEYS", "MCP_UI_KEYS"],
  "src/site/features/settings/": ["SETTINGS_CLIENT_KEYS"],
  "src/site/features/welcome/": ["WELCOME_UI_KEYS"],
  "src/site/features/rating/": ["RATING_UI_KEYS"],
  "src/site/features/reviews/": ["REVIEWS_UI_KEYS"],
  "src/site/features/mcp/": ["MCP_UI_KEYS"],
};
const perFileMissing = [];
for (const u of uses.filter((u) => u.client && u.kind === "t" && u.line > 0)) {
  const arrays = ["SHELL_UI_KEYS", ...Object.entries(COVER).filter(([p]) => u.file.startsWith(p)).flatMap(([, a]) => a)];
  const ok = arrays.some((a) => resolveArray(a).includes(u.key));
  if (!ok) perFileMissing.push(`${u.file}:${u.line}  t(${JSON.stringify(u.key)}) not in ${arrays.join(" + ")}`);
}

const leakCandidates = cyr.filter((c) => c.context === "literal" || c.context === "literal-is-ui-key" || c.context === "map-literal");

const report = {
  files: DIRS,
  uniqueKeys: byKey.size,
  totalUses: uses.length,
  keysMissingSomewhere: missing,
  dynamicCalls: dynamic,
  clientKeysNotPicked: [...new Set(clientMissing)],
  clientKeysNotInTheirProvider: [...new Set(perFileMissing)],
  keyArrays: Object.fromEntries([...keyArrays].map(([k, v]) => [k, `${v.file} (${resolveArray(k).length} keys)`])),
  cyrillicLiteralsOutsideTables: leakCandidates,
};

// Non-zero exit when something would render Russian on a non-ru page (usable as a CI gate).
if (missing.some((r) => ["en", "de", "fr", "ja"].some((L) => /RUSSIAN|MISSING/.test(r[L]))) || clientMissing.length || perFileMissing.length) {
  process.exitCode = 1;
}

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`unique keys: ${report.uniqueKeys}, uses: ${report.totalUses}`);
  console.log(`\n== keys missing in some pack (${missing.length})`);
  for (const r of missing) console.log(`- [${r.kind}] ${JSON.stringify(r.key)} ru:${r.ruPack} en:${r.en} de:${r.de} fr:${r.fr} ja:${r.ja}\n    ${r.sites.join("\n    ")}`);
  console.log(`\n== dynamic t() calls not resolved (${dynamic.length})`);
  for (const d of dynamic) console.log(`- ${d.file}:${d.line} ${d.text}`);
  console.log(`\n== client t() keys not in any *_KEYS array (${report.clientKeysNotPicked.length})`);
  for (const c of report.clientKeysNotPicked) console.log(`- ${c}`);
  console.log(`\n== client t() keys not in the provider that wraps the file (${report.clientKeysNotInTheirProvider.length})`);
  for (const c of report.clientKeysNotInTheirProvider) console.log(`- ${c}`);
  console.log(`\n== *_KEYS arrays`);
  for (const [k, v] of Object.entries(report.keyArrays)) console.log(`- ${k}: ${v}`);
  console.log(`\n== Cyrillic literals outside t()/keys/ru tables (${leakCandidates.length})`);
  for (const c of leakCandidates) console.log(`- ${c.file}:${c.line} [${c.context}] ${JSON.stringify(c.text)}`);
}
