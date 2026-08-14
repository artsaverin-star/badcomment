import type { SessionUser } from "./session";

const ASO_OWNER_USERNAME = "artsaverin";

// The ASO workspace is an internal owner tool, not part of paid or friend
// access. Requiring both the database role and the Telegram identity keeps a
// second admin account from silently gaining access later.
export function canUseAso(user: Pick<SessionUser, "isAdmin" | "username"> | null | undefined): boolean {
  return !!user?.isAdmin && user.username?.trim().replace(/^@/, "").toLowerCase() === ASO_OWNER_USERNAME;
}
