"use client";

import { useSyncExternalStore } from "react";

// The DS size props aren't responsive (one cva `size` per component), so the
// mobile layout (Figma 2175:23002 — components drop to S, CTA to M) has to be
// resolved at runtime. matchMedia keeps it in sync with the 640px breakpoint.
const QUERY = "(max-width: 639px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
