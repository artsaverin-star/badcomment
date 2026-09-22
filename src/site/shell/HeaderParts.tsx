"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLocale, useT, useWebStrings } from "../i18n/client";
import { LOCALE_NAMES, LOCALES } from "../i18n/locales";
import { routes, switchLocaleHref } from "../routing";
import { AppMark, CheckIcon, GlobeIcon, SettingsIcon, SignOutIcon } from "../ui/icons";
import { Menu } from "../ui/Menu";
import { toast } from "../ui/Toast";
import { cx } from "../ui/cx";
import { openSignIn, signOut } from "./actions";
import { shellStrings } from "./strings";
import { useViewer } from "./ViewerContext";

// Pieces shared by the desktop top bar and the mobile compact header.

export function Logo({ className }: { className?: string }) {
  const locale = useLocale();
  const s = useWebStrings(shellStrings);
  return (
    <Link href={routes.home(locale)} className={cx("ia-logo", className)} aria-label={s.home}>
      <span className="ia-logo__mark" aria-hidden="true">
        <AppMark size={28} />
      </span>
      <span aria-hidden="true">inApp</span>
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
      triggerLabel={`${label}: ${LOCALE_NAMES[locale]}`}
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
  const s = useWebStrings(shellStrings);

  if (!viewer.loggedIn || !viewer.user) {
    return (
      <button type="button" className="ia-account-btn" onClick={() => openSignIn({ reason: "header" })}>
        {s.signIn}
      </button>
    );
  }

  const heading = [viewer.user.name, viewer.plus ? s.plusActive : null].filter(Boolean).join(" · ");
  return (
    <Menu
      label={s.account}
      items={[
        ...(heading ? [{ type: "label" as const, label: heading }] : []),
        { label: t("Настройки"), href: routes.settings(locale), icon: <SettingsIcon size={17} strokeWidth={2} /> },
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
