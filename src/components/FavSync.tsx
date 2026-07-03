"use client";

import { useEffect } from "react";
import { favSyncWithServer } from "./TestCards";

// Once on load for a signed-in user: merge localStorage bookmarks with the
// server's, so favorites follow the account across devices and cache clears.
export default function FavSync({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (enabled) favSyncWithServer();
  }, [enabled]);
  return null;
}
