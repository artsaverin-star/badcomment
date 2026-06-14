import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "./prisma";

// Dependency-free session: an HMAC-signed cookie carrying the user id. No JWT lib
// needed. secure:false for now because prod is still http (no TLS until the
// inapp.pro cert lands) — flip to true once HTTPS is live.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";
const COOKIE = "ia_session";
const TTL = 60 * 60 * 24 * 30; // 30 days

function sign(payload: object): string {
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const h = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  return `${b}.${h}`;
}

function verify(tok?: string): { uid: string; exp: number } | null {
  if (!tok) return null;
  const [b, h] = tok.split(".");
  if (!b || !h) return null;
  const h2 = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  if (h.length !== h2.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(h), Buffer.from(h2))) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString());
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

export async function setSession(uid: string) {
  (await cookies()).set(COOKIE, sign({ uid, exp: Math.floor(Date.now() / 1000) + TTL }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: TTL,
    secure: false,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export type SessionUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  premiumUntil: Date | null;
  isAdmin: boolean;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const tok = (await cookies()).get(COOKIE)?.value;
  const p = verify(tok);
  if (!p) return null;
  try {
    return (await prisma.user.findUnique({ where: { id: p.uid } })) as SessionUser | null;
  } catch {
    return null;
  }
}
