"use client";

import { useEffect } from "react";

// Curated, brand-pleasant hues for the random atmosphere — warm (red→orange) and
// cool (cyan→blue→violet→magenta), skipping the green/olive/yellow band (~50–180)
// that reads muddy on the dark surface.
const NICE_HUES = [4, 16, 28, 196, 212, 230, 248, 266, 286, 308, 326, 342];

// Sets the page's atmosphere hue on <html> so the single layout-level .atmosphere
// glow (and heading glow-sweep) take the page's colour. The home page rolls a
// fresh random hue each mount; category pages pass their deterministic hue.
export default function AtmosphereSetter({ hue, random }: { hue?: number; random?: boolean }) {
  useEffect(() => {
    const h = random ? NICE_HUES[Math.floor(Math.random() * NICE_HUES.length)] : (hue ?? 28);
    const el = document.documentElement;
    el.style.setProperty("--atmo-h", String(h));
    el.style.setProperty("--glow-c", `hsl(${h} 85% 62%)`);
  }, [hue, random]);
  return null;
}
