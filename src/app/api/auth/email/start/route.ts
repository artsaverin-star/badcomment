import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { mailEnabled, sendMagicLink } from "@/lib/mail";
import { signEmailToken, isValidEmail, isDisposable } from "@/lib/emailAuth";
import { appOrigin } from "@/lib/googleAuth";

export const dynamic = "force-dynamic";

const RL_COOKIE = "el_rl"; // soft per-browser cap on how many links we'll send/day
const RL_MAX = 5;

// Step 1 of email sign-in: validate the address and send a magic link.
export async function POST(req: Request) {
  if (!mailEnabled) return NextResponse.json({ error: "disabled" }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const rawReturn = typeof body?.return_to === "string" ? body.return_to : "";
  const returnTo = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/cards";

  if (!isValidEmail(email)) return NextResponse.json({ error: "bad_email" }, { status: 400 });
  if (isDisposable(email)) return NextResponse.json({ error: "disposable" }, { status: 400 });

  const jar = await cookies();
  const used = Number(jar.get(RL_COOKIE)?.value || 0);
  if (used >= RL_MAX) return NextResponse.json({ error: "rate" }, { status: 429 });

  const token = signEmailToken(email);
  const url = `${appOrigin(req)}/api/auth/email/verify?token=${encodeURIComponent(token)}&rt=${encodeURIComponent(returnTo)}`;

  try {
    await sendMagicLink(email.toLowerCase(), url);
  } catch {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(RL_COOKIE, String(used + 1), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 });
  return res;
}
