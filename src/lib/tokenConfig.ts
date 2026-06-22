// Single source of truth for the token economy. Tweak numbers here only.
//
// Model: pay-per-unlock with a wallet. New users get a small free grant; each
// piece of content costs tokens to reveal (permanently). Tokens are sold in
// packs (₽ via YooKassa, ⭐ via the Telegram bot). A category unlock is a bundle
// that opens the whole genre (synthesis + every app + every idea in it).

export const SIGNUP_GRANT = 100;

// Per-item types (app/idea/chapter) + bundles. "ideas" opens ALL ideas in a
// category at once; "apps" opens ALL app teardowns; "category" opens everything.
export type UnlockType = "app" | "idea" | "chapter" | "category" | "ideas" | "apps";

export const UNLOCK_COST: Record<UnlockType, number> = {
  app: 5,
  idea: 10,
  chapter: 20,
  category: 50,
  ideas: 25, // all ideas in a category, sold as one pack
  apps: 25, // all app teardowns in a category, sold as one pack
};

// A category bundle is priced dynamically: its base cost minus the value of the
// apps/ideas in it the viewer already owns (so you never pay twice), floored at
// CATEGORY_MIN — because the bundle still opens the remaining ideas + synthesis.
export const CATEGORY_MIN_PRICE = 10;

export type TokenPack = {
  id: string;
  tokens: number;
  rub: number; // YooKassa price
  stars: number; // Telegram Stars price
  badge?: string; // marketing label (e.g. discount)
};

// RU-affordable ladder, increasing discount with size. Base: 100 tokens = 990₽
// (9.9₽/token); bigger packs drop the per-token price.
export const TOKEN_PACKS: TokenPack[] = [
  { id: "s", tokens: 100, rub: 990, stars: 500 },
  { id: "m", tokens: 300, rub: 2490, stars: 1250, badge: "−16%" },
  { id: "l", tokens: 700, rub: 4990, stars: 2500, badge: "−28%" },
];

// One-time "everything forever" SKU: unlocks all apps, ideas and categories
// permanently (User.lifetime). Founding / beta price — the cheap, urgent headline
// offer; goes up to LIFETIME_REGULAR after the beta.
export const LIFETIME = { rub: 2990, stars: 1500 };
export const LIFETIME_REGULAR = 9990; // struck "after beta" anchor

export function getPack(id: string): TokenPack | null {
  return TOKEN_PACKS.find((p) => p.id === id) ?? null;
}

// «Энергия» as a game-style resource: 1 энергия, остальное — «энергии»
// (mass-noun genitive: «90 энергии», «−10 энергии»).
export function tokensWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "энергия";
  return "энергии";
}
