#!/usr/bin/env node
/**
 * Export every image listed in content/v2/_build/used-images.json to public/media
 * (spec 04 §6.3). Run after scripts/v2/import-app-content.ts.
 *
 *   node scripts/v2/export-images.mjs            # encode new/changed images, skip unchanged
 *   node scripts/v2/export-images.mjs --force    # re-encode everything
 *
 * Output:
 *   public/media/ideas/<slug>-{480,800,1200}.webp          (photo: WebP q78, effort 6)
 *   public/media/research/<asset>-{480,800,1200}.webp      (photo)
 *   public/media/welcome/<asset>-{400,800}.webp            (alpha: WebP q82, alpha q90)
 *   public/media/app-icon-{180,512}.png                    (icon)
 * Widths never upscale (the importer lists only widths ≤ the source width).
 * Unchanged outputs are skipped using content/v2/_build/media-stamp.json
 * (source sha256 + widths + encoder settings). Stale files are removed.
 *
 * Env: APP_RESOURCES (default: manifest.source.path), EXPORT_CONCURRENCY.
 * Encoder: the installed `sharp`; falls back to cwebp/sips when sharp is unavailable.
 */

import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const REPO = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT = path.join(REPO, "content/v2");
const USED = path.join(CONTENT, "_build/used-images.json");
const STAMP = path.join(CONTENT, "_build/media-stamp.json");
const OUT = path.join(REPO, "public/media");
const FORCE = process.argv.includes("--force");
const MEDIA_DIRS = ["ideas", "research", "welcome"];

const PARAMS = {
  photo: { quality: 78, effort: 6 },
  alpha: { quality: 82, alphaQuality: 90, effort: 6 },
  icon: { compressionLevel: 9 },
};

