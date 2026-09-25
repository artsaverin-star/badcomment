import type { LucideIcon } from "lucide-react";
import {
  CategoryCalendarIcon,
  CategoryDefaultIcon,
  CategoryFitnessIcon,
  CategoryFoodIcon,
  CategoryLearnIcon,
  CategoryMoneyIcon,
  CategoryMusicIcon,
  CategoryNotesIcon,
  CategoryPhotoIcon,
  CategorySleepIcon,
} from "./icons";

// Exact port of StudioStyle.categorySymbol (Studio/StudioStyle.swift:45-56): the first slug
// substring that matches wins, in the Swift order; anything else gets `square.stack.3d.up`
// (lucide Layers). Server- and client-safe. Render the result as a Row glyph:
//   const Glyph = categoryGlyph(slug);  <Glyph {...ROW_GLYPH} />

const RULES: readonly [readonly string[], LucideIcon][] = [
  [["photo", "image"], CategoryPhotoIcon], // photo.on.rectangle.angled
  [["calendar", "habit"], CategoryCalendarIcon], // calendar
  [["fitness", "run", "workout"], CategoryFitnessIcon], // figure.run
  [["money", "budget", "finance"], CategoryMoneyIcon], // creditcard
  [["note", "writ"], CategoryNotesIcon], // note.text
  [["music", "audio"], CategoryMusicIcon], // headphones
  [["sleep"], CategorySleepIcon], // moon.stars
  [["food", "recipe", "nutrition"], CategoryFoodIcon], // carrot
  [["learn", "flashcard", "language"], CategoryLearnIcon], // graduationcap
];

/** The lucide glyph of a category slug (StudioStyle.categorySymbol). */
export function categoryGlyph(slug: string): LucideIcon {
  for (const [needles, icon] of RULES) {
    if (needles.some((needle) => slug.includes(needle))) return icon;
  }
  return CategoryDefaultIcon;
}
