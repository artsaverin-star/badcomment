"use client";

import { useState } from "react";
import { APP_STORE_URL } from "../config";
import { useWebStrings } from "../i18n/client";
import { openAppStoreDialog } from "../ui/AppStore";
import { AppMark, CloseIcon } from "../ui/icons";
import { uiStrings } from "../ui/strings";
import { APP_BANNER_COOKIE, APP_BANNER_DISMISS_DAYS } from "./constants";
import { shellStrings } from "./strings";

// Mobile "open in app" banner (DECISIONS §12). Hidden ≥ 1024 by CSS. Dismissal is kept in
// the `ia_app_banner` cookie so the server never renders it again (no flash, no layout shift).
// While the app is in review the CTA opens the "coming soon" dialog.

export function OpenInAppBanner({ initiallyDismissed }: { initiallyDismissed: boolean }) {
  const [dismissed, setDismissed] = useState(initiallyDismissed);
  const s = useWebStrings(shellStrings);
  const ui = useWebStrings(uiStrings);
  if (dismissed) return null;

  const dismiss = () => {
    document.cookie = `${APP_BANNER_COOKIE}=hidden; path=/; max-age=${APP_BANNER_DISMISS_DAYS * 86400}; samesite=lax`;
    setDismissed(true);
  };

  return (
    <aside className="ia-app-banner" aria-label={ui.appStoreDialogTitle}>
      <span className="ia-app-banner__mark" aria-hidden="true">
        <AppMark size={40} />
      </span>
      <span className="ia-app-banner__text">
        <span className="ia-app-banner__title">{ui.appStoreDialogTitle}</span>
        <span className="ia-app-banner__sub">{APP_STORE_URL ? s.bannerSubLive : ui.appStoreSoon}</span>
      </span>
      {APP_STORE_URL ? (
        <a className="ia-btn ia-btn--secondary ia-btn--sm" href={APP_STORE_URL} target="_blank" rel="noopener noreferrer">
          {s.bannerCtaLive}
        </a>
      ) : (
        <button type="button" className="ia-btn ia-btn--secondary ia-btn--sm" aria-haspopup="dialog" onClick={openAppStoreDialog}>
          {s.bannerCtaSoon}
        </button>
      )}
      <button type="button" className="ia-icon-btn ia-icon-btn--plain" aria-label={s.bannerDismiss} onClick={dismiss}>
        <CloseIcon size={18} strokeWidth={2} className="text-ia-secondary" aria-hidden="true" />
      </button>
    </aside>
  );
}
