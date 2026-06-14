// Batch-translate all English review quotes → Russian and write `quoteRu` into
// the data (insights.json + segment-insights.json). Uses Yandex Translate
// (you're on Yandex Cloud) — runs server-side, NOT through any model context, so
// it scales to the ~106k unique quotes. The UI already renders quoteRu when
// present (fallback to the original), so a deploy of the data shows it.
//
// Run:
//   YC_FOLDER_ID=<folder> YC_TRANSLATE_KEY=<api-key> node scripts/translate-quotes.mjs
// (Api-Key from a Yandex Cloud service account with ai.translate.user.)
//
// Resumable: quotes that already have quoteRu are skipped, so re-runs are cheap.

import { readFileSync, writeFileSync } from "node:fs";

const FOLDER = process.env.YC_FOLDER_ID;
const KEY = process.env.YC_TRANSLATE_KEY;
if (!FOLDER || !KEY) {
  console.error("Set YC_FOLDER_ID and YC_TRANSLATE_KEY env vars.");
  process.exit(1);
}

const FILES = ["src/data/insights.json", "src/data/segment-insights.json"];
const ENDPOINT = "https://translate.api.cloud.yandex.net/translate/v2/translate";
const MAX_TEXTS = 100; // Yandex caps ~100 texts / ~10k symbols per request
const MAX_CHARS = 9000;

// 1) Collect unique quotes still needing a translation.
const need = new Set();
function walk(node, fn) {
  if (Array.isArray(node)) for (const x of node) walk(x, fn);
  else if (node && typeof node === "object") {
    if (typeof node.quote === "string") fn(node);
    for (const v of Object.values(node)) walk(v, fn);
  }
}
const datas = FILES.map((f) => JSON.parse(readFileSync(f, "utf8")));
for (const d of datas) walk(d, (ev) => { if (ev.quote && !ev.quoteRu) need.add(ev.quote); });
const todo = [...need];
console.log(`Quotes to translate: ${todo.length}`);

// 2) Translate in batches, build a map.
const map = new Map();
async function translateBatch(texts) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Api-Key ${KEY}` },
    body: JSON.stringify({ folderId: FOLDER, texts, sourceLanguageCode: "en", targetLanguageCode: "ru", format: "PLAIN_TEXT" }),
  });
  if (!res.ok) throw new Error(`Yandex ${res.status}: ${await res.text()}`);
  const j = await res.json();
  return j.translations.map((t) => t.text);
}

let batch = [];
let chars = 0;
let done = 0;
async function flush() {
  if (!batch.length) return;
  const out = await translateBatch(batch);
  batch.forEach((q, i) => map.set(q, out[i]));
  done += batch.length;
  process.stdout.write(`\r  translated ${done}/${todo.length}`);
  batch = [];
  chars = 0;
}
for (const q of todo) {
  if (batch.length >= MAX_TEXTS || chars + q.length > MAX_CHARS) await flush();
  batch.push(q);
  chars += q.length;
}
await flush();
console.log("\n  translation done");

// 3) Apply quoteRu back into both files and save.
for (let i = 0; i < FILES.length; i++) {
  let touched = 0;
  walk(datas[i], (ev) => {
    if (ev.quote && !ev.quoteRu && map.has(ev.quote)) {
      ev.quoteRu = map.get(ev.quote);
      touched++;
    }
  });
  writeFileSync(FILES[i], JSON.stringify(datas[i], null, 2) + (FILES[i].endsWith("segment-insights.json") ? "\n" : ""));
  console.log(`  ${FILES[i]}: +${touched} quoteRu`);
}
console.log("Done. Rebuild + deploy: npx tsx scripts/build-segment-insights.ts && git add -A && git commit && git push");
