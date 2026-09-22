"use client";

import { useSyncExternalStore } from "react";
import type { LibraryState, MaterialKind, SyncOp } from "./protocol";

// Saved items and notes — the web port of the app's Shelf + StudioNotebook
// (spec 02 §5–§6, spec 09 §2.5). CONTRACT used by the research, ideas and saved
// features: keep these exports and their signatures stable.
//
// Local-first like the app ("stored on this device"): localStorage is the source
// the UI reads synchronously. Account sync (./sync.tsx) sits on top: it observes
// local mutations (onLibraryChange) and pushes them to /api/site/library, and after a
// pull/merge it swaps the whole state in (replaceLibrary) — no events for that.
//
// Rules (app parity):
//   • bookmarks are newest first (insert at 0); re-saving a saved item keeps its place;
//   • removing a bookmark never deletes the note;
//   • a note that is blank after trimming deletes the entry;
//   • saving a note (even an emptied one) bookmarks the material if it wasn't (spec 02 §5.2).
// Unreadable stored data is never silently lost: the raw value is copied to "<key>:corrupt"
// before the key is written again (spec 02 §9.2).

export type { MaterialKind } from "./protocol";

/** Note key in the app's format: "idea:<slug>" | "research:<slug>". */
export const noteKey = (kind: MaterialKind, slug: string) => `${kind}:${slug}`;

const KEYS = {
  research: "ia2:saved.research",
  idea: "ia2:saved.ideas",
  notes: "ia2:notes",
} as const;
const KEY_LIST: readonly string[] = Object.values(KEYS);

type Snapshot = {
  research: readonly string[];
  idea: readonly string[];
  notes: Readonly<Record<string, string>>;
};

const EMPTY: Snapshot = { research: [], idea: [], notes: {} };
let snapshot: Snapshot = EMPTY;
let loaded = false;
let watching = false;
const listeners = new Set<() => void>();
/** Library feature hook: called after every local mutation (for server sync). */
const mutationListeners = new Set<(change: LibraryChange) => void>();

/** A local mutation, in the sync wire format (./protocol SyncOp). */
export type LibraryChange = SyncOp;

function backup(key: string, raw: string) {
  try {
    if (window.localStorage.getItem(`${key}:corrupt`) === null) window.localStorage.setItem(`${key}:corrupt`, raw);
  } catch {
    // nothing else we can do
  }
}

function readRaw(key: string): { raw: string | null; value: unknown } {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return { raw, value: undefined };
    try {
      return { raw, value: JSON.parse(raw) as unknown };
    } catch {
      return { raw, value: Symbol.for("corrupt") };
    }
  } catch {
    return { raw: null, value: undefined }; // storage disabled
  }
}

function readList(key: string): string[] {
  const { raw, value } = readRaw(key);
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    if (raw !== null) backup(key, raw);
    return [];
  }
  const out: string[] = [];
  for (const v of value) if (typeof v === "string" && v && !out.includes(v)) out.push(v);
  return out;
}

function readNotes(key: string): Record<string, string> {
  const { raw, value } = readRaw(key);
  if (value === undefined) return {};
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    if (raw !== null) backup(key, raw);
    return {};
  }
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string" && v.trim() && /^(research|idea):./.test(k)) out[k] = v;
  }
  return out;
}

function readAll(): Snapshot {
  return { research: readList(KEYS.research), idea: readList(KEYS.idea), notes: readNotes(KEYS.notes) };
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  snapshot = readAll();
  if (watching) return;
  watching = true;
  // Another tab changed the library: re-read (that tab's sync layer pushes its own changes).
  window.addEventListener("storage", (e) => {
    if (e.key !== null && !KEY_LIST.includes(e.key)) return;
    snapshot = readAll();
    emit();
  });
}

function emit() {
  for (const l of listeners) l();
}

