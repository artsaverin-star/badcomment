// Validation of untrusted library-sync input (the /api/site/library handlers call these;
// scripts/v2/test-library-api.ts tests them). Pure: no DB, no Next, no React.
// Only the app's launch edition is accepted: 35 topic slugs, 293 idea ids (spec 09 G12).

import { isLaunchCategory, isLaunchIdea } from "../../manifest.generated";
import { MAX_OPS, NOTE_MAX, parseNoteKey, type LibraryState, type MaterialKind, type SyncOp } from "./protocol";

/** Upper bounds for the merge body (the launch edition is 35 + 293; anything bigger is junk). */
export const MERGE_MAX_LIST = 1_000;
export const MERGE_MAX_NOTES = 2_000;

export function isMaterialKind(value: unknown): value is MaterialKind {
  return value === "research" || value === "idea";
}

/** kind is valid and slug belongs to the launch manifest. */
export function isKnownMaterial(kind: unknown, slug: unknown): kind is MaterialKind {
  if (!isMaterialKind(kind) || typeof slug !== "string" || slug.length === 0 || slug.length > 120) return false;
  return kind === "research" ? isLaunchCategory(slug) : isLaunchIdea(slug);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

export type ParsedOps =
  | { ok: true; ops: SyncOp[]; rejected: { index: number; reason: string }[] }
  | { ok: false; error: string };

/**
 * POST /api/site/library body: {ops: [...]}, at most MAX_OPS entries. A malformed body is a
 * 400; individual bad operations (unknown slug, note too long, …) are skipped and reported,
 * so one stale entry can never block the rest of a client's queue.
 */
export function parseOps(body: unknown): ParsedOps {
  if (!isRecord(body) || !Array.isArray(body.ops)) return { ok: false, error: "expected {ops: []}" };
  if (body.ops.length > MAX_OPS) return { ok: false, error: `too many ops (max ${MAX_OPS})` };
  const ops: SyncOp[] = [];
  const rejected: { index: number; reason: string }[] = [];
  body.ops.forEach((raw: unknown, index: number) => {
    const reason = opProblem(raw);
    if (reason) {
      rejected.push({ index, reason });
      return;
    }
    const op = raw as Record<string, unknown>;
    ops.push(
      op.type === "saved"
        ? { type: "saved", kind: op.kind as MaterialKind, slug: op.slug as string, saved: op.saved as boolean }
        : { type: "note", kind: op.kind as MaterialKind, slug: op.slug as string, text: op.text as string },
    );
  });
  return { ok: true, ops, rejected };
}

function opProblem(raw: unknown): string | null {
  if (!isRecord(raw)) return "not an object";
  if (raw.type !== "saved" && raw.type !== "note") return "unknown type";
  if (!isMaterialKind(raw.kind)) return "unknown kind";
  if (!isKnownMaterial(raw.kind, raw.slug)) return "unknown slug";
  if (raw.type === "saved") return typeof raw.saved === "boolean" ? null : "saved must be a boolean";
  if (typeof raw.text !== "string") return "text must be a string";
  if (raw.text.length > NOTE_MAX) return `note longer than ${NOTE_MAX} characters`;
  return null;
}

export type ParsedMerge = { ok: true; state: LibraryState; dropped: number } | { ok: false; error: string };

/**
 * POST /api/site/library/merge body: the browser's whole library. Entries outside the
 * launch edition are dropped (and counted); duplicates are removed keeping the first
 * (= newest) position; notes longer than NOTE_MAX are cut; blank notes are ignored.
 */
export function parseMergeBody(body: unknown): ParsedMerge {
  if (!isRecord(body)) return { ok: false, error: "expected an object" };
  const { research = [], idea = [], notes = {} } = body;
  if (!Array.isArray(research) || !Array.isArray(idea)) return { ok: false, error: "research and idea must be arrays" };
  if (!isRecord(notes)) return { ok: false, error: "notes must be an object" };
  if (research.length > MERGE_MAX_LIST || idea.length > MERGE_MAX_LIST) return { ok: false, error: "list too long" };
  const noteEntries = Object.entries(notes);
  if (noteEntries.length > MERGE_MAX_NOTES) return { ok: false, error: "too many notes" };

  let dropped = 0;
  const list = (kind: MaterialKind, values: unknown[]) => {
    const out: string[] = [];
    for (const v of values) {
      if (!isKnownMaterial(kind, v)) dropped++;
      else if (!out.includes(v as string)) out.push(v as string);
    }
    return out;
  };
  const state: LibraryState = { research: list("research", research), idea: list("idea", idea), notes: {} };
  for (const [key, text] of noteEntries) {
    const ref = parseNoteKey(key);
    if (!ref || !isKnownMaterial(ref.kind, ref.slug) || typeof text !== "string") {
      dropped++;
      continue;
    }
    if (!text.trim()) continue;
    state.notes[key] = text.slice(0, NOTE_MAX);
  }
  return { ok: true, state, dropped };
}
