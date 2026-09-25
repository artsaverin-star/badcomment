import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewer } from "@/site/access";
import { I18nProvider } from "@/site/i18n/client";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/site/i18n/locales";
import type { T } from "@/site/i18n/translate";
import { routes, switchLocaleHref } from "@/site/routing";
import { shellStrings } from "@/site/shell/strings";
import type { Theme } from "@/site/theme";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { BackButton } from "@/site/ui/Toolbar";
import {
  AboutIcon,
  ChevronRightIcon,
  DocumentIcon,
  ExternalIcon,
  MailIcon,
  OldSiteIcon,
  PaymentOfferIcon,
  PhoneIcon,
  PrivacyIcon,
  RadioOffIcon,
  WelcomeIcon,
} from "@/site/ui/icons";
import { CheckCircleFill } from "./CheckCircleFill";
import { AccountRows, ThemePicker } from "./client";
import { AppAccessCard } from "@/site/features/plus/AppAccessCard";
import { PlusCard } from "@/site/features/plus/PlusCard";
import { SETTINGS_CLIENT_KEYS } from "./keys";
import { formatCollectionDate } from "./format";
import { settingsStrings } from "./strings";
import "./settings.css";

// Settings (spec 02 §8) as a page: Plus card → account/restore → «Язык» → «Оформление» →
// «Приложение» → «Правовая информация» → footer. Server-rendered; only the Plus card, the
// account rows and the theme picker are client components.

// Row glyphs: SF 19 pt in a 24-wide column (ClaritySettings.swift:323).
const ICON = { size: 19, strokeWidth: 2 } as const;

function Trail({ kind }: { kind: "chevron" | "external" }) {
  return kind === "chevron" ? (
    <ChevronRightIcon size={16} strokeWidth={2.4} aria-hidden="true" />
  ) : (
    <ExternalIcon size={17} strokeWidth={2.2} aria-hidden="true" />
  );
}

function RowBody({ icon, title, sub, trail }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; trail?: ReactNode }) {
  return (
    <>
      <span className="ia-set-row__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="ia-set-row__text">
        <span className="ia-set-row__title">{title}</span>
        {sub ? <span className="ia-set-row__sub">{sub}</span> : null}
      </span>
      {trail ? <span className="ia-set-row__trail">{trail}</span> : null}
    </>
  );
}

/** Internal page row (next/link, chevron) or a document-level link (<a>, e.g. the old site). */
function LinkRow({
  href,
  icon,
  title,
  sub,
  external,
}: {
  href: string;
  icon: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  /** Other root layout / other site: plain <a> with the arrow glyph. */
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} className="ia-set-row">
        <RowBody icon={icon} title={title} sub={sub} trail={<Trail kind="external" />} />
      </a>
    );
  }
  return (
    <Link href={href} className="ia-set-row">
      <RowBody icon={icon} title={title} sub={sub} trail={<Trail kind="chevron" />} />
    </Link>
  );
}

function Group({ id, title, children }: { id: string; title?: string; children: ReactNode }) {
  return (
    <section className="ia-set-group" aria-labelledby={title ? id : undefined}>
      {title ? (
        <h2 className="ia-set-group__title" id={id}>
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function SettingsScreen({
  locale,
  t,
  viewer,
  theme,
  collectionDate,
  plusArt,
}: {
  locale: Locale;
  t: T;
  viewer: Viewer;
  theme: Theme;
  collectionDate: string;
  plusArt: { src: string; srcSet: string } | null;
}) {
  const s = settingsStrings[locale];
  const here = routes.settings(locale);

  return (
    <I18nProvider locale={locale} strings={t.pick(SETTINGS_CLIENT_KEYS)}>
      <div className="ia-page ia-page--library ia-set">
        <header className="ia-set-header">
          <h1 className="ia-set-header__title">{t("Настройки")}</h1>
          <BackButton label={t("Готово")} fallbackHref={routes.saved(locale)} className="ia-set-done" />
        </header>

        {/* Plus card + account box: VStack(spacing: 12) (ClaritySettings.swift:200). */}
        <div className="ia-set-access">
          <PlusCard
            // The app joins the two lines with a space; Japanese takes none («すべての分析とアイデア»).
            title={t("Все разборы\nи идеи").replace(/\n/g, locale === "ja" ? "" : " ")}
            body={t("Подробные исследования, идеи приложений и экспорт материалов.")}
            source="settings"
            art={plusArt}
            caption="account"
          />
          {viewer.plus ? <AppAccessCard locale={locale} /> : null}
          <AccountRows />
        </div>

        <Group id="settings-language" title={t("Язык")}>
          <div className="ia-set-box">
            {LOCALES.map((l) => (
              // A different locale re-renders the whole document: plain <a> (spec 09 G3: same place).
              <a
                key={l}
                href={switchLocaleHref(here, l)}
                hrefLang={l}
                lang={l}
                className="ia-set-row ia-set-row--lang"
                aria-current={l === locale ? "true" : undefined}
              >
                <span className="ia-set-row__text">
                  <span className="ia-set-row__title">{LOCALE_NAMES[l]}</span>
                </span>
                <span className={`ia-set-row__trail${l === locale ? " ia-set-row__radio-on" : ""}`} aria-hidden="true">
                  {l === locale ? <CheckCircleFill /> : <RadioOffIcon size={18} strokeWidth={2} />}
                </span>
              </a>
            ))}
          </div>
        </Group>

        <Group id="settings-appearance" title={t("Оформление")}>
          <ThemePicker initial={theme} />
        </Group>

        <Group id="settings-app" title={t("Приложение")}>
          <div className="ia-set-box">
            <LinkRow href={routes.settingsAbout(locale)} icon={<AboutIcon {...ICON} />} title={t("О материалах")} />
            <LinkRow href={routes.welcome(locale)} icon={<WelcomeIcon {...ICON} />} title={t("Знакомство с приложением")} />
            <LinkRow href={routes.contacts(locale)} icon={<MailIcon {...ICON} />} title={t("Написать разработчику")} />
            <div className="ia-set-row">
              <RowBody icon={<PhoneIcon {...ICON} />} title={s.iphoneApp} trail={<AppStoreBadge size="sm" />} />
            </div>
            <LinkRow href={routes.oldSite(locale)} icon={<OldSiteIcon {...ICON} />} title={shellStrings[locale].oldSite} external />
          </div>
        </Group>

        <Group id="settings-legal" title={t("Правовая информация")}>
          <div className="ia-set-box">
            <LinkRow href={routes.privacy(locale)} icon={<PrivacyIcon {...ICON} />} title={t("Конфиденциальность")} />
            <LinkRow href={routes.offer(locale)} icon={<DocumentIcon {...ICON} />} title={t("Условия использования")} />
            <LinkRow href={`${routes.offer(locale)}/payment`} icon={<PaymentOfferIcon {...ICON} />} title={s.paymentOffer} />
          </div>
        </Group>

        <footer className="ia-set-footer">
          <p className="ia-set-footer__line1">
            inApp · {t("Сборник от %1$@", [formatCollectionDate(collectionDate, locale)])}
          </p>
          <p className="ia-set-footer__line2">{viewer.loggedIn ? s.storedAccount : s.storedBrowser}</p>
        </footer>
      </div>
    </I18nProvider>
  );
}
