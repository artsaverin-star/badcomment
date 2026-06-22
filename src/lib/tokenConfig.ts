// Single source of truth for pricing. The product sells ownership directly in
// rubles — no virtual currency. Three SKUs (deck / category / lifetime) plus a
// free card meter. Legacy token-pack types stay only for in-flight YooKassa
// checkouts and the admin money mapping; nothing in the UI offers them anymore.

// Unlock row types in the `Unlock` table (ownership is a set lookup on these).
export type UnlockType = "app" | "idea" | "chapter" | "category" | "ideas" | "apps";

// One-time "everything forever" SKU (User.lifetime).
export const LIFETIME = { rub: 3990, stars: 2000 };

// ── Direct-₽ model ─────────────────────────────────────────────────────────
export const DECK_PRICE_RUB = 290; // unlock the whole best-of deck (top-2 × premium niches) forever
export const CATEGORY_PRICE_RUB = 590; // unlock one full premium category (ideas + chapters + apps)
export const DECK_CREDIT_RUB = DECK_PRICE_RUB; // deck price credits toward a later category/lifetime
export const TOP_PER_CATEGORY = 2; // how many top ideas of each niche go into the deck

// Free card meter (the hook, then the paywall).
export const FREE_ANON_CARDS = 2; // reveals before sign-in (cookie-tracked)
export const FREE_REG_CARDS = 2; // additional reveals after sign-in (real unlocks)

// Non-premium categories aren't sellable yet — they show this status instead.
export const PREGEN_DATE_RU = "субботу, 28 июня";
export const PREGEN_DATE_EN = "Saturday, June 28";

// ── Legacy token packs — kept only for the YooKassa webhook (in-flight pack
// checkouts) and the admin money column. Not offered anywhere in the UI. ──
export type TokenPack = { id: string; tokens: number; rub: number; stars: number; badge?: string };
export const TOKEN_PACKS: TokenPack[] = [
  { id: "s", tokens: 100, rub: 990, stars: 500 },
  { id: "m", tokens: 300, rub: 2490, stars: 1250, badge: "−16%" },
  { id: "l", tokens: 700, rub: 4990, stars: 2500, badge: "−28%" },
];
export function getPack(id: string): TokenPack | null {
  return TOKEN_PACKS.find((p) => p.id === id) ?? null;
}

// Russian genitive for the legacy «энергия» wording (only used in pack descriptions).
export function tokensWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "энергия";
  return "энергии";
}
