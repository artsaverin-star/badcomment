"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/track";
import { parsePublicPath } from "../routing";
import { recordNavigation } from "./navigation";

// Runs on every client route change of the new site:
//  • page views (GA4 send_page_view:false and YM defer:true in the layout → sent here, once
//    per path, 250 ms after the title settles; same as the old PageTracker) + the logged-in
//    activity log POST /api/track. Every event carries site: "v2" (set in the layout snippet).
//  • navigation memory for «Назад» and the per-tab last URL.

export function RouteObserver() {
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? "";
  const path = parsePublicPath(pathname).pathname;

  useEffect(() => {
    recordNavigation(path + (search ? `?${search}` : ""));
  }, [path, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const title = document.title;
        trackPageView(path, title);
        fetch("/api/track", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path, title }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // analytics must never break navigation
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [path]);

  return null;
}
