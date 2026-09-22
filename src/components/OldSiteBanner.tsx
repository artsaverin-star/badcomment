"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { publicHref, splitOldPath } from "@/lib/oldHref";
import type { OldSiteContext } from "@/lib/oldSite.server";

// Thin strip above the old header telling visitors they are on the previous
// version of inApp (docs/site-v2/DECISIONS.md §4, §8; ARCHITECTURE.md §5.3).
// Driven by the proxy headers the old root layout reads:
//   x-ia-site=old             → «Это прежняя версия сайта · Перейти на новую» (→ x-ia-new-path)
//   x-ia-site=inplace, soon=1 → «Скоро обновление · пока прежняя версия разбора» + «Новые разборы»
//   x-ia-site=inplace         → quiet «Этот раздел пока в прежнем дизайне · Новый inApp →»
// No headers (local dev without the proxy) → nothing.
// Links lead to the NEW site (a different root layout), so they are plain <a>.

const COPY = {
  ru: {
    old: "Это прежняя версия сайта",
    oldLink: "Перейти на новую",
    soon: "Скоро обновление · пока прежняя версия разбора",
    soonLink: "Новые разборы",
    inplace: "Этот раздел пока в прежнем дизайне",
    inplaceLink: "Новый inApp →",
  },
  en: {
    old: "This is the previous version of the site",
    oldLink: "Go to the new one",
    soon: "Update coming soon · this is the previous version of the analysis",
    soonLink: "New breakdowns",
    inplace: "This section still uses the previous design",
    inplaceLink: "New inApp →",
  },
} as const;

// Old routes whose public URL the new site owns (ARCHITECTURE.md §1).
const NEW_OWNED = new Set(["/ideas", "/saved", "/library", "/contacts", "/offer"]);

/**
 * The root layout is not re-rendered on client navigations, so after a soft
 * navigation the server headers describe the FIRST page only. Inside /<L>/old
 * every link stays in the old site, so later pages are "old"; their new-site
 * target is approximated without the routing manifest (the proxy's exact
 * x-ia-new-path applies again on the next full load): a topic or idea leads
 * to the new catalog, everything else without an obvious twin to the new home.
 */
function clientNewPath(locale: Locale, rest: string): string {
  if (rest === "/" || NEW_OWNED.has(rest)) return publicHref(locale, rest);
  if (rest === "/search" || rest.startsWith("/segment/")) return publicHref(locale, "/segment");
  if (rest.startsWith("/ideas/")) return publicHref(locale, "/ideas");
  return publicHref(locale);
}

type Props = Pick<OldSiteContext, "site" | "publicPath" | "newPath" | "soon"> & { locale: Locale };

export default function OldSiteBanner({ locale, site, publicPath, newPath, soon }: Props) {
  const pathname = usePathname();
  // The path this layout instance was rendered for (SSR: internal path; client: browser path).
  const [firstPath] = useState(pathname);
  if (!site) return null;

  const fresh = pathname === firstPath || pathname === publicPath;
  const current = splitOldPath(pathname);
  const mode = fresh ? site : current.old ? "old" : site;
  const isSoon = fresh ? soon : false;
  const target = fresh ? newPath : current.old ? clientNewPath(locale, current.rest) : null;

  const t = COPY[locale === "en" ? "en" : "ru"];
  const quiet = mode === "inplace" && !isSoon;
  const [text, linkText, href] =
    mode === "old"
      ? [t.old, t.oldLink, target ?? publicHref(locale)]
      : isSoon
        ? [t.soon, t.soonLink, publicHref(locale, "/segment")]
        : [t.inplace, t.inplaceLink, publicHref(locale)];

  return (
    <div
      role="note"
      data-old-site-banner={mode}
      className={`relative z-40 border-b border-[var(--color-border-subtle)] px-4 py-1.5 text-center text-caption ${
        quiet ? "text-[var(--color-text-tertiary)]" : "bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]"
      }`}
    >
      <span className="text-pretty">{text}</span>
      <span aria-hidden="true" className="px-1.5">·</span>
      <a
        href={href}
        className={`font-semibold underline-offset-2 transition-colors hover:underline ${
          quiet ? "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]" : "text-[var(--color-text-primary)]"
        }`}
      >
        {linkText}
      </a>
    </div>
  );
}
