import { prisma } from "./prisma";
import { UNLOCK_COST, CATEGORY_MIN_PRICE, FREE_REG_CARDS, type UnlockType } from "./tokenConfig";
import { categoryMembers } from "./bundles";
import { listIdeas } from "./ideas";
import { deckIdeaSlugs } from "./deck";
import { ownsDeck } from "./unlocks";

export type UnlockResult =
  | { ok: true; already: boolean; balance: number }
  | { ok: false; reason: "auth" | "funds"; balance: number; needed: number };

// Dynamic category-bundle price: base cost minus the value of the apps/ideas in
// the genre the user already unlocked individually (never pay twice), floored at
// CATEGORY_MIN_PRICE (the bundle still opens the remaining ideas + synthesis).
export async function categoryPrice(userId: string, slug: string): Promise<number> {
  const { apps, ideas } = categoryMembers(slug);
  const sets = await getUnlockSets(userId);
  let credit = 0;
  for (const a of apps) if (sets.app.has(a)) credit += UNLOCK_COST.app;
  for (const i of ideas) if (sets.idea.has(i)) credit += UNLOCK_COST.idea;
  return Math.max(CATEGORY_MIN_PRICE, UNLOCK_COST.category - credit);
}

// Credit tokens (signup grant, pack purchase, comp). Append-only ledger row.
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

// Idempotent signup grant — credits the bonus only if this user has never been
// granted one before. Guards against double-grants from races / repeated logins.
export async function grantSignupOnce(userId: string, amount: number): Promise<void> {
  const existing = await prisma.tokenLedger.findFirst({ where: { userId, reason: "signup" } });
  if (existing) return;
  await grantTokens(userId, amount, "signup");
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

// Spend tokens to unlock an item permanently. Atomic: the balance is decremented
// with a guarded updateMany so two concurrent unlocks can't overspend. A category
// unlock is a bundle — it also writes (cost 0) rows for every app/idea in the
// genre, so later access checks are a plain set lookup.
export async function unlockItem(userId: string, type: UnlockType, slug: string): Promise<UnlockResult> {
  const cost = type === "category" ? await categoryPrice(userId, slug) : UNLOCK_COST[type];

  // Already owned? (free, idempotent)
  const existing = await prisma.unlock.findUnique({
    where: { userId_type_slug: { userId, type, slug } },
  });
  if (existing) return { ok: true, already: true, balance: await getBalance(userId) };

  // Guarded debit: only succeeds while the balance covers the cost.
  const debit = await prisma.user.updateMany({
    where: { id: userId, tokens: { gte: cost } },
    data: { tokens: { decrement: cost } },
  });
  if (debit.count === 0) {
    return { ok: false, reason: "funds", balance: await getBalance(userId), needed: cost };
  }

  const balance = await getBalance(userId);
  await prisma.tokenLedger.create({
    data: { userId, delta: -cost, reason: "unlock", ref: `${type}:${slug}`, balanceAfter: balance },
  });

  // Write the unlock row(s). For a category, fan out to the whole genre.
  const rows: { userId: string; type: string; slug: string; cost: number }[] = [
    { userId, type, slug, cost },
  ];
  // Bundles fan out (cost 0) to the items they open, so later access checks are a
  // plain set lookup. "ideas" → all ideas; "apps" → all teardowns; "category" → both.
  if (type === "category" || type === "ideas") {
    const { ideas } = categoryMembers(slug);
    for (const i of ideas) rows.push({ userId, type: "idea", slug: i, cost: 0 });
  }
  if (type === "category" || type === "apps") {
    const { apps } = categoryMembers(slug);
    for (const a of apps) rows.push({ userId, type: "app", slug: a, cost: 0 });
  }
  // Children may already be owned individually — SQLite createMany has no
  // skipDuplicates, so filter against what's already there.
  const owned = await prisma.unlock.findMany({
    where: { userId },
    select: { type: true, slug: true },
  });
  const have = new Set(owned.map((r) => `${r.type}:${r.slug}`));
  const fresh = rows.filter((r) => !have.has(`${r.type}:${r.slug}`));
  if (fresh.length > 0) await prisma.unlock.createMany({ data: fresh });

  return { ok: true, already: false, balance };
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
  | { ok: true; card: DrawCard; remaining: number }
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
  const fresh = deckPool().filter((i) => !ex.has(i.slug) && !owned.has(i.slug));
  if (fresh.length === 0) return { ok: false, reason: "empty" };

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
