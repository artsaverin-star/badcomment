"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useLocale, useT, useWeb } from "../i18n/client";
import type { Locale } from "../i18n/locales";
import { parsePublicPath, tabOf, tabRoot, TABS, type Tab } from "../routing";
import { cx } from "../ui/cx";
import { BookmarkFilledIcon, IdeasFilledIcon, ResearchFilledIcon } from "../ui/icons";
import { rememberedTabLocation, subscribeTabMemory } from "./navigation";
import type { ShellStrings } from "./strings";

// The tabs of the app (spec 01 §1.2, spec 05 §3.6 I): «Разборы», «Пульс» (web label from
// shellStrings.pulse, lucide Activity glyph), «Идеи», «Сохранённое».
//   variant="floating"  mobile capsule at the bottom, tab roots only; idle items = glyph only
//                       (the label folds away but stays the accessible name)
//   variant="top"       desktop capsule in the sticky top bar; all labels visible
// Glyphs are the app's filled symbols (ClarityFloatingTabBar.swift:11-15): text.book.closed.fill,
// lightbulb.fill, bookmark.fill — 19 pt medium in a 23-wide box.
// Each tab remembers its last URL in this browser tab (switching tabs restores it); the
// current tab always links to its root.

const TAB_TITLE: Record<Exclude<Tab, "pulse">, string> = { research: "Разборы", ideas: "Идеи", saved: "Сохранённое" };
const TAB_ICON = { pulse: Activity, research: ResearchFilledIcon, ideas: IdeasFilledIcon, saved: BookmarkFilledIcon } as const;

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
  const s = useWeb<ShellStrings>("shell");
  const href = useTabHref(locale, tab, current);
  const Icon = TAB_ICON[tab];
  const active = tab === current;
  return (
    <Link
      href={href}
      className="ia-tab"
      // The current section on inner pages too (the app's .isSelected trait), "page" at its root.
      aria-current={active ? (atRoot ? "page" : "true") : undefined}
      data-active={active || undefined}
      data-tab={tab}
    >
      <span className="ia-tab__icon" aria-hidden="true">
        <Icon size={19} strokeWidth={2} />
      </span>
      <span className="ia-tab__label">
        <span className="ia-tab__text">{tab === "pulse" ? s.pulse : t(TAB_TITLE[tab])}</span>
      </span>
    </Link>
  );
}

export function TabCapsule({ variant }: { variant: "floating" | "top" }) {
  const pathname = usePathname();
  const s = useWeb<ShellStrings>("shell");
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
