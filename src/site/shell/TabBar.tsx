"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useLocale, useT, useWebStrings } from "../i18n/client";
import type { Locale } from "../i18n/locales";
import { parsePublicPath, tabOf, tabRoot, TABS, type Tab } from "../routing";
import { cx } from "../ui/cx";
import { BookmarkIcon, IdeasIcon, ResearchIcon } from "../ui/icons";
import { rememberedTabLocation, subscribeTabMemory } from "./navigation";
import { shellStrings } from "./strings";

// The three tabs of the app (spec 01 §1.2, spec 05 §3.6 I): «Разборы», «Идеи», «Сохранённое».
//   variant="floating"  mobile capsule at the bottom, tab roots only; idle items = glyph only
//   variant="top"       desktop capsule in the sticky top bar; all labels visible
// Each tab remembers its last URL in this browser tab (switching tabs restores it); the
// current tab always links to its root.

const TAB_TITLE: Record<Tab, string> = { research: "Разборы", ideas: "Идеи", saved: "Сохранённое" };
const TAB_ICON = { research: ResearchIcon, ideas: IdeasIcon, saved: BookmarkIcon } as const;

function useTabHref(locale: Locale, tab: Tab, current: Tab | null): string {
  const remembered = useSyncExternalStore(
    subscribeTabMemory,
    () => rememberedTabLocation(tab, locale),
    () => null,
  );
  if (tab === current || !remembered) return tabRoot(locale, tab);
  return remembered;
}

function TabItem({ tab, current, atRoot }: { tab: Tab; current: Tab | null; atRoot: boolean }) {
  const locale = useLocale();
  const t = useT();
  const href = useTabHref(locale, tab, current);
  const Icon = TAB_ICON[tab];
  const active = tab === current;
  return (
    <Link
      href={href}
      className="ia-tab"
      aria-current={active && atRoot ? "page" : undefined}
      data-active={active || undefined}
      data-tab={tab}
    >
      <span className="ia-tab__icon" aria-hidden="true">
        <Icon size={19} strokeWidth={2.1} />
      </span>
      <span className="ia-tab__label">{t(TAB_TITLE[tab])}</span>
    </Link>
  );
}

export function TabCapsule({ variant }: { variant: "floating" | "top" }) {
  const pathname = usePathname();
  const s = useWebStrings(shellStrings);
  const current = tabOf(pathname);
  const atRoot = parsePublicPath(pathname).segments.length === 1;
  return (
    <nav aria-label={s.mainNav} className={cx("ia-tabbar", variant === "floating" && "ia-tabbar--floating")}>
      {TABS.map((tab) => (
        <TabItem key={tab} tab={tab} current={current} atRoot={atRoot} />
      ))}
    </nav>
  );
}

/** Mobile/tablet (< 1024): the floating capsule docked at the bottom. */
export function FloatingTabBar() {
  return (
    <div className="ia-tabbar-dock">
      <TabCapsule variant="floating" />
    </div>
  );
}
