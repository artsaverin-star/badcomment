// A deterministic, distinct brand gradient per category — derived from the slug,
// so every niche gets its own colour identity (same slug → same gradient always).

function hueFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

// A vivid 135° gradient (for accents, bars, chips).
export function categoryGradient(slug: string): string {
  const h = hueFromSlug(slug);
  return `linear-gradient(135deg, hsl(${h} 88% 62%), hsl(${(h + 48) % 360} 84% 56%))`;
}

// A soft corner glow to tint a card/hero without overpowering the dark surface.
export function categoryGlow(slug: string, strength = 0.16): string {
  const h = hueFromSlug(slug);
  return `radial-gradient(130% 120% at 100% 0%, hsl(${h} 85% 60% / ${strength}), transparent 58%)`;
}

// The dominant accent colour for a category (text/ring highlights).
export function categoryAccent(slug: string): string {
  return `hsl(${hueFromSlug(slug)} 85% 62%)`;
}

// Full-page atmosphere — ONE rich single-hue glow that blooms from the top and
// melts into a same-hue near-black, à la oryzo.ai. Layered for a smooth, "deep"
// falloff (not a flat tint). Painted on a fixed full-bleed layer (dark theme only).
function atmosphere(h: number): string {
  return [
    `radial-gradient(56% 48% at 50% -6%, hsl(${h} 74% 53% / 0.42), hsl(${h} 64% 42% / 0.20) 34%, transparent 60%)`,
    `radial-gradient(135% 95% at 50% -32%, hsl(${h} 58% 32% / 0.30), transparent 72%)`,
    `radial-gradient(120% 120% at 50% 65%, hsl(${h} 48% 9% / 0.6), transparent 80%)`,
  ].join(", ");
}

export function categoryAtmosphere(slug: string): string {
  return atmosphere(hueFromSlug(slug));
}

// Non-category pages (home, etc.) use the inApp brand-orange hue.
export function brandAtmosphere(): string {
  return atmosphere(28);
}
