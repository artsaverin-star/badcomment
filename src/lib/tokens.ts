import { prisma } from "./prisma";
import { UNLOCK_COST, CATEGORY_MIN_PRICE, type UnlockType } from "./tokenConfig";
import { categoryMembers } from "./bundles";

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

export async function getBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } });
  return u?.tokens ?? 0;
}

// All of a user's unlocks, grouped by type, as sets for O(1) access checks.
export async function getUnlockSets(userId: string): Promise<Record<UnlockType, Set<string>>> {
  const rows = await prisma.unlock.findMany({ where: { userId }, select: { type: true, slug: true } });
  const sets: Record<UnlockType, Set<string>> = { app: new Set(), idea: new Set(), category: new Set() };
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
  if (type === "category") {
    const { apps, ideas } = categoryMembers(slug);
    for (const a of apps) rows.push({ userId, type: "app", slug: a, cost: 0 });
    for (const i of ideas) rows.push({ userId, type: "idea", slug: i, cost: 0 });
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
