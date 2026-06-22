// The hand-finished niches — per-app v3 teardown + synthesis + human-language
// rewrite. Their ideas/cards read cleanly, so they go FIRST in the idea deck (and
// anywhere we surface "best" content). Grow this list as more niches are finished.
export const PREMIUM_NICHES = [
  "notes-pkm",
  "photo-editing",
  "calendars-tasks",
  "study-aids",
  "nutrition-calories",
  "document-scanners",
  "weather-apps",
  "intermittent-fasting",
  "affirmations",
  "plant-care",
  "habit-tracking",
  "personal-finance",
  "astrology",
] as const;

export const PREMIUM_NICHE_SET: ReadonlySet<string> = new Set(PREMIUM_NICHES);
