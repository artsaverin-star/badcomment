"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useViewer } from "../../shell/ViewerContext";
import {
  applyOps,
  EMPTY_LIBRARY,
  MAX_OPS,
  opKey,
  sameLibrary,
  type LibraryPayload,
  type LibraryState,
  type SyncOp,
} from "./protocol";
import { getLibrary, onLibraryChange, replaceLibrary } from "./store";

// Account sync of «Сохранённое» + notes (DECISIONS §11, ARCHITECTURE §4, spec 09 §2.5).
//
// Guests: nothing leaves the browser (localStorage ia2:*, the app's "on this device").
// Signed in:
//   1. GET /api/site/library. If this browser's library belongs to nobody yet (guest data),
//      union it into the account once — POST /api/site/library/merge — and remember the
//      owner (ia2:sync.owner) and the flag ia2:merged:<userId>. If it already mirrors this
//      account, take the account copy. Then lay pending local changes on top and
//      replaceLibrary() the result.
//   2. Every local mutation (onLibraryChange) goes to a persisted, coalesced outbox
//      (ia2:sync.outbox) and is pushed with POST /api/site/library (debounced; retried with
//      backoff; on "online"; best effort on page hide).
//   3. Coming back to a tab after a minute re-pulls the account copy (other devices).
// Sign-out: the first guest render after it clears this browser's copy of the account
// library (it lives in the account), so the next person on a shared computer starts empty.
//
// One engine per document. Start it with <LibrarySync /> (mounted once, e.g. in the root
// layout) or useLibrarySync(); BookmarkButton, NoteSheet and the Saved screen call the hook
// themselves, so every surface that can change the library also starts the sync.

const OWNER_KEY = "ia2:sync.owner";
const OUTBOX_KEY = "ia2:sync.outbox";
const mergedFlag = (userId: string) => `ia2:merged:${userId}`;

const PUSH_DEBOUNCE_MS = 600;
const PULL_AFTER_HIDDEN_MS = 60_000;
const KEEPALIVE_MAX_BYTES = 60_000;

export type LibrarySyncStatus = "off" | "guest" | "syncing" | "synced" | "error";
type SyncView = { status: LibrarySyncStatus; ready: boolean };

type OutboxEntry = { id: string; op: SyncOp };
type Outbox = { user: string | null; ops: OutboxEntry[] };

// ---------------------------------------------------------------------------
// Status store (for the UI)

let view: SyncView = { status: "off", ready: false };
const viewListeners = new Set<() => void>();

function setView(next: Partial<SyncView>) {
  const merged = { ...view, ...next };
  if (merged.status === view.status && merged.ready === view.ready) return;
  view = merged;
  for (const l of viewListeners) l();
}

const OFF_VIEW: SyncView = { status: "off", ready: false };

/** {status, ready}: ready = the signed-in library has been pulled/merged at least once. */
export function useLibrarySyncState(): SyncView {
  return useSyncExternalStore(
    (fn) => {
      viewListeners.add(fn);
      return () => viewListeners.delete(fn);
    },
    () => view,
    () => OFF_VIEW,
  );
}

// ---------------------------------------------------------------------------
// localStorage helpers (never throw)

function lsGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function lsSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // private mode / quota: the in-memory state still works for this page
  }
}
function lsRemove(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function readOutbox(): Outbox {
  try {
    const raw = lsGet(OUTBOX_KEY);
    const v = raw ? (JSON.parse(raw) as Outbox) : null;
    if (v && Array.isArray(v.ops)) return { user: typeof v.user === "string" ? v.user : null, ops: v.ops };
  } catch {
    // fall through
  }
  return { user: null, ops: [] };
}

function writeOutbox(box: Outbox) {
  if (box.ops.length === 0) lsRemove(OUTBOX_KEY);
  else lsSet(OUTBOX_KEY, JSON.stringify(box));
}

let seq = 0;
const newId = () => `${Date.now().toString(36)}-${(seq++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** Only the last change per material and type matters; it moves to the end (keeps batch order). */
function coalesce(box: Outbox, op: SyncOp): Outbox {
  const key = opKey(op);
  return { user: box.user, ops: [...box.ops.filter((e) => opKey(e.op) !== key), { id: newId(), op }] };
}

// ---------------------------------------------------------------------------
// Engine (module singleton)

let mode: "off" | "guest" | "user" = "off";
let generation = 0;
let userId: string | null = null;
let ready = false;
/** Changes made while signed in but before the account copy arrived. */
let pending: SyncOp[] = [];
let failures = 0;
let inFlight = false;
let lastPullAt = 0;
let hiddenAt = 0;
let unsubscribeChanges: (() => void) | null = null;
let flushTimer: number | undefined;
let retryTimer: number | undefined;
let windowListeners = false;

const backoff = (n: number) => Math.min(30_000, 1_000 * 2 ** Math.max(0, n - 1)) + Math.floor(Math.random() * 400);

function clearTimers() {
  window.clearTimeout(flushTimer);
  window.clearTimeout(retryTimer);
  flushTimer = retryTimer = undefined;
}

function serverState(p: LibraryPayload): LibraryState {
  return {
    research: Array.isArray(p.research) ? p.research : [],
    idea: Array.isArray(p.idea) ? p.idea : [],
    notes: p.notes && typeof p.notes === "object" ? p.notes : {},
  };
}

async function requestJSON<T>(url: string, init?: RequestInit): Promise<{ status: number; data: T | null }> {
  const res = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  const data = res.ok ? ((await res.json()) as T) : null;
  return { status: res.status, data };
}

/** Start (or switch) the engine for the viewer's state. Idempotent. */
export function startLibrarySync(loggedIn: boolean): void {
  if (typeof window === "undefined") return;
  installWindowListeners();
  if (loggedIn ? mode === "user" : mode === "guest") return;

  generation++;
  clearTimers();
  unsubscribeChanges?.();
  unsubscribeChanges = null;
  ready = false;
  failures = 0;
  pending = [];
  userId = null;

  if (!loggedIn) {
    mode = "guest";
    // Signed out since the last visit: this browser held a copy of an account's library.
    if (lsGet(OWNER_KEY) !== null) {
      replaceLibrary(EMPTY_LIBRARY);
      lsRemove(OWNER_KEY);
    }
    setView({ status: "guest", ready: false });
    return;
  }

  mode = "user";
  setView({ status: "syncing", ready: false });
  unsubscribeChanges = onLibraryChange(record);
  void initialSync(generation);
}

function record(change: SyncOp) {
  if (mode !== "user") return;
  if (!ready || !userId) {
    pending.push(change);
    return;
  }
  const box = readOutbox();
  writeOutbox(coalesce(box.user === userId ? box : { user: userId, ops: [] }, change));
  if (view.status !== "error") setView({ status: "syncing" });
  scheduleFlush(PUSH_DEBOUNCE_MS);
}

async function initialSync(gen: number): Promise<void> {
  try {
    const got = await requestJSON<LibraryPayload>("/api/site/library");
    if (gen !== generation) return;
    if (got.status === 401) {
      // The session ended between the page render and now: behave as a guest, keep data.
      mode = "off";
      unsubscribeChanges?.();
      unsubscribeChanges = null;
      setView({ status: "guest", ready: false });
      return;
    }
    if (!got.data) throw new Error(`library ${got.status}`);
    const uid = got.data.user;
    const owner = lsGet(OWNER_KEY);
    let base = serverState(got.data);

    if (owner === null) {
      // Guest data in this browser → union it into the account, once.
      const local = getLibrary();
      const hasLocal = local.research.length > 0 || local.idea.length > 0 || Object.keys(local.notes).length > 0;
      if (hasLocal) {
        const before = pending.length; // already part of `local`
        const merged = await requestJSON<LibraryPayload>("/api/site/library/merge", {
          method: "POST",
          body: JSON.stringify(local),
        });
        if (gen !== generation) return;
        if (!merged.data) throw new Error(`merge ${merged.status}`);
        base = serverState(merged.data);
        pending = pending.slice(before);
      }
      lsSet(mergedFlag(uid), new Date().toISOString());
    }
    // owner === uid → the account copy is the truth; owner = someone else → drop their copy.

    userId = uid;
    lsSet(OWNER_KEY, uid);
    let box = readOutbox();
    if (box.user !== uid) box = { user: uid, ops: [] };
    for (const op of pending) box = coalesce(box, op);
    pending = [];
    writeOutbox(box);

    const next = applyOps(base, box.ops.map((e) => e.op));
    if (!sameLibrary(next, getLibrary())) replaceLibrary(next);
    ready = true;
    failures = 0;
    lastPullAt = Date.now();
    setView({ status: box.ops.length ? "syncing" : "synced", ready: true });
    if (box.ops.length) scheduleFlush(0);
  } catch {
    if (gen !== generation) return;
    failures++;
    setView({ status: failures >= 2 ? "error" : "syncing" });
    retryTimer = window.setTimeout(() => void initialSync(gen), backoff(failures));
  }
}

function scheduleFlush(delay: number) {
  window.clearTimeout(flushTimer);
  flushTimer = window.setTimeout(() => void flush(), delay);
}

async function flush(): Promise<void> {
  if (mode !== "user" || !ready || !userId || inFlight) return;
  const locks = (navigator as Navigator & { locks?: LockManager }).locks;
  if (locks) await locks.request("ia2-library-sync", () => flushOnce());
  else await flushOnce();
}

async function flushOnce(): Promise<void> {
  const gen = generation;
  const uid = userId;
  const box = readOutbox();
  if (!uid || box.user !== uid || box.ops.length === 0) {
    if (view.status === "syncing") setView({ status: "synced" });
    return;
  }
  const batch = box.ops.slice(0, MAX_OPS);
  inFlight = true;
  try {
    const res = await fetch("/api/site/library", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ops: batch.map((e) => e.op) }),
    });
    if (gen !== generation) return;
    if (res.status === 401) {
      // Signed out elsewhere: stop pushing; the outbox stays for this account's next sign-in.
      mode = "off";
      setView({ status: "guest", ready: false });
      return;
    }
    // 400/413: this batch can never succeed — drop it rather than jam the queue.
    if (!res.ok && res.status !== 400 && res.status !== 413) throw new Error(`push ${res.status}`);
    const sent = new Set(batch.map((e) => e.id));
    const now = readOutbox();
    const rest = now.user === uid ? now.ops.filter((e) => !sent.has(e.id)) : [];
    writeOutbox({ user: uid, ops: rest });
    failures = 0;
    setView({ status: rest.length ? "syncing" : "synced" });
    if (rest.length) scheduleFlush(0);
  } catch {
    if (gen !== generation) return;
    failures++;
    setView({ status: failures >= 3 ? "error" : "syncing" });
    retryTimer = window.setTimeout(() => void flush(), backoff(failures));
  } finally {
    inFlight = false;
  }
}

/** Re-pull the account copy (changes from other devices), keeping unsent local changes on top. */
async function pull(): Promise<void> {
  if (mode !== "user" || !ready || !userId) return;
  const gen = generation;
  try {
    const got = await requestJSON<LibraryPayload>("/api/site/library");
    if (gen !== generation || !got.data || got.data.user !== userId) return;
    const box = readOutbox();
    const next = applyOps(serverState(got.data), box.user === userId ? box.ops.map((e) => e.op) : []);
    if (!sameLibrary(next, getLibrary())) replaceLibrary(next);
    lastPullAt = Date.now();
  } catch {
    // next visibility change tries again
  }
}

/** Best effort on page hide: push what is queued without waiting (the queue is kept). */
function flushOnHide() {
  if (mode !== "user" || !ready || !userId) return;
  const box = readOutbox();
  if (box.user !== userId || box.ops.length === 0) return;
  const body = JSON.stringify({ ops: box.ops.slice(0, MAX_OPS).map((e) => e.op) });
  if (body.length > KEEPALIVE_MAX_BYTES) return;
  try {
    void fetch("/api/site/library", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // ignore
  }
}

function installWindowListeners() {
  if (windowListeners) return;
  windowListeners = true;
  window.addEventListener("online", () => {
    if (mode !== "user") return;
    if (!ready) {
      window.clearTimeout(retryTimer);
      void initialSync(generation);
    } else scheduleFlush(0);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      flushOnHide();
    } else if (hiddenAt && Date.now() - hiddenAt >= PULL_AFTER_HIDDEN_MS && Date.now() - lastPullAt >= PULL_AFTER_HIDDEN_MS) {
      void pull();
    }
  });
  window.addEventListener("pagehide", flushOnHide);
}

// ---------------------------------------------------------------------------
// React entry points

/** Starts (or switches) the sync engine for the signed-in state of the page. */
export function useLibrarySync(): void {
  const { loggedIn } = useViewer();
  useEffect(() => {
    startLibrarySync(loggedIn);
  }, [loggedIn]);
}

/**
 * Mount once per page tree (e.g. in the new root layout, inside the shell's ViewerContext):
 * keeps the browser library in sync with the account while signed in. Renders nothing.
 */
export function LibrarySync(): null {
  useLibrarySync();
  return null;
}
