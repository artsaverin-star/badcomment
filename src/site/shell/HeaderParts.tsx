"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useT, useWeb } from "../i18n/client";
import { LOCALE_NAMES, LOCALES } from "../i18n/locales";
import { labelValue } from "../i18n/translate";
import { routes, switchLocaleHref } from "../routing";
import { AppMark, CheckIcon, GlobeIcon, SettingsIcon, SignOutIcon } from "../ui/icons";
import { Menu } from "../ui/Menu";
import { toast } from "../ui/Toast";
import { cx } from "../ui/cx";
import { openSignIn, signOut } from "./actions";
import type { ShellStrings } from "./strings";
import { useViewer } from "./ViewerContext";

// Pieces shared by the desktop top bar and the mobile compact header.

export function Logo({ className }: { className?: string }) {
  const locale = useLocale();
  const s = useWeb<ShellStrings>("shell");
  return (
    <Link href={routes.home(locale)} className={cx("ia-logo", className)} aria-label={s.home}>
      <span className="ia-logo__mark" aria-hidden="true">
        <AppMark size={28} />
      </span>
      <span className="ia-wordmark" aria-hidden="true">in<span className="ia-wordmark__app">App</span></span>
    </Link>
  );
}

/** The same page in another language (spec 09 G3): same path + query, full document load. */
export function useLocaleHref(): (next: (typeof LOCALES)[number]) => string {
  const pathname = usePathname();
  const search = useSearchParams()?.toString();
  return (next) => switchLocaleHref(`${pathname}${search ? `?${search}` : ""}`, next);
}

export function LanguageMenu({ direction = "down", align = "end" }: { direction?: "down" | "up"; align?: "start" | "end" }) {
  const locale = useLocale();
  const t = useT();
  const localeHref = useLocaleHref();
  const label = t("Язык");
  return (
    <Menu
      label={label}
      align={align}
      direction={direction}
      items={LOCALES.map((l) => ({
        label: LOCALE_NAMES[l],
        href: localeHref(l),
        external: true,
        checked: l === locale,
        lang: l,
        icon: l === locale ? <CheckIcon size={17} strokeWidth={2.4} /> : <span />,
      }))}
      triggerClassName="ia-account-btn"
      // The name starts with the visible "RU" (WCAG 2.5.3), then says what it is.
      triggerLabel={`${locale.toUpperCase()} — ${labelValue(locale, label, LOCALE_NAMES[locale])}`}
      trigger={
        <>
          <GlobeIcon size={17} strokeWidth={2} aria-hidden="true" />
          <span aria-hidden="true">{locale.toUpperCase()}</span>
        </>
      }
    />
  );
}

/**
 * «Войти» for guests (opens the sign-in dialog / page); for members an avatar with a small
 * menu: name + Plus status, «Настройки», «Выйти» (POST /api/auth/logout).
 */
export function AccountButton() {
  const viewer = useViewer();
  const locale = useLocale();
  const t = useT();
  const s = useWeb<ShellStrings>("shell");

  if (!viewer.loggedIn || !viewer.user) {
    return (
      <button type="button" className="ia-account-btn" onClick={() => openSignIn({ reason: "header" })}>
        {s.signIn}
      </button>
    );
  }

  // The app's own wording for the status (ui.<L>.json «Plus активен»).
  const heading = [viewer.user.name, viewer.plus ? t("Plus активен") : null].filter(Boolean).join(" · ");
  return (
    <Menu
      // The label row inside a role="menu" is skipped by screen readers: name the trigger and
      // the menu with the account holder and the Plus status instead.
      label={heading ? labelValue(locale, s.account, heading) : s.account}
      items={[
        ...(heading ? [{ type: "label" as const, label: heading }] : []),
        { label: t("Настройки"), href: routes.settings(locale), icon: <SettingsIcon size={17} strokeWidth={2} /> },
        // The admin panel is an old-site page served in place (ru/en only).
        ...(viewer.user.isAdmin
          ? [{ label: locale === "ru" ? "Админка" : "Admin", href: `/${locale === "ru" ? "ru" : "en"}/admin`, external: true, icon: <SettingsIcon size={17} strokeWidth={2} /> }]
          : []),
        { type: "separator" as const },
        {
          label: s.signOut,
          icon: <SignOutIcon size={17} strokeWidth={2} />,
          onSelect: () => {
            void signOut().then((ok) => {
              if (!ok) toast(s.signOutFailed, { tone: "error" });
            });
          },
        },
      ]}
      triggerClassName="ia-account-btn ia-account-btn--avatar"
      trigger={<span aria-hidden="true">{viewer.user.initial}</span>}
    />
  );
}
