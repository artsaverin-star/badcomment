import { cookies } from "next/headers";

// Access model (phase 0): a small set of categories (+ their ideas) is free for
// everyone; the rest is premium-only. Premium is, for now, a signed-ish cookie
// flag — it will be replaced by the real subscription check (user row set by the
// Telegram-bot payment flow) once auth/billing land. The gating API stays the
// same so the swap is local to this file.

// Free, fully-open categories (slug = catalog/segment slug). Four flagships.
export const FREE_CATEGORIES = [
  "habit-tracking",
  "photo-editing",
  "ai-chat-assistants",
  "language-learning",
];

export async function isPremium(): Promise<boolean> {
  const c = await cookies();
  return c.get("ia_premium")?.value === "1";
}

export function isFreeCategory(slug: string): boolean {
  return FREE_CATEGORIES.includes(slug);
}

// Can the current viewer open this category's full content?
export function canAccessCategory(slug: string, premium: boolean): boolean {
  return premium || isFreeCategory(slug);
}
