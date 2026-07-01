"use client";

import { useEffect } from "react";

// Cool, clean hues for the random atmosphere — cyan→blue→violet→magenta.
// Warm red/orange and the green/olive/yellow band are skipped: on the dark
// surface they turn muddy brown, which reads as dirty.
const NICE_HUES = [196, 212, 230, 248, 266, 286, 308, 326];

// Sets the page's atmosphere hue on <html> so the single layout-level .atmosphere
// glow (and heading glow-sweep) take the page's colour. The home page rolls a
// fresh random hue each mount; category pages pass their deterministic hue.
export default function AtmosphereSetter({ hue, random }: { hue?: number; random?: boolean }) {
  useEffect(() => {
    const h = random ? NICE_HUES[Math.floor(Math.random() * NICE_HUES.length)] : (hue ?? 230);
    const el = document.documentElement;
    el.style.setProperty("--atmo-h", String(h));
    el.style.setProperty("--glow-c", `hsl(${h} 85% 62%)`);
  }, [hue, random]);
  return null;
}
