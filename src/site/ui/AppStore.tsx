"use client";

import { useEffect, useState } from "react";
import { APP_STORE_BADGE_LOCALIZED, APP_STORE_BADGE_SRC, APP_STORE_URL } from "../config";
import { useLocale, useWeb } from "../i18n/client";
import type { Locale } from "../i18n/locales";
import { AppMark } from "./icons";
import { Button } from "./Button";
import { cx } from "./cx";
import { Sheet } from "./Sheet";
import type { UiStrings } from "./strings";

// "Download on the App Store" everywhere (DECISIONS §12–13).
// While APP_STORE_URL (src/site/config.ts) is empty the app is in review: the badge opens
// a dialog «Приложение проходит проверку Apple…» with «Продолжить на сайте». Once the owner
// pastes the URL, every badge becomes a plain link — no other change needed.
//
// The badge art is Apple's official black badge. Localized artwork is picked per locale from
// APP_STORE_BADGE_LOCALIZED (src/site/config.ts) once it is added; until then every locale
// shows the US-English art (public/badges/app-store.svg), so in ru/de/fr/ja:
//   • the accessible name is the localized wording followed by the text printed on the art
//     («Загрузите в App Store (Download on the App Store)»), so speech-input users can say
//     what they see (WCAG 2.5.3) and screen-reader users hear their language;
//   • `caption` adds a small localized line under the badge: «Скоро в App Store» while the app
//     is in review, the localized badge wording once it is live (nothing in en when live).
// Not preloaded (performance review P10): lazy by default; `eager` (top bar) loads it at low
// priority without React's <link rel="preload">.

/** The text printed on the badge artwork. */
const BADGE_ART_TEXT = "Download on the App Store";

const listeners = new Set<() => void>();

/** Opens the "in review" dialog (no-op when the shell's host is not mounted). */
export function openAppStoreDialog(): void {
  listeners.forEach((l) => l());
}

/** Localized wording + the English text printed on the art. */
function badgeName(locale: Locale, localized: string): string {
  return locale === "ja" ? `${localized}（${BADGE_ART_TEXT}）` : `${localized} (${BADGE_ART_TEXT})`;
}

export function AppStoreBadge({
  size = "md",
  className,
  onOpen,
  eager,
  caption,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  /** Analytics hook: called on click (link or dialog). */
  onOpen?: () => void;
  /** Above the fold (the desktop top bar): load right away, at low priority. */
  eager?: boolean;
  /** Show a small localized caption under the badge (see the header comment). */
  caption?: boolean;
}) {
  const s = useWeb<UiStrings>("ui");
  const locale = useLocale();
  const localizedArt = APP_STORE_BADGE_LOCALIZED[locale];
  // With the locale's own artwork the art already says the localized wording.
  const artIsEnglish = !localizedArt && locale !== "en";
  const captionText = !caption ? null : APP_STORE_URL ? (artIsEnglish ? s.appStoreBadge : null) : s.appStoreSoon;
  const cls = cx("ia-appstore-badge", size !== "md" && `ia-appstore-badge--${size}`, !captionText && className);
  const art = (
    // eslint-disable-next-line @next/next/no-img-element -- static SVG badge, no optimization needed
    <img
      src={localizedArt ?? APP_STORE_BADGE_SRC}
      alt={artIsEnglish ? badgeName(locale, s.appStoreBadge) : locale === "en" ? BADGE_ART_TEXT : s.appStoreBadge}
      width={120}
      height={40}
      decoding="async"
      loading={eager ? undefined : "lazy"}
      fetchPriority={eager ? "low" : undefined}
    />
  );
  const control = APP_STORE_URL ? (
    <a href={APP_STORE_URL} className={cls} target="_blank" rel="noopener noreferrer" onClick={onOpen}>
      {art}
    </a>
  ) : (
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
  if (!captionText) return control;
  return (
    <span className={cx("ia-appstore-badge-wrap", className)}>
      {control}
      <span className="ia-appstore-badge__caption">{captionText}</span>
    </span>
  );
}

/** Mounted once by the shell. */
export function AppStoreDialogHost() {
  const s = useWeb<UiStrings>("ui");
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
