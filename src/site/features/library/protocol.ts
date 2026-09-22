// Wire format of the library sync (saved items + notes) between the browser and
// /api/site/library. Client-safe and pure: no React, no DOM, no manifest import.
//
//   GET  /api/site/library          → LibraryPayload                (401 for guests)
//   POST /api/site/library          {ops: SyncOp[]} → {applied, rejected}
//   POST /api/site/library/merge    LibraryState → LibraryPayload   (one-time union on sign-in)
//
// Validation of untrusted input lives in ./validate.ts (server + tests).

export type MaterialKind = "research" | "idea";

export const MATERIAL_KINDS: readonly MaterialKind[] = ["research", "idea"];

/** Notes are capped like the app's server contract (spec 09 G10). UTF-16 units, as <textarea maxLength>. */
export const NOTE_MAX = 20_000;

/** Max operations per POST /api/site/library. */
export const MAX_OPS = 200;

/** The library as the store keeps it: bookmark lists newest first + notes keyed "<kind>:<slug>". */
export type LibraryState = {
  research: string[];
  idea: string[];
  notes: Record<string, string>;
};

/** Response of GET and of the merge: the account copy, newest first. */
export type LibraryPayload = LibraryState & {
  /** Account id: the client keys its one-time merge flag and its outbox by it. */
  user: string;
};

export type SyncOp =
  | { type: "saved"; kind: MaterialKind; slug: string; saved: boolean }
  | { type: "note"; kind: MaterialKind; slug: string; text: string };

export type OpsResponse = {
  applied: number;
  rejected: { index: number; reason: string }[];
};

export const EMPTY_LIBRARY: LibraryState = { research: [], idea: [], notes: {} };

export const noteKeyOf = (kind: MaterialKind, slug: string) => `${kind}:${slug}`;

/** "idea:habit-tracking-3" → {kind, slug}; null for anything else. */
export function parseNoteKey(key: string): { kind: MaterialKind; slug: string } | null {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  const kind = key.slice(0, i);
  const slug = key.slice(i + 1);
  if ((kind !== "research" && kind !== "idea") || !slug) return null;
  return { kind, slug };
}

/** Coalescing key: only the last operation per material and type matters. */
export const opKey = (op: SyncOp) => `${op.type}:${op.kind}:${op.slug}`;

/**
 * Apply operations to a state exactly as the store does locally (newest first, a note
 * that is blank after trimming deletes the entry). Used to lay pending local changes
 * over a freshly pulled account copy.
 */
export function applyOps(state: LibraryState, ops: readonly SyncOp[]): LibraryState {
  const next: LibraryState = { research: [...state.research], idea: [...state.idea], notes: { ...state.notes } };
  for (const op of ops) {
    if (op.type === "saved") {
      const list = next[op.kind];
      const at = list.indexOf(op.slug);
      if (op.saved && at === -1) list.unshift(op.slug);
      else if (!op.saved && at !== -1) list.splice(at, 1);
    } else {
      const key = noteKeyOf(op.kind, op.slug);
      if (op.text.trim()) next.notes[key] = op.text;
      else delete next.notes[key];
    }
  }
  return next;
}

/**
 * Combine the account's note with the browser's note during the one-time merge, losing
 * neither: equal (or one contains the other) → the longer one; otherwise account text,
 * a blank line, then the browser text (capped at NOTE_MAX). null = no note.
 */
export function combineNotes(account: string | undefined, local: string | undefined): string | null {
  const a = account && account.trim() ? account : null;
  const l = local && local.trim() ? local : null;
  if (!a) return l ? l.slice(0, NOTE_MAX) : null;
  if (!l || a === l || a.includes(l)) return a;
  if (l.includes(a)) return l.slice(0, NOTE_MAX);
  return `${a}\n\n${l}`.slice(0, NOTE_MAX);
}

/** Order-insensitive equality of two states (lists compared in order, notes by key). */
export function sameLibrary(a: LibraryState, b: LibraryState): boolean {
  const sameList = (x: readonly string[], y: readonly string[]) => x.length === y.length && x.every((v, i) => v === y[i]);
  if (!sameList(a.research, b.research) || !sameList(a.idea, b.idea)) return false;
  const ka = Object.keys(a.notes);
  if (ka.length !== Object.keys(b.notes).length) return false;
  return ka.every((k) => b.notes[k] === a.notes[k]);
}