function fail(msg) {
  console.error(`\n✖ ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(USED)) fail(`${path.relative(REPO, USED)} not found — run: npx tsx scripts/v2/import-app-content.ts`);
const used = JSON.parse(fs.readFileSync(USED, "utf8"));
const manifestPath = path.join(CONTENT, "manifest.json");
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : null;
const RES = path.resolve(
  process.env.APP_RESOURCES ?? manifest?.source?.path ?? path.join(os.homedir(), "projects/app_04_inapp/Inapp/Resources"),
);
if (!fs.existsSync(RES)) fail(`app resources not found: ${RES} (set APP_RESOURCES)`);

// --- encoder -------------------------------------------------------------------------
let sharp = null;
try {
  sharp = (await import("sharp")).default;
  sharp.cache(false);
} catch {
  sharp = null;
}
const CWEBP = ["/opt/homebrew/bin/cwebp", "/usr/local/bin/cwebp", "/usr/bin/cwebp"].find((p) => fs.existsSync(p)) ?? "cwebp";
const ENCODER = sharp
  ? `sharp ${sharp.versions?.sharp ?? "?"} / libwebp ${sharp.versions?.webp ?? "?"}`
  : `cwebp (${CWEBP})`;

const outputsOf = (entry) =>
  entry.kind === "icon"
    ? entry.widths.map((w) => ({ w, rel: `${entry.out}-${w}.png` }))
    : entry.widths.map((w) => ({ w, rel: `${entry.out}-${w}.webp` }));

const stampKey = (entry) =>
  createHash("sha256")
    .update(JSON.stringify({ src: entry.sha256, kind: entry.kind, widths: entry.widths, params: PARAMS[entry.kind], encoder: sharp ? "sharp" : "cwebp" }))
    .digest("hex");

async function writeAtomic(file, produce) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  await produce(tmp);
  fs.renameSync(tmp, file);
}

async function encodeWithSharp(entry, source, outputs) {
  const input = sharp(source, { failOn: "error" });
  for (const { w, rel } of outputs) {
    const file = path.join(OUT, rel);
    await writeAtomic(file, async (tmp) => {
      let pipeline = input.clone().resize({ width: w, withoutEnlargement: true });
      if (entry.kind === "icon") pipeline = pipeline.png(PARAMS.icon);
      else pipeline = pipeline.webp(PARAMS[entry.kind]);
      await pipeline.toFile(tmp);
    });
  }
}

async function encodeWithCli(entry, sourceFile, outputs) {
  for (const { w, rel } of outputs) {
    const file = path.join(OUT, rel);
    await writeAtomic(file, async (tmp) => {
      if (entry.kind === "icon") {
        await run("sips", ["-Z", String(w), sourceFile, "--out", tmp]);
        return;
      }
      const p = PARAMS[entry.kind];
      const args = ["-quiet", "-q", String(p.quality), "-m", String(p.effort)];
      if (p.alphaQuality) args.push("-alpha_q", String(p.alphaQuality));
      if (w < entry.width) args.push("-resize", String(w), "0");
      await run(CWEBP, [...args, sourceFile, "-o", tmp]);
    });
  }
}

// --- run -----------------------------------------------------------------------------
const stamp = fs.existsSync(STAMP) ? JSON.parse(fs.readFileSync(STAMP, "utf8")) : {};
const nextStamp = {};
const expected = new Set();
let encoded = 0;
let skipped = 0;
const problems = [];

const queue = [...used];
const started = Date.now();
const concurrency = Math.max(1, Number(process.env.EXPORT_CONCURRENCY) || Math.min(8, Math.max(2, Math.floor(os.cpus().length / 2))));

async function worker() {
  for (;;) {
    const entry = queue.shift();
    if (!entry) return;
    const outputs = outputsOf(entry);
    for (const o of outputs) expected.add(o.rel);
    const key = stampKey(entry);
    const complete = outputs.every((o) => fs.existsSync(path.join(OUT, o.rel)));
    if (!FORCE && stamp[entry.out] === key && complete) {
      nextStamp[entry.out] = key;
      skipped++;
      continue;
    }
    const sourceFile = path.join(RES, entry.file);
    if (!fs.existsSync(sourceFile)) {
      problems.push(`${entry.out}: source missing (${entry.file})`);
      continue;
    }
    const source = fs.readFileSync(sourceFile);
    const sha = createHash("sha256").update(source).digest("hex");
    if (sha !== entry.sha256) {
      problems.push(`${entry.out}: source changed since the import (${entry.file}); re-run import-app-content.ts first`);
      continue;
    }
    try {
      if (sharp) await encodeWithSharp(entry, source, outputs);
      else await encodeWithCli(entry, sourceFile, outputs);
      nextStamp[entry.out] = key;
      encoded++;
      if (encoded % 50 === 0) console.log(`  … ${encoded} images encoded`);
    } catch (e) {
      problems.push(`${entry.out}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

console.log(`Exporting ${used.length} images with ${ENCODER}, concurrency ${concurrency}${FORCE ? " (forced)" : ""}`);
await Promise.all(Array.from({ length: concurrency }, worker));

// Remove stale outputs (only inside the generated folders and app-icon-*.png).
let removed = 0;
for (const dir of MEDIA_DIRS) {
  const abs = path.join(OUT, dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    const rel = `${dir}/${f}`;
    if (!expected.has(rel)) {
      fs.rmSync(path.join(abs, f));
      removed++;
    }
  }
}
if (fs.existsSync(OUT)) {
  for (const f of fs.readdirSync(OUT)) {
    if (/^app-icon-\d+\.png$/.test(f) && !expected.has(f)) {
      fs.rmSync(path.join(OUT, f));
      removed++;
    }
  }
}

fs.writeFileSync(STAMP, JSON.stringify(Object.fromEntries(Object.entries(nextStamp).sort()), null, 1) + "\n");

// Report
const sizes = { ideas: [0, 0], research: [0, 0], welcome: [0, 0], icon: [0, 0] };
let total = 0;
let files = 0;
for (const rel of expected) {
  const file = path.join(OUT, rel);
  if (!fs.existsSync(file)) continue;
  const size = fs.statSync(file).size;
  const group = rel.startsWith("app-icon") ? "icon" : rel.split("/")[0];
  sizes[group][0]++;
  sizes[group][1] += size;
  total += size;
  files++;
}
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(
  `\n${encoded} encoded, ${skipped} unchanged, ${removed} stale removed in ${((Date.now() - started) / 1000).toFixed(1)} s`,
);
console.log(`public/media: ${files} files, ${mb(total)}`);
for (const [group, [n, bytes]] of Object.entries(sizes)) console.log(`  ${group.padEnd(9)} ${String(n).padStart(4)} files  ${mb(bytes)}`);
if (problems.length) fail(`${problems.length} image(s) failed:\n  - ${problems.join("\n  - ")}`);
if (files !== expected.size) fail(`${expected.size - files} expected output file(s) are missing`);
