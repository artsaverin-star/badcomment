"use client";

import { useEffect, useState } from "react";
import { APP_STORE_BADGE_SRC, APP_STORE_URL } from "../config";
import { useWebStrings } from "../i18n/client";
import { AppMark } from "./icons";
import { Button } from "./Button";
import { cx } from "./cx";
import { Sheet } from "./Sheet";
import { uiStrings } from "./strings";

// "Download on the App Store" everywhere (DECISIONS §12–13).
// While APP_STORE_URL (src/site/config.ts) is empty the app is in review: the badge opens
// a dialog «Приложение проходит проверку Apple…» with «Продолжить на сайте». Once the owner
// pastes the URL, every badge becomes a plain link — no other change needed.
// The badge art is the official black badge (public/badges/app-store.svg); its accessible
// name is localized.

const listeners = new Set<() => void>();

/** Opens the "in review" dialog (no-op when the shell's host is not mounted). */
export function openAppStoreDialog(): void {
  listeners.forEach((l) => l());
}

export function AppStoreBadge({
  size = "md",
  className,
  onOpen,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Analytics hook: called on click (link or dialog). */
  onOpen?: () => void;
}) {
  const s = useWebStrings(uiStrings);
  const cls = cx("ia-appstore-badge", size !== "md" && `ia-appstore-badge--${size}`, className);
  // eslint-disable-next-line @next/next/no-img-element -- static SVG badge, no optimization needed
  const art = <img src={APP_STORE_BADGE_SRC} alt={s.appStoreBadge} width={120} height={40} decoding="async" />;
  if (APP_STORE_URL) {
    return (
      <a href={APP_STORE_URL} className={cls} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
        {art}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      aria-haspopup="dialog"
      onClick={() => {
        onOpen?.();
        openAppStoreDialog();
      }}
    >
      {art}
    </button>
  );
}

/** Mounted once by the shell. */
export function AppStoreDialogHost() {
  const s = useWebStrings(uiStrings);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    listeners.add(onOpen);
    return () => {
      listeners.delete(onOpen);
    };
  }, []);

  return (
    <Sheet open={open} onClose={() => setOpen(false)} variant="dialog" label={s.appStoreDialogTitle}>
      <div className="flex flex-col items-center gap-5 pt-7 pb-1 text-center">
        <span className="block overflow-hidden rounded-[22%]" style={{ width: 72, height: 72 }}>
          <AppMark size={72} />
        </span>
        <div className="flex flex-col gap-2.5">
          <h2 className="ia-section-title">{s.appStoreDialogTitle}</h2>
          <p className="m-0 text-ia-body leading-[var(--ia-lh-body-relaxed)] text-ia-secondary">
            {s.appStoreDialogBody}
          </p>
        </div>
        <Button variant="primary" onClick={() => setOpen(false)} autoFocus>
          {s.appStoreDialogContinue}
        </Button>
      </div>
    </Sheet>
  );
}
