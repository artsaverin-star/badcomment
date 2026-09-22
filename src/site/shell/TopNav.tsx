"use client";

import { useSyncExternalStore } from "react";
import { AppStoreBadge } from "../ui/AppStore";
import { AccountButton, LanguageMenu, Logo } from "./HeaderParts";
import { TabCapsule } from "./TabBar";

// Desktop (≥ 1024) sticky top bar (spec 05 §3.6 I, ARCHITECTURE §7): logo «inApp» · the
// three tabs with labels · App Store badge, language, account. Transparent at the top of
// the page; frosted paper once the page scrolls.

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function TopNav() {
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 4,
    () => false,
  );
  return (
    <header className="ia-topnav" data-scrolled={scrolled || undefined}>
      <div className="ia-topnav__inner">
        <div>
          <Logo />
        </div>
        <TabCapsule variant="top" />
        <div className="ia-topnav__end">
          <AppStoreBadge size="sm" eager />
          <LanguageMenu />
          <AccountButton />
        </div>
      </div>
    </header>
  );
}

/** Mobile (< 1024) compact header: logo + account. Scrolls away with the page. */
export function MobileHeader() {
  return (
    <header className="ia-mobile-header">
      <Logo />
      <AccountButton />
    </header>
  );
}
