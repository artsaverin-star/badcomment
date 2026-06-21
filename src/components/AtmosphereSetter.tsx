"use client";

import { useEffect } from "react";

// Sets the page's atmosphere hue on <html> so the single layout-level .atmosphere
// glow (and heading glow-sweep) take the page's colour. The home page rolls a
// fresh random hue each mount; category pages pass their deterministic hue.
export default function AtmosphereSetter({ hue, random }: { hue?: number; random?: boolean }) {
  useEffect(() => {
    const h = random ? Math.floor(Math.random() * 360) : (hue ?? 28);
    const el = document.documentElement;
    el.style.setProperty("--atmo-h", String(h));
    el.style.setProperty("--glow-c", `hsl(${h} 85% 62%)`);
  }, [hue, random]);
  return null;
}
