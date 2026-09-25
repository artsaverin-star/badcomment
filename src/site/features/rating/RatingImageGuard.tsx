"use client";

import { useEffect } from "react";

// The safety net for App Store artwork that Apple has moved (spec 11 §3.4 «Broken images»).
// Client; renders nothing. Each rating page mounts it once:  <RatingImageGuard />
//
// Apple's URLs change when an app updates its screenshots (the refresh is out of scope, §12).
// A broken screenshot disappears — its link or slot gets `hidden`; a strip whose every shot is
// gone gets `hidden` too (a row then reflows to one column through :has(), a leader loses its
// stage, the app page its gallery section). A broken icon keeps its box: `src` becomes a 1×1
// transparent GIF, so the soft tile and the ring stay.
// Errors do not bubble, so the listener sits on `document` in the capture phase; images that
// failed before hydration are found by a scan on mount (`complete && naturalWidth === 0`),
// re-checked with a probe request so a lazy image an engine reports as complete before it ever
// loaded is not taken for broken. Lazy images far from the viewport cannot have failed yet.

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const TARGET = "img.ia-rt-shot, img.ia-app-icon";
/** Strips that disappear when all their shots are gone (the gallery takes its section along). */
const STRIP = ".ia-rt-shots, .ia-rt-stage, .ia-rt-gallery";

function repair(img: HTMLImageElement): void {
  if (img.classList.contains("ia-app-icon")) {
    if (img.src !== BLANK) img.src = BLANK;
    return;
  }
  // A shot in its own link (stage, gallery) hides the link; a row strip's shot hides itself.
  const slot = img.parentElement?.matches(".ia-rt-stage__shot, .ia-rt-gallery__shot") ? img.parentElement : img;
  slot.hidden = true;
  const strip = img.closest<HTMLElement>(STRIP);
  if (!strip) return;
  const left = [...strip.querySelectorAll<HTMLImageElement>("img.ia-rt-shot")].some((i) => !i.hidden && !i.closest("[hidden]"));
  if (left) return;
  strip.hidden = true;
  if (strip.classList.contains("ia-rt-gallery")) {
    const section = strip.closest<HTMLElement>("#screenshots");
    if (section) section.hidden = true;
  }
}

function nearViewport(img: HTMLImageElement): boolean {
  const r = img.getBoundingClientRect();
  const h = window.innerHeight;
  return r.bottom > -h && r.top < 2 * h;
}

export function RatingImageGuard() {
  useEffect(() => {
    const onError = (e: Event) => {
      const img = e.target;
      if (img instanceof HTMLImageElement && img.matches(TARGET) && img.src !== BLANK) repair(img);
    };
    document.addEventListener("error", onError, true);
    for (const img of document.querySelectorAll<HTMLImageElement>(TARGET)) {
      if (!img.complete || img.naturalWidth !== 0 || img.src === BLANK) continue;
      if (img.loading === "lazy" && !nearViewport(img)) continue;
      const probe = new Image();
      probe.onerror = () => {
        if (img.isConnected && img.naturalWidth === 0) repair(img);
      };
      probe.src = img.currentSrc || img.src;
    }
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
