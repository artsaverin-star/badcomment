import fs from "node:fs";
import path from "node:path";

// Big JSON under src/data is read from disk when first needed, never `import`ed.
// An import inlines the whole file into every server bundle that reaches it (the same
// file sat in 3–5 bundles) and `next start` loads every bundle at boot, so the server
// held ~2 GB before serving a page (found 2026-10-11, moving to a 2 GB box shared with
// Roomdo). Paths are relative to the app root, like review-data/ in lib/reviews.ts:
// the box runs from the git checkout, CI and scripts from the repo root.
//
//   dataFile(rel)        a whole file, parsed once per process — for files up to a few MB
//   jsonShards(rel, …)   a big keyed file, split once into a file per key and read per key

const DATA_DIR = path.join(process.cwd(), "src", "data");
// Outside .next on purpose: a deploy replaces .next, and re-splitting a 40 MB file is the
// one memory spike this module has. Keyed by the source's size and mtime (gitignored).
const SHARD_ROOT = path.join(process.cwd(), ".data-shards");

type Store = { files: Map<string, unknown>; shards: Map<string, unknown> };
// One store per process, even when this module is bundled into several server chunks.
const g = globalThis as typeof globalThis & { __inappDataStore?: Store };
const store: Store = (g.__inappDataStore ??= { files: new Map(), shards: new Map() });

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** A whole JSON file from src/data, parsed on first use and kept for the process. */
export function dataFile<T>(rel: string): T {
  if (!store.files.has(rel)) store.files.set(rel, readJson(path.join(DATA_DIR, rel)));
  return store.files.get(rel) as T;
}

/** A whole JSON file from src/data, parsed on every call and not kept (for rare, heavy reads). */
export function readDataFile<T>(rel: string): T {
  return readJson(path.join(DATA_DIR, rel)) as T;
}

export type Shards<T, M> = {
  /** The entry for `key`, or null. */
  get(key: string): T | null;
  has(key: string): boolean;
  /** Every key, in the source file's order. */
  keys(): string[];
  /** The small facts `summarize` derived from the whole file. */
  meta(): M;
};

type ShardIndex<M> = { keys: string[]; meta: M };

/**
 * A big keyed JSON file from src/data, read one key at a time.
 *
 * On first use the source is parsed once and written as one file per key to
 * .data-shards/<file>-<size>-<mtime>/ (redone only when the file changes, kept across
 * deploys and restarts). After that only the requested keys are read;
 * the last `keep` stay in memory. `split` yields the entries (first occurrence of a key
 * wins); `summarize` derives small facts from the whole file, which stay in memory.
 */
export function jsonShards<T, M = undefined>(
  rel: string,
  split: (data: unknown) => Iterable<[string, T]>,
  summarize?: (data: unknown) => M,
  keep = 8,
): Shards<T, M> {
  const existing = store.shards.get(rel);
  if (existing) return existing as Shards<T, M>;

  let dir = "";
  let index: (ShardIndex<M> & { set: Set<string> }) | null = null;
  const recent = new Map<string, T>();

  const load = () => {
    if (index) return index;
    const src = path.join(DATA_DIR, rel);
    const st = fs.statSync(src);
    const base = rel.replace(/[^\w.-]+/g, "_");
    dir = path.join(SHARD_ROOT, `${base}-${st.size}-${Math.trunc(st.mtimeMs)}`);
    const indexFile = path.join(dir, "_index.json");
    if (!fs.existsSync(indexFile)) writeShards(src, dir, base, split, summarize);
    const read = readJson(indexFile) as ShardIndex<M>;
    index = { ...read, set: new Set(read.keys) };
    return index;
  };

  const shards: Shards<T, M> = {
    has: (key) => load().set.has(key),
    keys: () => load().keys,
    meta: () => load().meta,
    get(key) {
      if (!load().set.has(key)) return null;
      let value = recent.get(key);
      if (value !== undefined) {
        recent.delete(key);
      } else {
        value = readJson(path.join(dir, shardName(key))) as T;
        while (recent.size >= keep) recent.delete(recent.keys().next().value!);
      }
      recent.set(key, value);
      return value;
    },
  };
  store.shards.set(rel, shards);
  return shards;
}

function shardName(key: string): string {
  return `${encodeURIComponent(key)}.json`;
}

function writeShards<T, M>(
  src: string,
  dir: string,
  base: string,
  split: (data: unknown) => Iterable<[string, T]>,
  summarize?: (data: unknown) => M,
) {
  const data = readJson(src);
  const tmp = `${dir}.tmp-${process.pid}-${Date.now()}`;
  fs.mkdirSync(tmp, { recursive: true });
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const [key, value] of split(data)) {
    if (seen.has(key)) continue;
    seen.add(key);
    keys.push(key);
    fs.writeFileSync(path.join(tmp, shardName(key)), JSON.stringify(value));
  }
  const meta = summarize ? summarize(data) : undefined;
  fs.writeFileSync(path.join(tmp, "_index.json"), JSON.stringify({ keys, meta }));
  try {
    fs.renameSync(tmp, dir);
  } catch {
    // Another process (a parallel build worker) finished first; its copy is identical.
    fs.rmSync(tmp, { recursive: true, force: true });
    return;
  }
  // Drop finished splits of earlier versions of the same file (never another worker's .tmp-).
  for (const name of fs.readdirSync(SHARD_ROOT)) {
    const old = path.join(SHARD_ROOT, name);
    if (old !== dir && name.startsWith(`${base}-`) && !name.includes(".tmp-")) fs.rmSync(old, { recursive: true, force: true });
  }
}
