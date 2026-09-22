import "server-only";
import { cache } from "react";
import { getAccess } from "@/lib/access";
import { FREE_CATEGORY, FREE_IDEAS } from "./manifest.generated";

// Who is looking, and what may they read (ARCHITECTURE §4). Server-only; one DB round trip
// per request (React cache), reusing the old site's session + access ladder read-only:
//   plus = getAccess().unlimited  (admin ∨ lifetime ∨ friend ∨ premiumUntil > now; as_buyer honoured)
//   free layer = topic interior-design + ideas interior-design-1…5 (the app's rule)
//   legacy per-item unlocks: has("category"|"chapter", slug) opens a topic and its ideas,
//   has("idea", id) opens an idea.
// Gate BEFORE reading/serializing paid content (spec 04 §7.6, spec 09 G10).

export type ViewerUser = {
  id: string;
  /** Display name: first name → username → email local part → null. */
  name: string | null;
  /** One letter for the avatar. */
  initial: string;
  email: string | null;
  isAdmin: boolean;
};

export type Viewer = {
  loggedIn: boolean;
  /** inApp Plus on the web. */
  plus: boolean;
  user: ViewerUser | null;
  canReadResearch: (slug: string) => boolean;
  canReadIdea: (id: string) => boolean;
};

/** Serializable subset for client components (the shell passes it down). */
export type ViewerSummary = {
  loggedIn: boolean;
  plus: boolean;
  user: Pick<ViewerUser, "name" | "initial" | "isAdmin"> | null;
};

const freeIdeas: ReadonlySet<string> = new Set(FREE_IDEAS);

/** "habit-tracking-10" → "habit-tracking". */
export function ideaCategory(id: string): string {
  return id.replace(/-\d+$/, "");
}

export const getViewer = cache(async (): Promise<Viewer> => {
  const access = await getAccess();
  const u = access.user;
  const plus = access.unlimited;

  const unlockedTopic = (slug: string) => access.has("category", slug) || access.has("chapter", slug);

  const name = u ? u.firstName || u.username || (u.email ? u.email.split("@")[0] : null) || null : null;
  const user: ViewerUser | null = u
    ? {
        id: u.id,
        name,
        initial: (name || u.email || "?").trim().charAt(0).toUpperCase() || "?",
        email: u.email,
        isAdmin: u.isAdmin,
      }
    : null;

  return {
    loggedIn: access.loggedIn,
    plus,
    user,
    canReadResearch: (slug) => plus || slug === FREE_CATEGORY || unlockedTopic(slug),
    // Not canReadResearch: the free topic does not open its paid ideas (interior-design-6…8).
    canReadIdea: (id) =>
      plus || freeIdeas.has(id) || access.has("idea", id) || unlockedTopic(ideaCategory(id)),
  };
});

export function summarizeViewer(v: Viewer): ViewerSummary {
  return {
    loggedIn: v.loggedIn,
    plus: v.plus,
    user: v.user ? { name: v.user.name, initial: v.user.initial, isAdmin: v.user.isAdmin } : null,
  };
}
