import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Admin-only: a user's token ledger (grants, purchases, unlocks) for the
// history popup on /admin.
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me?.isAdmin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const [user, ledger, unlocks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { tokens: true } }),
    prisma.tokenLedger.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 300 }),
    prisma.unlock.count({ where: { userId, cost: { gt: 0 } } }),
  ]);

  return NextResponse.json({ balance: user?.tokens ?? 0, paidUnlocks: unlocks, ledger });
}
