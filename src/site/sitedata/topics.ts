// Where a niche's breakdown lives, for the web-only sections (rating, review archive): the new
// topic page of the app's launch topics. The other topics still open the previous version of the
// site («Скоро в новом формате»), so these sections do not link them — everything they link opens
// in the new design (owner, 2026-09-24).

import type { Locale } from "../i18n/locales";
import { isLaunchCategory } from "../manifest.generated";
import { routes } from "../routing";

export type TopicLink = {
  href: string;
  /** The target is an old page (another root layout): render a plain <a>, not next/link. */
  old: boolean;
  /** Language of the target page when it differs from the page locale. */
  lang?: string;
};

export function nicheTopicLink(l: Locale, niche: string): TopicLink | null {
  return isLaunchCategory(niche) ? { href: routes.topic(l, niche), old: false } : null;
}
