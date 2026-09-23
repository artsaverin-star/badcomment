import "server-only";
import type { Locale } from "@/site/i18n/locales";
import ru from "./copy/ru.json";
import en from "./copy/en.json";
import de from "./copy/de.json";
import fr from "./copy/fr.json";
import ja from "./copy/ja.json";

export type LaunchCopy = { [Key in keyof typeof ru]: string };

// Only the selected locale's small interactive labels are passed to client islands.
export const launchCopy: Record<Locale, LaunchCopy> = { ru, en, de, fr, ja };
