import type { SessionUser } from "./session";

const WORKSPACE_OWNER_USERNAME = "artsaverin";

// The category workspace is a private IA experiment. Keep it separate from
// paid, lifetime and friend access until the public structure is approved.
export function canUseWorkspaceBeta(
  user: Pick<SessionUser, "isAdmin" | "username"> | null | undefined,
): boolean {
  return !!user?.isAdmin && user.username?.trim().replace(/^@/, "").toLowerCase() === WORKSPACE_OWNER_USERNAME;
}
