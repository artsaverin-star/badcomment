#!/usr/bin/env node

// Build resumable workflow manifests containing only apps that do not yet have
// a clustering result. Small chunks keep workflow loader responses bounded and
// make every future run restartable without spending tokens on completed apps.

import fs from "node:fs";

const ALL_PATH = "gen/rev-manifest-all.json";
const OUTPUT_DIR = "gen/rev-manifest-remaining";
const requestedSize = Number(process.argv.find((arg) => arg.startsWith("--chunk-size="))?.split("=")[1] || 100);
const chunkSize = Number.isInteger(requestedSize) && requestedSize > 0 && requestedSize <= 100 ? requestedSize : 100;

const all = JSON.parse(fs.readFileSync(ALL_PATH, "utf8"));
const remaining = all.filter(({ slug, id }) => !fs.existsSync(`gen/rev-out/${slug}/${id}.json`));
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const chunks = [];
for (let offset = 0; offset < remaining.length; offset += chunkSize) {
  const number = String(chunks.length + 1).padStart(3, "0");
  const path = `${OUTPUT_DIR}/chunk-${number}.json`;
  fs.writeFileSync(path, JSON.stringify(remaining.slice(offset, offset + chunkSize), null, 1));
  chunks.push(path);
}

fs.writeFileSync(
  `${OUTPUT_DIR}/index.json`,
  JSON.stringify({ total: remaining.length, chunkSize, chunks }, null, 1),
);

console.log({ totalApps: all.length, completedApps: all.length - remaining.length, remainingApps: remaining.length, chunks: chunks.length });
console.log(`Workflow args: ${JSON.stringify({ chunks })}`);
