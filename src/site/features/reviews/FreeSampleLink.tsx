import Link from "next/link";
import type { Locale } from "@/site/i18n/locales";
import { routes } from "@/site/routing";
import { FREE_REVIEW_NICHE } from "@/site/sitedata/reviews";

// The lock card's way to the open sample category (redesign spec §4.2 item 7): the
// «Сначала прочитать бесплатный разбор» link of the content gate (ClarityContentAccess.swift:
// 95-101, `.ia-rs-text-link`, research.css), worded by reviewsStrings.lockSample
// («Сначала посмотреть открытую категорию «{free}»»). The niche name keeps its own language.
// Server component.

export function FreeSampleLink({
  locale,
  template,
  name,
  nameLang,
}: {
  locale: Locale;
  /** reviewsStrings[L].lockSample, with a `{free}` placeholder. */
  template: string;
  name: string;
  nameLang: Locale;
}) {
  const [before, after = ""] = template.split("{free}");
  return (
    <Link className="ia-rs-text-link" href={routes.reviewsNiche(locale, FREE_REVIEW_NICHE)}>
      {/* One span: the link is an inline-flex row, so bare text runs would become gapped items. */}
      <span>
        {before}
        <span lang={nameLang === locale ? undefined : nameLang}>{name}</span>
        {after}
      </span>
    </Link>
  );
}
