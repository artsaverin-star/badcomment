import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// One-off owner tool: reset the owner's own account so they can experience the
// real "buy energy → unlock sections" flow.
//   GET /api/dev/buyer-preview      → clear own unlocks + ledger, set energy=200,
//                                      set as_buyer cookie (gates show), redirect.
//   GET /api/dev/buyer-preview?off=1 → drop the cookie (restore unlimited view).
// Gated strictly to the owner email — it only ever touches that one account.
const OWNER = "artsaverin@gmail.com";

export async function GET(req: Request) {
  const u = await getSessionUser();
  if (!u || u.email !== OWNER) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const res = NextResponse.redirect(new URL("/ru/segment/sobriety", req.url));

  if (url.searchParams.get("off") === "1") {
    res.cookies.set("as_buyer", "", { path: "/", maxAge: 0 });
    return res;
  }

  const del = await prisma.unlock.deleteMany({ where: { userId: u.id } });
  await prisma.tokenLedger.deleteMany({ where: { userId: u.id } });
  await prisma.user.update({ where: { id: u.id }, data: { tokens: 200 } });
  res.cookies.set("as_buyer", "1", { path: "/", maxAge: 60 * 60 * 24 * 30 });

  console.log(`[buyer-preview] reset ${OWNER}: removed ${del.count} unlocks, tokens=200`);
  return res;
}
