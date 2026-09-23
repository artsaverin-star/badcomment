import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { notifyPurchaseLater, type PurchaseKind } from "@/lib/purchaseNotify";

export const dynamic = "force-dynamic";

// Internal endpoint for the Telegram bot: the owner's Telegram ping for a Stars purchase the bot
// granted itself (lifetime, token packs) — same text and recipients as the site's own pings
// (src/lib/purchaseNotify.ts). The bot calls it only for a newly granted payment; `ref`
// (the Stars charge ref) makes a repeated call a no-op.
// Authenticated by the shared SESSION_SECRET, like /api/internal/grant.
const KINDS: PurchaseKind[] = ["lifetime", "deck", "category", "tokens"];

export async function POST(req: Request) {
  const secret = process.env.SESSION_SECRET || "dev-insecure-secret";
  const body = (await req.json().catch(() => ({}))) as { secret?: string; kind?: string; stars?: number | null; ref?: string | null };

  if (body.secret !== secret) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const kind = KINDS.find((k) => k === body.kind);
  if (!kind) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const stars = Number.isInteger(body.stars) && (body.stars as number) > 0 ? (body.stars as number) : null;

  // Delivery retries for up to ~30 min, so it runs after the response (the bot does not wait).
  const ref = typeof body.ref === "string" && body.ref ? body.ref.slice(0, 200) : `bot:${crypto.randomUUID()}`;
  const queued = notifyPurchaseLater({ kind, provider: "stars", stars }, ref);
  return NextResponse.json({ ok: true, queued });
}
