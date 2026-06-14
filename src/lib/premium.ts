import { getSessionUser } from "./session";
import { isFriendIdentity } from "./friends";

// Access model: a small set of categories (+ their ideas) is free for everyone;
// the rest is premium-only. Premium = a logged-in user (Telegram) whose
// subscription (set by the Stars payment in the bot) is still active.

// Free, fully-open categories (slug = catalog/segment slug). Four flagships.
export const FREE_CATEGORIES = [
  "habit-tracking",
  "photo-editing",
  "mood-journaling",
  "language-learning",
];

export async function isPremium(): Promise<boolean> {
  const u = await getSessionUser();
  if (!u) return false;
  // Admins (the owner) always have full access.
  if (u.isAdmin) return true;
  // Friends get comp access (см. src/data/friends.json).
  if (isFriendIdentity(u)) return true;
  return !!(u.premiumUntil && new Date(u.premiumUntil) > new Date());
}

// Whether the current viewer is a hand-listed friend (comp premium).
export async function isFriend(): Promise<boolean> {
  const u = await getSessionUser();
  return !!u && isFriendIdentity(u);
}

export function isFreeCategory(slug: string): boolean {
  return FREE_CATEGORIES.includes(slug);
}

// Can the current viewer open this category's full content?
export function canAccessCategory(slug: string, premium: boolean): boolean {
  return premium || isFreeCategory(slug);
}
