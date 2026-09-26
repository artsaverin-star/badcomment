"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect, type ReactNode } from "react";
import type { ViewerSummary } from "../access";
import { useWeb } from "../i18n/client";
import { isTabRoot, parsePublicPath, sectionOf } from "../routing";
import { AppStoreDialogHost } from "../ui/AppStore";
import { ToastHost } from "../ui/Toast";
import { registerNavigator } from "./actions";
import { OpenInAppBanner } from "./OpenInAppBanner";
import { RouteObserver } from "./RouteObserver";
import type { ShellStrings } from "./strings";
import { FloatingTabBar } from "./TabBar";
import { MobileHeader, TopNav } from "./TopNav";
import { ViewerContext } from "./ViewerContext";

// The app frame around every new-site page. Which parts show is a pure function of the
// public path, so SSR and the client agree (no flash):
//   • all pages: desktop top bar (≥ 1024), "open in app" banner (< 1024), footer;
//   • the mobile compact header (< 1024) everywhere except pushed reading screens — a topic,
//     an idea, «О материалах»: like the app they have a single bar, the «Назад» toolbar
//     (spec 01 §1.3; ClarityReader.swift:193-195);
//   • the four tab roots (Разборы · Пульс · Идеи · Сохранённое): the mobile floating tab bar
//     (spec 01 §1.2);
//   • /<L>/welcome: nothing (full-screen onboarding replay).
// The web-only sections (rating, reviews, MCP) behave like a tab: the section root has the
// compact header, its inner pages are pushed screens with a «Назад» toolbar.
// `reading` marks the long-read pages (reading paper canvas) for the chrome's CSS.

export type ChromeParts = {
  banner: boolean;
  topNav: boolean;
  compactHeader: boolean;
  footer: boolean;
  tabBar: boolean;
  reading: boolean;
};

export function chromeFor(pathname: string | null | undefined): ChromeParts {
  const { segments } = parsePublicPath(pathname);
  const [first] = segments;
  if (first === "welcome") {
    return { banner: false, topNav: false, compactHeader: false, footer: false, tabBar: false, reading: false };
  }
  // /<L>/segment/<slug> and /<L>/ideas/<id> (the new site only renders launch topics/ideas).
  const methodology = first === "reviews" && segments[1] === "methodology";
  const reading = (segments.length === 2 && (first === "segment" || first === "ideas")) || methodology;
  const section = sectionOf(pathname) !== null && segments.length > 1;
  const pushed = reading || section || (segments.length === 2 && first === "settings" && segments[1] === "about");
  return { banner: true, topNav: true, compactHeader: !pushed, footer: true, tabBar: isTabRoot(pathname), reading };
}

export function ChromeFrame({
  viewer,
  appBannerDismissed,
  footer,
  children,
}: {
  viewer: ViewerSummary;
  appBannerDismissed: boolean;
  footer: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const s = useWeb<ShellStrings>("shell");
  const parts = chromeFor(pathname);

  useEffect(() => registerNavigator((href) => router.push(href)), [router]);

  return (
    <ViewerContext.Provider value={viewer}>
      <a href="#main" className="ia-skip-link">
        {s.skipToContent}
      </a>
      <div className="ia-frame" data-tabbar={parts.tabBar || undefined} data-reading={parts.reading || undefined}>
        {parts.banner ? <OpenInAppBanner initiallyDismissed={appBannerDismissed} /> : null}
        {parts.topNav ? <TopNav /> : null}
        {parts.compactHeader ? <MobileHeader /> : null}
        <main id="main" className="ia-main" tabIndex={-1}>
          {children}
        </main>
        {parts.footer ? footer : null}
      </div>
      {parts.tabBar ? <FloatingTabBar /> : null}
      <ToastHost />
      <AppStoreDialogHost />
      <Suspense fallback={null}>
        <RouteObserver />
      </Suspense>
    </ViewerContext.Provider>
  );
}
