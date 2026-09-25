// View state of the rating lists that survives Back/Forward. In the app the query and the sort
// are @State on views that stay on the NavigationStack (ClarityRatings.swift:69, 156-159), so
// popping back from an app restores the exact list. The web keeps both in the URL (?q=, ?sort=;
// shareable, like the ideas catalogue; the canonical stays the bare path). On a Back/Forward
// traversal Next renders the page from its cached payload, so the components read the URL
// through useSearchParams (the current URL, not the payload's). Client-only helpers.

type EntryState = Record<string, unknown>;

/** Next's own keys in history.state: its patched replaceState copies them back itself. */
const NEXT_KEYS = new Set(["__NA", "__PRIVATE_NEXTJS_INTERNALS_TREE"]);

/**
 * The entry's own (non-Next) state. Passing Next's keys to replaceState would make its patch
 * skip the router update for a new URL (usePathname/useSearchParams would keep the old one).
 */
function ownEntryState(): EntryState {
  const state = window.history.state as EntryState | null;
  const own: EntryState = {};
  if (state && typeof state === "object") {
    for (const [key, value] of Object.entries(state)) if (!NEXT_KEYS.has(key)) own[key] = value;
  }
  return own;
}

/** Replace the current entry's URL (same entry, own state kept). No-op when it is already there. */
export function replaceUrl(url: string): void {
  if (url === window.location.pathname + window.location.search) return;
  try {
    window.history.replaceState(ownEntryState(), "", url);
  } catch {
    // history can be locked down in sandboxed frames; the state then lives only on screen
  }
}
