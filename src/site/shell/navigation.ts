// Client-side navigation memory of the shell.
//
// 1. In-app depth: every history entry of the new site carries `iaDepth` in history.state
//    (0 = the entry this document was opened on, +1 per client navigation that pushed an
//    entry). «Назад» uses history.back() only when the current entry's depth is > 0, i.e. the
//    previous entry is one of our pages (spec 01 §1.3); otherwise it links to the section
//    root. Stored in the entry itself, so Back/Forward and reloads keep it right.
// 2. Last URL per tab (spec 09 §2.5 `ia2:tabs`, sessionStorage): each tab keeps its own
//    "stack", so switching tabs restores where the reader was (spec 05 §3.6 I).

import { parsePublicPath, tabOf, type Tab } from "../routing";

type EntryState = { iaDepth?: number } & Record<string, unknown>;

let lastDepth = 0;
let lastLength = -1;

function entryState(): EntryState {
  const s = window.history.state as EntryState | null;
  return s && typeof s === "object" ? s : {};
}

/** Called by the shell after every client route change (public path + query). */
export function recordNavigation(pathWithQuery: string): void {
  if (typeof window === "undefined") return;
  const state = entryState();
  let depth = typeof state.iaDepth === "number" ? state.iaDepth : null;
  if (depth === null) {
    if (lastLength === -1) depth = 0; // the entry this document was opened on
    else if (window.history.length > lastLength) depth = lastDepth + 1; // pushed
    else depth = lastDepth; // replaced (e.g. ?q= updates)
    try {
      window.history.replaceState({ ...state, iaDepth: depth }, "");
    } catch {
      // history can be locked down in sandboxed frames; «Назад» then links to the root
    }
  }
  lastDepth = depth;
  lastLength = window.history.length;
  rememberTabLocation(pathWithQuery);
}

/** True when history.back() stays inside the new site. */
export function canGoBackInApp(): boolean {
  if (typeof window === "undefined") return false;
  return (entryState().iaDepth ?? 0) > 0;
}

const TABS_KEY = "ia2:tabs";

type TabMemory = Partial<Record<Tab, string>>;

function readTabs(): TabMemory {
  try {
    const raw = window.sessionStorage.getItem(TABS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === "object" ? (v as TabMemory) : {};
  } catch {
    return {};
  }
}

const TABS_EVENT = "ia:tabs";

function rememberTabLocation(pathWithQuery: string): void {
  if (typeof window === "undefined") return;
  const pathname = pathWithQuery.split(/[?#]/)[0];
  const tab = tabOf(pathname);
  if (!tab) return;
  try {
    const tabs = readTabs();
    if (tabs[tab] === pathWithQuery) return;
    tabs[tab] = pathWithQuery;
    window.sessionStorage.setItem(TABS_KEY, JSON.stringify(tabs));
    window.dispatchEvent(new Event(TABS_EVENT));
  } catch {
    // storage can be unavailable (private mode); tabs then simply open at their roots
  }
}

/** useSyncExternalStore subscription for the per-tab memory. */
export function subscribeTabMemory(onChange: () => void): () => void {
  window.addEventListener(TABS_EVENT, onChange);
  return () => window.removeEventListener(TABS_EVENT, onChange);
}

/** The remembered URL of a tab in the current locale, or null. */
export function rememberedTabLocation(tab: Tab, locale: string): string | null {
  if (typeof window === "undefined") return null;
  const v = readTabs()[tab];
  if (!v) return null;
  const { locale: l } = parsePublicPath(v.split(/[?#]/)[0]);
  return l === locale && tabOf(v.split(/[?#]/)[0]) === tab ? v : null;
}
