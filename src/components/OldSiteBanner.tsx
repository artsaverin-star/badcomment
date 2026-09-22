"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { publicHref } from "@/lib/oldHref";
import type { OldSiteContext } from "@/lib/oldSite.server";
import { decideRoute } from "@/site/routing/decide";

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

type Props = Pick<OldSiteContext, "site" | "publicPath" | "newPath" | "soon"> & { locale: Locale };

/**
 * The root layout is not re-rendered on client navigations, so after a soft
 * navigation the server headers describe the FIRST page only. Old-site links move
 * between /<L>/old/… and in-place URLs (src/lib/oldHref.ts), so the banner derives
 * the same x-ia-* values for the browser path from the proxy's own pure decision.
 */
function clientContext(pathname: string | null): Pick<Props, "site" | "newPath" | "soon"> | null {
  if (!pathname) return null;
  const d = decideRoute({ pathname });
  if (d.type !== "rewrite" || d.site === "new") return null;
  return { site: d.site, newPath: d.requestHeaders["x-ia-new-path"] ?? null, soon: d.requestHeaders["x-ia-soon"] === "1" };
}

export default function OldSiteBanner({ locale, site, publicPath, newPath, soon }: Props) {
  const pathname = usePathname();
  // The path this layout instance was rendered for (SSR: internal path; client: browser path).
  const [firstPath] = useState(pathname);
  if (!site) return null;

  const fresh = pathname === firstPath || pathname === publicPath;
  const live = fresh ? null : clientContext(pathname);
  const mode = live?.site ?? site;
  const isSoon = live ? live.soon : fresh && soon;
  const target = live ? live.newPath : fresh ? newPath : null;

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
