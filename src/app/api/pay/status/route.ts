import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const checkout = new URL(req.url).searchParams.get("checkout") || "";
  if (!/^[0-9a-f-]{36}$/i.test(checkout)) return NextResponse.json({ error: "invalid_checkout" }, { status: 400 });

  const attempt = await prisma.paymentAttempt.findUnique({ where: { id: checkout } });
  if (!attempt || attempt.userId !== user.id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    status: attempt.status,
    amountRub: attempt.status === "succeeded" ? attempt.amountRub : undefined,
    transactionId: attempt.status === "succeeded" ? attempt.providerPaymentId : undefined,
    source: attempt.source,
  });
}
