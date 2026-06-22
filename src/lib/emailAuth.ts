import crypto from "node:crypto";
import { prisma } from "./prisma";
import { setSession } from "./session";

// Magic-link tokens are HMAC-signed with the same SESSION_SECRET as the session
// cookie. Namespaced with k:"el" so they can't be confused with session tokens.
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";
const TTL = 15 * 60;

export function signEmailToken(email: string): string {
  const payload = { e: email.toLowerCase(), exp: Math.floor(Date.now() / 1000) + TTL, k: "el" };
  const b = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const h = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  return `${b}.${h}`;
}

export function verifyEmailToken(tok?: string | null): string | null {
  if (!tok) return null;
  const [b, h] = tok.split(".");
  if (!b || !h) return null;
  const h2 = crypto.createHmac("sha256", SECRET).update(b).digest("base64url");
  if (h.length !== h2.length || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(h2))) return null;
  try {
    const p = JSON.parse(Buffer.from(b, "base64url").toString());
    if (p.k !== "el" || typeof p.exp !== "number" || p.exp < Date.now() / 1000 || !p.e) return null;
    return p.e as string;
  } catch {
    return null;
  }
}

export function isValidEmail(e: string): boolean {
  return typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

const DISPOSABLE = new Set([
  "mailinator.com", "tempmail.com", "temp-mail.org", "temp-mail.io", "10minutemail.com", "10minutemail.net",
  "guerrillamail.com", "guerrillamail.info", "sharklasers.com", "grr.la", "trashmail.com", "trashmail.de",
  "yopmail.com", "getnada.com", "nada.email", "dispostable.com", "throwawaymail.com", "maildrop.cc",
  "mohmal.com", "fakeinbox.com", "emailondeck.com", "mintemail.com", "mailnesia.com", "tempinbox.com",
  "moakt.com", "tempr.email", "mailcatch.com", "spamgourmet.com", "discard.email",
  "tmpmail.org", "vomoto.com", "mvrht.com", "33mail.com", "burnermail.io", "anonaddy.me",
]);
export function isDisposable(e: string): boolean {
  const d = e.split("@")[1]?.toLowerCase();
  return !!d && DISPOSABLE.has(d);
}

export async function loginWithEmail(email: string) {
  const e = email.toLowerCase();
  const firstUser = (await prisma.user.count()) === 0;
  let user = await prisma.user.findUnique({ where: { email: e } });
  if (!user) {
    user = await prisma.user.create({ data: { email: e, isAdmin: firstUser } });
  }
  await setSession(user.id);
  return user;
}
