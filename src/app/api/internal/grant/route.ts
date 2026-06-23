import { NextResponse } from "next/server";
import { grantUnlock, type BuyKind } from "@/lib/unlocks";

export const dynamic = "force-dynamic";

// Internal endpoint for the Telegram bot (same box, localhost) to grant a deck /
// category / lifetime unlock from a Stars payment — reusing the same grantUnlock
// logic as card purchases (single source of truth). Authenticated by the shared
// SESSION_SECRET. amountRub is omitted (Stars have no ₽ amount); the admin maps
// Stars revenue by reason instead.
export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  const body = (await req.json().catch(() => ({}))) as {
    secret?: string;
    userId?: string;
    kind?: string;
    slug?: string | null;
    ref?: string;
  };

  if (body.secret !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { userId, kind, slug, ref } = body;
  if (!userId || !ref || (kind !== "deck" && kind !== "category" && kind !== "lifetime")) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  try {
    await grantUnlock(userId, kind as BuyKind, slug ?? null, ref);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
