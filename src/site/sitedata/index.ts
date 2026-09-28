// Server-only adapters from the site to data it shares with the retired old site (ARCHITECTURE
// §2 sitedata). Read-only; everything returned here is public catalogue data.
//
//   getSoonTopics(L)   «Скоро в новом формате»: the topics without a breakdown yet, each linked
//                      to its app rating (/<L>/rating/<slug>)
//
// The old site's pages are gone (2026-09-27); its topics outside the launch edition keep their
// rating, which is where their old URLs redirect too (src/site/routing/decide.ts).

import "server-only";

import active from "@/data/active-categories.json";
import type { Locale } from "../i18n/locales";
import { isLaunchCategory } from "../manifest.generated";
import { routes } from "../routing";
import { hasRatingNiche, ratingNicheName } from "./rating";
import type { SoonTopic } from "./types";

export type { SoonTopic } from "./types";

const soonCache = new Map<Locale, SoonTopic[]>();

/**
 * The active topics that are not in the app's launch edition and have an app rating, sorted by
 * their displayed name (the rating's topic name: ru in Russian, English elsewhere).
 */
export function getSoonTopics(l: Locale): SoonTopic[] {
  const hit = soonCache.get(l);
  if (hit) return hit;
  const collator = new Intl.Collator(l, { sensitivity: "base", numeric: true });
  const list = (active as string[])
    .filter((slug) => !isLaunchCategory(slug) && hasRatingNiche(slug))
    .flatMap((slug) => {
      const name = ratingNicheName(l, slug);
      return name ? [{ slug, name: name.name, href: routes.ratingNiche(l, slug), lang: name.nameLang }] : [];
    })
    .sort((a, b) => collator.compare(a.name, b.name));
  soonCache.set(l, list);
  return list;
}
