"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useT } from "../../i18n/client";
import { parsePublicPath } from "../../routing";
import { registerPaywallHandler } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { Sheet, SheetAction } from "../../ui/Sheet";
import { SkeletonText } from "../../ui/Skeleton";
import { clearResume, peekResume, type PlusOfferData } from "./offer";
import { PlusOffer } from "./PlusOffer";

// The global Plus paywall sheet (spec 03 §2.1: a modal sheet over the current page — bottom
// sheet on mobile, centered 440+48 modal on desktop), mounted once in the new root layout.
//   • openPaywall({source}) from anywhere (locked idea cards, research gates, settings, …);
//   • reopens after sign-in when a purchase was interrupted by it (Google / e-mail come back
//     with a full page load; Telegram refreshes the tree) — PlusOffer then shows the method step;
//   • closes itself once Plus becomes active after the user asked for it (spec 03 §2.4: no
//     success screen), and re-checks /api/me when the tab comes back (paid in another tab).
// On /<L>/plus the page itself is the paywall, so the sheet stays closed there.
// The offer (price label, benefits) is fetched from /api/site/plus/offer the first time the
// sheet opens, so pages without buy UI (landing, /offer, /contacts) carry no web price.

type Open = { source: string; requested: boolean };

function onPlusPage(pathname: string | null): boolean {
  return parsePublicPath(pathname).segments[0] === "plus";
}

// Never pop the paywall by itself on the Apple-facing legal pages (DECISIONS "Legal pages":
// no prices or buy UI on /offer and /contacts), on sign-in or on the payment return.
const NO_AUTO_OPEN = new Set(["offer", "contacts", "privacy", "login", "library", "welcome"]);

export function PaywallHost() {
  const t = useT();
  const locale = useLocale();
  const [offer, setOffer] = useState<{ locale: string; data: PlusOfferData } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const viewer = useViewer();
  const [open, setOpen] = useState<Open | null>(null);
  const openedAt = useRef<string | null>(null);

  const show = useCallback((source: string) => {
    if (onPlusPage(window.location.pathname)) return;
    openedAt.current = window.location.pathname;
    setOpen((cur) => cur ?? { source, requested: false });
  }, []);

  useEffect(() => registerPaywallHandler((req) => show(req.source)), [show]);

  // Closing by hand drops an unfinished purchase intent (it must not pop up again later).
  const close = useCallback(() => {
    clearResume();
    setOpen(null);
  }, []);
  const markRequested = useCallback(() => setOpen((cur) => (cur && !cur.requested ? { ...cur, requested: true } : cur)), []);

  // A purchase interrupted by sign-in: reopen once the viewer is signed in.
  useEffect(() => {
    if (!viewer.loggedIn || viewer.plus) return;
    const timer = window.setTimeout(() => {
      const resume = peekResume();
      const [first] = parsePublicPath(window.location.pathname).segments;
      if (resume && !NO_AUTO_OPEN.has(first ?? "")) show(resume.source);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewer.loggedIn, viewer.plus, show]);

  // Access became active after the user asked for it → close (no success screen).
  useEffect(() => {
    if (!open?.requested || !viewer.plus) return;
    const timer = window.setTimeout(() => setOpen(null), 0);
    return () => window.clearTimeout(timer);
  }, [open?.requested, viewer.plus]);

  // Any navigation (legal links, cards behind a desktop modal) closes the sheet.
  useEffect(() => {
    if (!open || openedAt.current === null) return;
    if (window.location.pathname !== openedAt.current) {
      const timer = window.setTimeout(() => setOpen(null), 0);
      return () => window.clearTimeout(timer);
    }
  }, [pathname, open]);

  // Paid in another tab / on another device: re-check when this tab becomes visible again.
  const signedIn = viewer.loggedIn;
  const isOpen = open !== null;

  // Load the localized offer on first open (kept for the rest of the visit).
  const haveOffer = offer?.locale === locale;
  useEffect(() => {
    if (!isOpen || haveOffer) return;
    let cancelled = false;
    fetch(`/api/site/plus/offer?lang=${locale}`)
      .then((res) => (res.ok ? (res.json() as Promise<PlusOfferData>) : null))
      .then((data) => {
        if (!cancelled && data) setOffer({ locale, data });
      })
      .catch(() => {
        /* offline: the sheet keeps its placeholder; reopening retries */
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, haveOffer, locale]);
  useEffect(() => {
    if (!isOpen || !signedIn || viewer.plus) return;
    let cancelled = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const me = (await res.json().catch(() => ({}))) as { unlimited?: boolean };
        if (!cancelled && me.unlimited) {
          setOpen((cur) => (cur ? { ...cur, requested: true } : cur));
          router.refresh();
        }
      } catch {
        /* offline: try again next time */
      }
    };
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [isOpen, signedIn, viewer.plus, router]);

  return (
    <Sheet
      open={isOpen}
      onClose={close}
      size="paywall"
      label={t("Полный доступ")}
      trailing={
        <SheetAction id="paywall-close" onClick={close}>
          {t("Закрыть")}
        </SheetAction>
      }
    >
      {open && offer && haveOffer ? (
        <PlusOffer offer={offer.data} source={open.source} variant="sheet" onClose={close} onRequested={markRequested} />
      ) : open ? (
        <div className="p-6" aria-busy="true">
          <SkeletonText lines={6} />
        </div>
      ) : null}
    </Sheet>
  );
}
