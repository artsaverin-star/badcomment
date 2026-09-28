// Types of the site's read-only view of shared catalogue data (client-safe, no imports).

import type { Locale } from "../i18n/locales";

/** A topic the site has not rewritten yet («Скоро в новом формате»), linked to its app rating. */
export interface SoonTopic {
  slug: string;
  name: string;
  /** Public URL of the topic's app rating (/<L>/rating/<slug>). */
  href: string;
  /** Language of `name` (de/fr/ja read the English rating names). */
  lang: Locale;
}
