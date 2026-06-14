import { getSessionUser } from "./session";

// Access model: a small set of categories (+ their ideas) is free for everyone;
// the rest is premium-only. Premium = a logged-in user (Telegram) whose
// subscription (set by the Stars payment in the bot) is still active.

// Free, fully-open categories (slug = catalog/segment slug). Four flagships.
export const FREE_CATEGORIES = [
  "habit-tracking",
  "photo-editing",
  "ai-chat-assistants",
  "language-learning",
];

export async function isPremium(): Promise<boolean> {
  const u = await getSessionUser();
  return !!(u && u.premiumUntil && new Date(u.premiumUntil) > new Date());
}

export function isFreeCategory(slug: string): boolean {
  return FREE_CATEGORIES.includes(slug);
}

// Can the current viewer open this category's full content?
export function canAccessCategory(slug: string, premium: boolean): boolean {
  return premium || isFreeCategory(slug);
}
