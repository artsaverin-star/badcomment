import { getSessionUser, type SessionUser } from "./session";
import { isFriendIdentity } from "./friends";
import { getUnlockSets } from "./tokens";
import type { UnlockType } from "./tokenConfig";

export type Access = {
  user: SessionUser | null;
  loggedIn: boolean;
  unlimited: boolean; // admin / friend / legacy comp subscriber — sees everything
  balance: number;
  has: (type: UnlockType, slug: string) => boolean;
};

// Request-scoped access: load the viewer, their wallet balance and unlock sets
// once, then answer has(type, slug) synchronously. Admins, hand-listed friends
// and any still-valid legacy premium keep full access (unlimited).
export async function getAccess(): Promise<Access> {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, loggedIn: false, unlimited: false, balance: 0, has: () => false };
  }

  const unlimited =
    user.isAdmin ||
    isFriendIdentity(user) ||
    !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());

  if (unlimited) {
    return { user, loggedIn: true, unlimited: true, balance: user.tokens ?? 0, has: () => true };
  }

  const sets = await getUnlockSets(user.id);
  return {
    user,
    loggedIn: true,
    unlimited: false,
    balance: user.tokens ?? 0,
    has: (type, slug) => sets[type]?.has(slug) ?? false,
  };
}
