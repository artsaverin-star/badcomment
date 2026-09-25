// The rating catalogue's ten groups (spec 11 §4.1, §8.4). Client-safe and pure: the reader
// (sitedata/rating.ts listRatingGroups), the catalogue page and scripts/v2/check-content.ts
// share it. Every usable niche (71; astrology has no review corpus) is in exactly one group;
// check-content fails when a usable niche is missing or a slug is unknown.
//
// Group names are web strings (`group_<id>` in ./strings.ts). Inside a group the catalogue sorts
// the niches alphabetically by displayed name, so the order of the lists below does not matter.

export type RatingGroupId = "health" | "sport" | "mind" | "work" | "ai" | "learn" | "money" | "media" | "home" | "everyday";

/** Display order of the groups (the catalogue's anchor chips and sections). */
export const RATING_GROUPS: readonly RatingGroupId[] = ["health", "sport", "mind", "work", "ai", "learn", "money", "media", "home", "everyday"];

const MEMBERS: Record<RatingGroupId, readonly string[]> = {
  health: [
    "blood-pressure-log",
    "cosmetics-ingredient-checker",
    "intermittent-fasting",
    "nutrition-calories",
    "period-cycle",
    "pregnancy-tracker",
    "sleep-tracking",
    "water-hydration",
    "weight-tracker",
    "white-noise-sleep-sounds",
  ],
  sport: ["cycling", "fishing", "hiking-trails", "run-tracking", "step-counter", "workout-fitness", "yoga"],
  mind: ["faith-prayer-bible", "habit-tracking", "journaling-mood", "meditation-mindfulness", "sobriety", "tarot-reading"],
  work: [
    "calendars-tasks",
    "focus-productivity",
    "invoice-maker",
    "mind-mapping",
    "notes-pkm",
    "password-manager",
    "qr-scanner",
    "resume-builder",
    "scanner-pdf",
    "teleprompter-captions",
    "voice-recorder",
  ],
  ai: ["ai-avatars-headshots", "ai-chatbot", "ai-companion-roleplay", "ai-image-generation", "ai-photo-restore", "ai-species-identifier", "ai-writing"],
  learn: ["ai-homework-solver", "astronomy-stargazing", "driving-test-prep", "flashcards", "guitar-tuner-learn", "language-learning", "translator"],
  money: ["crypto-investing", "personal-finance", "stock-investing"],
  media: ["music-streaming", "photo-editing", "video-streaming", "wallpapers-widgets"],
  home: [
    "baby-tracking",
    "car-maintenance",
    "couples-relationship",
    "interior-design",
    "meal-prep-grocery",
    "pet-care",
    "plant-care",
    "recipes-meal-planning",
    "wardrobe-outfit",
  ],
  everyday: ["dating-apps", "food-delivery", "messaging-apps", "ride-hailing", "shopping-ecommerce", "travel-planning", "weather-apps"],
};

/** Niche slug → its group. A niche outside the map (astrology) has no catalogue card. */
export const GROUP_OF: Readonly<Record<string, RatingGroupId>> = Object.freeze(
  Object.fromEntries(RATING_GROUPS.flatMap((id) => MEMBERS[id].map((slug) => [slug, id] as const))),
);

/** The niche's group, or null for a slug outside the catalogue. */
export function ratingGroupOf(slug: string): RatingGroupId | null {
  return Object.prototype.hasOwnProperty.call(GROUP_OF, slug) ? GROUP_OF[slug] : null;
}

/** Every slug of a group, in the list order above (tests and checks; pages sort by name). */
export function ratingGroupMembers(id: RatingGroupId): readonly string[] {
  return MEMBERS[id];
}
