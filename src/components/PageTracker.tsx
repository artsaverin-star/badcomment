"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Logs each page the user opens (logged-in only, enforced server-side) for the
// admin activity history. Fires on every route change; uses keepalive so the
// request survives the navigation that triggered it.
export default function PageTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const t = setTimeout(() => {
      try {
        fetch("/api/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: pathname, title: typeof document !== "undefined" ? document.title : null }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
