"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { useLocale, useT, useWeb } from "../i18n/client";
import type { Locale } from "../i18n/locales";
import { routes, sectionOf, SECTIONS, tabOf, tabRoot, TABS, type Section, type Tab } from "../routing";
import {
  BookmarkIcon,
  ChevronDownIcon,
  IdeasIcon,
  McpIcon,
  MenuIcon,
  RatingIcon,
  ResearchIcon,
  ReviewsIcon,
} from "../ui/icons";
import { Menu, type MenuItem } from "../ui/Menu";
import type { ShellStrings } from "./strings";

// The web-only sections — «Рейтинги», «Отзывы», «MCP» — next to the app's tabs. The app's
// only navigation is its tab bar (ClarityRoot.swift:58-75) with no second level, so the tab
// capsule stays the app's and the sections are a deliberately quiet second level:
// plain text links in secondary, the current one in ink — no accent, no pill, so nothing
// competes with the capsule's own selected look (spec §6 fallback, §10 Q14). Which of the first
// two shows is a container query on the logo column (site.css) — the capsule is centered, so
// the column is short on narrower desktops:
//   wide      SectionLinks: three text links beside the logo;
//   narrower  SectionsMenu: «Ещё разделы ⌄», the same quiet text with a chevron (ink 600 inside a
//             section; the label itself never changes, so the visible text is the name);
//   < 1024    MobileMenu: a ☰ button in the compact header with the tabs and the sections.
// In both menus the current tab / section is marked (aria-current, ink 600), like the links and
// like the selected item of the app's tab bar (ClarityFloatingTabBar.swift:69-70).

type IconType = ComponentType<{ size?: number; strokeWidth?: number; "aria-hidden"?: boolean }>;

// Rating = ListOrdered, not a star (R4: ★ appears only as a text glyph).
const SECTION_ICON: Record<Section, IconType> = { rating: RatingIcon, reviews: ReviewsIcon, mcp: McpIcon };
// The app tabs in the mobile menu (app strings, t()). Partial on purpose: a tab added to TABS
// without an entry here is simply left out of the menu instead of breaking the build.
const TAB_TITLE: Partial<Record<Tab, string>> = { research: "Разборы", ideas: "Идеи", saved: "Сохранённое" };
const TAB_ICON: Partial<Record<Tab, IconType>> = { research: ResearchIcon, ideas: IdeasIcon, saved: BookmarkIcon };

function sectionRoot(l: Locale, section: Section): string {
  return section === "rating" ? routes.rating(l) : section === "reviews" ? routes.reviews(l) : routes.mcp(l);
}

/** aria-current of a navigation item: "page" on the page it opens, "true" elsewhere inside it. */
function currentOf(pathname: string, href: string, on: boolean): "page" | "true" | undefined {
  if (!on) return undefined;
  return pathname === href ? "page" : "true";
}

function sectionItems(l: Locale, s: ShellStrings, pathname: string): MenuItem[] {
  const current = sectionOf(pathname);
  return SECTIONS.map((section) => {
    const Icon = SECTION_ICON[section];
    const href = sectionRoot(l, section);
    return { label: s[section], href, icon: <Icon size={17} strokeWidth={2} />, current: currentOf(pathname, href, current === section) };
  });
}

/** Wide desktop: the sections as quiet links beside the logo; the current one is ink 600. */
export function SectionLinks() {
  const pathname = usePathname();
  const locale = useLocale();
  const s = useWeb<ShellStrings>("shell");
  const current = sectionOf(pathname);
  return (
    <nav aria-label={s.sectionsNav} className="ia-secnav">
      <ul className="ia-secnav__list">
        {SECTIONS.map((section) => (
          <li key={section}>
            <Link
              href={sectionRoot(locale, section)}
              className="ia-secnav__link"
              aria-current={currentOf(pathname, sectionRoot(locale, section), current === section)}
            >
              {s[section]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Narrower desktop: the same links behind «Ещё разделы ⌄» (in ink 600 inside a section). */
export function SectionsMenu() {
  const pathname = usePathname();
  const locale = useLocale();
  const s = useWeb<ShellStrings>("shell");
  const current = sectionOf(pathname);
  return (
    <div className="ia-secnav-menu" data-current={current ? "" : undefined}>
      <Menu
        label={s.sectionsNav}
        align="start"
        items={sectionItems(locale, s, pathname)}
        triggerClassName="ia-secnav-menu__trigger"
        triggerLabel={s.sectionsMore}
        trigger={
          <>
            <span>{s.sectionsMore}</span>
            <ChevronDownIcon size={16} strokeWidth={2} aria-hidden="true" />
          </>
        }
      />
    </div>
  );
}

/** < 1024: ☰ in the compact header — the app's tabs, then the web-only sections. */
export function MobileMenu() {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useT();
  const s = useWeb<ShellStrings>("shell");
  const currentTab = tabOf(pathname);
  const tabs: MenuItem[] = TABS.flatMap((tab) => {
    const Icon = TAB_ICON[tab];
    if (!Icon || !TAB_TITLE[tab]) return [];
    const href = tabRoot(locale, tab);
    return [{ label: t(TAB_TITLE[tab]), href, icon: <Icon size={17} strokeWidth={2} />, current: currentOf(pathname, href, currentTab === tab) }];
  });
  return (
    <Menu
      label={s.menu}
      items={[...tabs, { type: "separator" }, ...sectionItems(locale, s, pathname)]}
      triggerClassName="ia-account-btn ia-menu-btn"
      trigger={<MenuIcon size={20} strokeWidth={2} aria-hidden="true" />}
    />
  );
}
