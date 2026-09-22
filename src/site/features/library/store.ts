"use client";

import { useSyncExternalStore } from "react";

// Saved items and notes — the web port of the app's Shelf + StudioNotebook
// (spec 02 §5–§6, spec 09 §2.5). CONTRACT used by the research, ideas and saved
// features: keep these exports and their signatures stable.
//
// Local-first like the app ("stored on this device"): localStorage is the source
// the UI reads synchronously. The library feature adds account sync on top
// (push local changes to /api/site/library when signed in, merge once on sign-in)
// without changing this API.

export type MaterialKind = "research" | "idea";

/** Note key in the app's format: "idea:<slug>" | "research:<slug>". */
export const noteKey = (kind: MaterialKind, slug: string) => `${kind}:${slug}`;

const KEYS = {
  research: "ia2:saved.research",
  idea: "ia2:saved.ideas",
  notes: "ia2:notes",
} as const;

type Snapshot = {
  research: readonly string[];
  idea: readonly string[];
  notes: Readonly<Record<string, string>>;
};

const EMPTY: Snapshot = { research: [], idea: [], notes: {} };
let snapshot: Snapshot = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
/** Library feature hook: called after every local mutation (for server sync). */
const mutationListeners = new Set<(change: LibraryChange) => void>();

export type LibraryChange =
  | { type: "saved"; kind: MaterialKind; slug: string; saved: boolean }
  | { type: "note"; kind: MaterialKind; slug: string; text: string };

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  snapshot = {
    research: readJSON<string[]>(KEYS.research, []),
    idea: readJSON<string[]>(KEYS.idea, []),
    notes: readJSON<Record<string, string>>(KEYS.notes, {}),
  };
  window.addEventListener("storage", (e) => {
    if (e.key && !Object.values(KEYS).includes(e.key as (typeof KEYS)[keyof typeof KEYS])) return;
    loaded = false;
    load();
    emit();
  });
}

function emit() {
  for (const l of listeners) l();
}

function persist(next: Snapshot) {
  snapshot = next;
  try {
    window.localStorage.setItem(KEYS.research, JSON.stringify(next.research));
    window.localStorage.setItem(KEYS.idea, JSON.stringify(next.idea));
    window.localStorage.setItem(KEYS.notes, JSON.stringify(next.notes));
  } catch {
    // Private mode / quota: keep the in-memory state for this tab.
  }
  emit();
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

/** Whole library (for the Saved screen). */
export function useLibrary(): Snapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsSaved(kind: MaterialKind, slug: string): boolean {
  const s = useLibrary();
  return s[kind].includes(slug);
}

export function useNote(kind: MaterialKind, slug: string): string {
  const s = useLibrary();
  return s.notes[noteKey(kind, slug)] ?? "";
}

/** Bookmark on/off. Newest first, like the app (insert at 0). Removing never deletes the note. */
export function setSaved(kind: MaterialKind, slug: string, saved: boolean) {
  load();
  const list = snapshot[kind].filter((s) => s !== slug);
  persist({ ...snapshot, [kind]: saved ? [slug, ...list] : list });
  for (const l of mutationListeners) l({ type: "saved", kind, slug, saved });
}

export function toggleSaved(kind: MaterialKind, slug: string): boolean {
  load();
  const next = !snapshot[kind].includes(slug);
  setSaved(kind, slug, next);
  return next;
}

/** Save a note. Empty/whitespace deletes it. A non-empty note auto-bookmarks the material (app rule). */
export function saveNote(kind: MaterialKind, slug: string, text: string) {
  load();
  const key = noteKey(kind, slug);
  const notes = { ...snapshot.notes };
  const trimmed = text.trim();
  if (trimmed) notes[key] = text;
  else delete notes[key];
  let next: Snapshot = { ...snapshot, notes };
  if (trimmed && !next[kind].includes(slug)) next = { ...next, [kind]: [slug, ...next[kind]] };
  persist(next);
  for (const l of mutationListeners) l({ type: "note", kind, slug, text: trimmed ? text : "" });
  if (trimmed) for (const l of mutationListeners) l({ type: "saved", kind, slug, saved: true });
}

/** For the library feature's sync layer: replace the whole local state (e.g. after a server merge). */
export function replaceLibrary(next: { research: string[]; idea: string[]; notes: Record<string, string> }) {
  load();
  persist({ research: next.research, idea: next.idea, notes: next.notes });
}

/** For the library feature's sync layer: observe local mutations. */
export function onLibraryChange(fn: (change: LibraryChange) => void): () => void {
  mutationListeners.add(fn);
  return () => mutationListeners.delete(fn);
}
