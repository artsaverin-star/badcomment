import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

// MCP clients have no cookies, so the paid layer is unlocked with a personal key
// instead. Same trick as the session cookie: an HMAC over the user id, so there
// is nothing to store and nothing to migrate. Rotating SESSION_SECRET invalidates
// every key at once (it already invalidates every session).

const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret";
const PREFIX = "inapp_";

export function mintApiKey(uid: string): string {
  const b = Buffer.from(uid).toString("base64url");
  const h = crypto.createHmac("sha256", `${SECRET}:mcp`).update(b).digest("base64url").slice(0, 32);
  return `${PREFIX}${b}.${h}`;
}

function uidFromKey(key: string): string | null {
  if (!key.startsWith(PREFIX)) return null;
  const [b, h] = key.slice(PREFIX.length).split(".");
  if (!b || !h) return null;
  const h2 = crypto.createHmac("sha256", `${SECRET}:mcp`).update(b).digest("base64url").slice(0, 32);
  if (h.length !== h2.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(h), Buffer.from(h2))) return null;
  try {
    return Buffer.from(b, "base64url").toString();
  } catch {
    return null;
  }
}

/** Resolve `Authorization: Bearer <key>` to a user. Null for anonymous callers. */
export async function userFromAuthHeader(header: string | null): Promise<SessionUser | null> {
  const raw = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!raw) return null;
  const uid = uidFromKey(raw);
  if (!uid) return null;
  const u = await prisma.user.findUnique({ where: { id: uid } });
  if (!u) return null;
  return {
    id: u.id,
    telegramId: u.telegramId,
    googleId: u.googleId,
    email: u.email,
    username: u.username,
    firstName: u.firstName,
    premiumUntil: u.premiumUntil,
    tokens: u.tokens,
    lifetime: u.lifetime,
    isAdmin: u.isAdmin,
  };
}
