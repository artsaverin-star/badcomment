"use client";

import { useEffect } from "react";

// A third-party script loaded right after hydration — the timing of next/script
// `afterInteractive`, but WITHOUT the <link rel="preload" as="script"> that next/script emits at
// the top of <head> (performance review P1): the analytics library no longer competes with
// the CSS, the fonts and the LCP image for the first bytes. Dynamically inserted async
// scripts are fetched at low priority. Added once per document (the root layout persists
// across client navigations; the id guards a re-mount).

export function DeferredScript({ id, src }: { id: string; src: string }) {
  useEffect(() => {
    if (document.getElementById(id)) return;
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    document.body.appendChild(script);
  }, [id, src]);
  return null;
}
