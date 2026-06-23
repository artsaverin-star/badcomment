import { prisma } from "./prisma";
import { FREE_REG_CARDS, type UnlockType } from "./tokenConfig";
import { listIdeas } from "./ideas";
import { deckIdeaSlugs } from "./deck";
import { ownsDeck } from "./unlocks";

// Credit tokens — legacy pack purchases via the YooKassa webhook. Append-only.
export async function grantTokens(
  userId: string,
  amount: number,
  reason: string,
  ref?: string,
): Promise<number> {
  if (amount <= 0) return getBalance(userId);
  const u = await prisma.user.update({
    where: { id: userId },
    data: { tokens: { increment: amount } },
  });
  await prisma.tokenLedger.create({
    data: { userId, delta: amount, reason, ref: ref ?? null, balanceAfter: u.tokens },
  });
  return u.tokens;
}

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });
  return u?.tokens ?? 0;
}

// All of a user's unlocks, grouped by type, as sets for O(1) access checks.
export async function getUnlockSets(userId: string): Promise<Record<UnlockType, Set<string>>> {
  const rows = await prisma.unlock.findMany({ where: { userId }, select: { type: true, slug: true } });
  const sets: Record<UnlockType, Set<string>> = { app: new Set(), idea: new Set(), chapter: new Set(), category: new Set(), ideas: new Set(), apps: new Set() };
  for (const r of rows) sets[r.type as UnlockType]?.add(r.slug);
  return sets;
}

// ── «Колода идей»: draw a random top idea ──────────────────────────────────
export type DrawCard = {
  slug: string;
  title: string;
  oneLiner: string;
  gap: string;
  pitch: string;
  features: string[];
  monetization: string;
  demand: number;
  category: string;
  categoryName: string;
};
export type DrawResult =
  | { ok: true; card: DrawCard; remaining: number; replay?: boolean }
  | { ok: false; reason: "paywall" | "empty" };

function toCard(i: ReturnType<typeof listIdeas>[number]): DrawCard {
  return {
    slug: i.slug,
    title: i.title,
    oneLiner: i.oneLiner,
    gap: i.gap,
    pitch: i.idea?.pitch ?? "",
    features: i.idea?.features ?? [],
    monetization: i.idea?.monetization ?? "",
    demand: i.stats?.observations ?? 0,
    category: i.category,
    categoryName: i.categoryName,
  };
}

// The deck pool = the curated best-of (top-N ideas per premium niche), in ranking
// order. This is exactly the set the 290₽ deck unlocks and the free meter samples.
function deckPool(): ReturnType<typeof listIdeas> {
  const bySlug = new Map(listIdeas().map((i) => [i.slug, i]));
  const out: ReturnType<typeof listIdeas> = [];
  for (const s of deckIdeaSlugs()) {
    const i = bySlug.get(s);
    if (i) out.push(i);
  }
  return out;
}

// A free peek for logged-out visitors — a random deck card with the full breakdown
// (the generous hook). The route caps how many a guest may take before sign-in.
export function peekIdea(exclude: string[] = []): DrawCard | null {
  const ex = new Set(exclude);
  const fresh = deckPool().filter((i) => !ex.has(i.slug));
  if (fresh.length === 0) return null;
  return toCard(fresh[Math.floor(Math.random() * fresh.length)]);
}

// Reveal a deck card and grant ownership of that idea (free). Free logged-in users
// get FREE_REG_CARDS reveals, then hit the paywall (buy the deck). Deck owners and
// unlimited users (admin/lifetime/friend) reveal freely.
export async function drawIdea(userId: string, unlimited: boolean, exclude: string[] = []): Promise<DrawResult> {
  const ex = new Set(exclude);
  const owned = (await getUnlockSets(userId)).idea;
  const pool = deckPool();
  const fresh = pool.filter((i) => !ex.has(i.slug) && !owned.has(i.slug));
  if (fresh.length === 0) {
    // Deck exhausted (owns/seen all) — let them keep flipping for fun. No new
    // ownership or ledger row; the client just shows the card, doesn't collect it.
    if (pool.length === 0) return { ok: false, reason: "empty" };
    const notSeen = pool.filter((i) => !ex.has(i.slug));
    const src = notSeen.length ? notSeen : pool;
    return { ok: true, card: toCard(src[Math.floor(Math.random() * src.length)]), remaining: 0, replay: true };
  }

  if (!unlimited && !(await ownsDeck(userId))) {
    const usedFree = await prisma.tokenLedger.count({ where: { userId, reason: "draw" } });
    if (usedFree >= FREE_REG_CARDS) return { ok: false, reason: "paywall" };
  }

  const pick = fresh[Math.floor(Math.random() * fresh.length)];
  await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: "draw", ref: `draw:${pick.slug}`, balanceAfter: 0 } });
  const existing = await prisma.unlock.findUnique({ where: { userId_type_slug: { userId, type: "idea", slug: pick.slug } } });
  if (!existing) await prisma.unlock.create({ data: { userId, type: "idea", slug: pick.slug, cost: 0 } });

  return { ok: true, card: toCard(pick), remaining: fresh.length - 1 };
}

// The cards a user has already drawn (newest first) — to restore their collection
// when they return to /cards. Reconstructed from the "draw" ledger refs.
export async function drawnCards(userId: string): Promise<DrawCard[]> {
  const rows = await prisma.tokenLedger.findMany({
    where: { userId, reason: "draw" },
    orderBy: { id: "desc" },
    select: { ref: true },
  });
  const bySlug = new Map(listIdeas().map((i) => [i.slug, i]));
  const out: DrawCard[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    const slug = (r.ref || "").replace(/^draw:/, "");
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const idea = bySlug.get(slug);
    if (idea) out.push(toCard(idea));
  }
  return out;
}
