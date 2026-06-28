// Auto-maintained barrel, keyed by slug.
import aiAvatarsHeadshots from "./ai-avatars-headshots.json";
import astrology from "./astrology.json";
import calendarsTasks from "./calendars-tasks.json";
import cryptoInvesting from "./crypto-investing.json";
import datingApps from "./dating-apps.json";
import habitTracking from "./habit-tracking.json";
import languageLearning from "./language-learning.json";
import meditationMindfulness from "./meditation-mindfulness.json";
import notesPkm from "./notes-pkm.json";
import nutritionCalories from "./nutrition-calories.json";
import periodCycle from "./period-cycle.json";
import personalFinance from "./personal-finance.json";
import photoEditing from "./photo-editing.json";

export const RATING_BY_SLUG: Record<string, unknown> = {
  "ai-avatars-headshots": aiAvatarsHeadshots, astrology, "calendars-tasks": calendarsTasks, "crypto-investing": cryptoInvesting, "dating-apps": datingApps, "habit-tracking": habitTracking, "language-learning": languageLearning, "meditation-mindfulness": meditationMindfulness, "notes-pkm": notesPkm, "nutrition-calories": nutritionCalories, "period-cycle": periodCycle, "personal-finance": personalFinance, "photo-editing": photoEditing,
};
