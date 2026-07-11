import { RATING_BY_SLUG } from "@/data/peoplesRating";
import type { Locale } from "@/lib/i18n";

// A URL slug for a rated app, derived from its title. Rating apps have no
// stored slug (they carry an App Store id), so the slug is computed both when
// linking and when resolving — the same function on both sides keeps them in
// sync. Latin/Cyrillic titles both reduce to an ASCII-ish handle.
export function appSlugify(title: string): string {
  return (title || "")
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "app";
}

export type RatingApp = {
  id: string; title: string; icon?: string | null;
  storeAvg?: number | null; ratings?: number; realScore?: number;
  authenticity?: string; authNote?: string;
  verdict?: string; loved?: string; weak?: string; whoFor?: string;
  shots?: string[];
  en?: { verdict?: string; loved?: string; weak?: string; whoFor?: string; authNote?: string };
};
type RSet = { name: string; nameEn?: string; apps?: RatingApp[] };
const RATING = RATING_BY_SLUG as Record<string, RSet>;

export function getNicheName(slug: string, locale: Locale): string | null {
  const r = RATING[slug];
  if (!r) return null;
  return (locale === "en" ? r.nameEn : r.name) || r.name;
}

// Find a rated app inside a niche by its computed slug. Returns the app plus its
// EN fields already merged for the locale.
export function findRatingApp(niche: string, appSlug: string, locale: Locale): RatingApp | null {
  const r = RATING[niche];
  if (!r?.apps) return null;
  const app = r.apps.find((a) => appSlugify(a.title) === appSlug);
  if (!app) return null;
  if (locale === "en" && app.en) {
    return { ...app, verdict: app.en.verdict ?? app.verdict, loved: app.en.loved ?? app.loved, weak: app.en.weak ?? app.weak, whoFor: app.en.whoFor ?? app.whoFor, authNote: app.en.authNote ?? app.authNote };
  }
  return app;
}