/** Write the state; false when the browser refused (private mode, quota). The UI state updates either way. */
function persist(next: Snapshot): boolean {
  snapshot = next;
  let ok = true;
  try {
    window.localStorage.setItem(KEYS.research, JSON.stringify(next.research));
    window.localStorage.setItem(KEYS.idea, JSON.stringify(next.idea));
    window.localStorage.setItem(KEYS.notes, JSON.stringify(next.notes));
  } catch {
    ok = false;
  }
  emit();
  return ok;
}

function notify(change: LibraryChange) {
  for (const l of mutationListeners) l(change);
}

function subscribe(fn: () => void) {
  load();
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function getSnapshot(): Snapshot {
  load();
  return snapshot;
}

const getServerSnapshot = () => EMPTY;

/** Whole library (for the Saved screen). Empty during SSR and hydration — see useLibraryHydrated. */
export function useLibrary(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** False on the server and during hydration; true once the browser's library is readable. */
export function useLibraryHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Current library outside React (sync layer). */
export function getLibrary(): LibraryState {
  load();
  return { research: [...snapshot.research], idea: [...snapshot.idea], notes: { ...snapshot.notes } };
}

export function useIsSaved(kind: MaterialKind, slug: string): boolean {
  const s = useLibrary();
  return s[kind].includes(slug);
}

export function useNote(kind: MaterialKind, slug: string): string {
  const s = useLibrary();
  return s.notes[noteKey(kind, slug)] ?? "";
}

/**
 * Bookmark on/off. A new bookmark goes first (newest), like the app; saving an already
 * saved item changes nothing. Removing never deletes the note. Returns false only when
 * the browser refused to store the change.
 */
export function setSaved(kind: MaterialKind, slug: string, saved: boolean): boolean {
  load();
  const has = snapshot[kind].includes(slug);
  if (has === saved) return true;
  const list = snapshot[kind].filter((s) => s !== slug);
  const ok = persist({ ...snapshot, [kind]: saved ? [slug, ...list] : list });
  notify({ type: "saved", kind, slug, saved });
  return ok;
}

export function toggleSaved(kind: MaterialKind, slug: string): boolean {
  load();
  const next = !snapshot[kind].includes(slug);
  setSaved(kind, slug, next);
  return next;
}

/**
 * The note editor's «Сохранить» (spec 02 §5.2): write the note — blank text deletes it —
 * then bookmark the material if it isn't bookmarked yet (also when the note was emptied).
 * Returns false when the browser refused to store it (the editor then stays open).
 */
export function saveNote(kind: MaterialKind, slug: string, text: string): boolean {
  load();
  const key = noteKey(kind, slug);
  const value = text.trim() ? text : "";
  const noteChanged = (snapshot.notes[key] ?? "") !== value;
  const notes = { ...snapshot.notes };
  if (value) notes[key] = value;
  else delete notes[key];
  const bookmark = !snapshot[kind].includes(slug);
  if (!noteChanged && !bookmark) return true;
  const ok = persist({ ...snapshot, notes, ...(bookmark ? { [kind]: [slug, ...snapshot[kind]] } : {}) });
  if (noteChanged) notify({ type: "note", kind, slug, text: value });
  if (bookmark) notify({ type: "saved", kind, slug, saved: true });
  return ok;
}

/** For the library feature's sync layer: replace the whole local state (e.g. after a server merge). No events. */
export function replaceLibrary(next: { research: string[]; idea: string[]; notes: Record<string, string> }) {
  load();
  const notes: Record<string, string> = {};
  for (const [k, v] of Object.entries(next.notes)) if (typeof v === "string" && v.trim()) notes[k] = v;
  persist({ research: [...new Set(next.research)], idea: [...new Set(next.idea)], notes });
}

/** For the library feature's sync layer: observe local mutations. */
export function onLibraryChange(fn: (change: LibraryChange) => void): () => void {
  mutationListeners.add(fn);
  return () => mutationListeners.delete(fn);
}
