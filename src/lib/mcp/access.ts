import { isFriendIdentity } from "@/lib/friends";
import { getUnlockSets } from "@/lib/tokens";
import { ownsDeck } from "@/lib/unlocks";
import type { SessionUser } from "@/lib/session";
import type { UnlockType } from "@/lib/tokenConfig";

// getAccess() reads the session cookie, which an MCP client does not have. This
// is the same entitlement ladder resolved from an already-identified user, so a
// key holder sees in their editor exactly what they paid for on the site.

export type McpAccess = {
  user: SessionUser | null;
  unlimited: boolean;
  deck: boolean;
  has: (type: UnlockType, slug: string) => boolean;
};

export async function accessForUser(user: SessionUser | null): Promise<McpAccess> {
  if (!user) return { user: null, unlimited: false, deck: false, has: () => false };

  const unlimited =
    user.isAdmin ||
    user.lifetime ||
    isFriendIdentity(user) ||
    !!(user.premiumUntil && new Date(user.premiumUntil) > new Date());

  if (unlimited) return { user, unlimited: true, deck: true, has: () => true };

  const [sets, deck] = await Promise.all([getUnlockSets(user.id), ownsDeck(user.id)]);
  return { user, unlimited: false, deck, has: (type, slug) => sets[type]?.has(slug) ?? false };
}

/** The site's allow-rule for one idea, mirrored verbatim. */
export function ownsIdea(a: McpAccess, ideaSlug: string, category: string): boolean {
  return a.unlimited || a.has("idea", ideaSlug) || a.has("category", category) || a.has("chapter", category) || a.deck;
}
