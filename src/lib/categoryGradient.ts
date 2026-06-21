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
