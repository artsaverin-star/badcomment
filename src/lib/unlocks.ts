import { prisma } from "./prisma";
import { categoryMembers } from "./bundles";
import { deckIdeaSlugs } from "./deck";

export type BuyKind = "deck" | "category" | "lifetime";

// Reason tags for paid unlocks — the admin money column maps these back to ₽.
const REASON: Record<BuyKind, string> = {
  deck: "buy_deck",
  category: "buy_category",
  lifetime: "lifetime",
};

// Does the user already own the deck? (the 26 top cards, marked by a "deck" row).
export async function ownsDeck(userId: string): Promise<boolean> {
  const row = await prisma.unlock.findFirst({ where: { userId, type: "deck" } });
  return !!row;
}

// Grant ownership from a SUCCESSFUL ₽ purchase. Writes Unlock rows directly — no
// energy. Idempotent: the payment ref guards against webhook re-delivery (a ledger
// row tagged with that ref means we've already credited this payment). `amountRub`
// is the real charged ₽ (from YooKassa) — the source of truth for revenue reports.
export async function grantUnlock(userId: string, kind: BuyKind, slug: string | null, ref: string, amountRub: number): Promise<void> {
  const already = await prisma.tokenLedger.findFirst({ where: { ref } });
  if (already) return;

  if (kind === "lifetime") {
    await prisma.user.update({ where: { id: userId }, data: { lifetime: true } });
    await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: REASON.lifetime, ref, balanceAfter: 0, amountRub } });
    return;
  }

  const rows: { userId: string; type: string; slug: string; cost: number }[] = [];
  if (kind === "deck") {
    rows.push({ userId, type: "deck", slug: "all", cost: 0 });
    for (const s of deckIdeaSlugs()) rows.push({ userId, type: "idea", slug: s, cost: 0 });
  } else if (kind === "category" && slug) {
    rows.push({ userId, type: "category", slug, cost: 0 });
    const { apps, ideas } = categoryMembers(slug);
    for (const i of ideas) rows.push({ userId, type: "idea", slug: i, cost: 0 });
    for (const a of apps) rows.push({ userId, type: "app", slug: a, cost: 0 });
  }

  // SQLite createMany has no skipDuplicates — filter against what's already owned.
  const owned = await prisma.unlock.findMany({ where: { userId }, select: { type: true, slug: true } });
  const have = new Set(owned.map((r) => `${r.type}:${r.slug}`));
  const fresh = rows.filter((r) => !have.has(`${r.type}:${r.slug}`));
  if (fresh.length) await prisma.unlock.createMany({ data: fresh });

  await prisma.tokenLedger.create({ data: { userId, delta: 0, reason: REASON[kind], ref, balanceAfter: 0 } });
}
