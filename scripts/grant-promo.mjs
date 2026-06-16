// One-off promo grant: credit every registered user with energy so they can
// open both live categories (sobriety + period-cycle = 2 × 50 bundle = 100) with
// a buffer. Idempotent — each user gets the grant at most once (guarded by a
// unique TokenLedger ref), so re-running is safe.
//
// Run ON THE PROD BOX with the prod DB:
//   DATABASE_URL="file:/opt/badcomment/data/prod.db" node scripts/grant-promo.mjs 150
import { PrismaClient } from "@prisma/client";

const AMOUNT = Number(process.argv[2] || 150);
const REF = process.argv[3] || "promo:newgen-2026-06"; // bump to grant again later
const prisma = new PrismaClient();

const users = await prisma.user.findMany({ select: { id: true, tokens: true } });
let granted = 0, skipped = 0;
for (const u of users) {
  const had = await prisma.tokenLedger.findFirst({ where: { userId: u.id, ref: REF } });
  if (had) { skipped++; continue; }
  const after = (u.tokens ?? 0) + AMOUNT;
  await prisma.$transaction([
    prisma.user.update({ where: { id: u.id }, data: { tokens: { increment: AMOUNT } } }),
    prisma.tokenLedger.create({ data: { userId: u.id, delta: AMOUNT, reason: "promo", ref: REF, balanceAfter: after } }),
  ]);
  granted++;
}
console.log(JSON.stringify({ users: users.length, granted, skipped, amount: AMOUNT, ref: REF }));
await prisma.$disconnect();
