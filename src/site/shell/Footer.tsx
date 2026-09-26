import Link from "next/link";
import { Suspense } from "react";
import { COPYRIGHT_YEAR, SUPPORT_EMAIL } from "../config";
import type { Locale } from "../i18n/locales";
import { getT } from "../i18n/server";
import { routes } from "../routing";
import { AppStoreBadge } from "../ui/AppStore";
import { AppMark } from "../ui/icons";
import { FooterLanguages } from "./FooterLanguages";
import { FooterOldSiteLink, FooterPaymentOfferLink, FooterPlusLink } from "./FooterPlusLink";
import { shellStrings } from "./strings";

// Footer on every page (DECISIONS §8, spec 08 S13): sections, contacts, terms, privacy,
// «Старая версия сайта» (the only navigation link into the archive), language picker,
// App Store badge (with a localized caption: the badge artwork is English), © line.

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getT(locale);
  const s = shellStrings[locale];
  return (
    <footer className="ia-footer">
      <div className="ia-footer__inner">
        <div className="ia-footer__brand">
          <Link href={routes.home(locale)} className="ia-logo" aria-label={s.home}>
            <span className="ia-logo__mark" aria-hidden="true">
              <AppMark size={28} />
            </span>
            <span className="ia-wordmark" aria-hidden="true">in<span className="ia-wordmark__app">App</span></span>
          </Link>
          <p className="m-0 max-w-[34ch] text-ia-secondary">{t("Что людям важно в приложениях и чего им не хватает.")}</p>
          <AppStoreBadge caption />
        </div>

        <nav aria-label={s.footerNav}>
          <ul className="ia-footer__links">
            <li>
              <Link href={routes.research(locale)}>{t("Разборы")}</Link>
            </li>
            <li>
              <Link href={routes.ideas(locale)}>{t("Идеи")}</Link>
            </li>
            <li>
              <Link href={routes.pulse(locale)}>{s.pulse}</Link>
            </li>
            {/* The web-only sections (./SectionNav.tsx). */}
            <li>
              <Link href={routes.rating(locale)}>{s.rating}</Link>
            </li>
            <li>
              <Link href={routes.reviews(locale)}>{s.reviews}</Link>
            </li>
            <li>
              <Link href={routes.mcp(locale)}>{s.mcp}</Link>
            </li>
            <FooterPlusLink locale={locale} />
          </ul>
        </nav>

        <ul className="ia-footer__links">
          <li>
            <Link href={routes.contacts(locale)}>{t("Написать разработчику")}</Link>
          </li>
          <li>
            <Link href={routes.offer(locale)}>{t("Условия использования")}</Link>
          </li>
          <FooterPaymentOfferLink locale={locale} label={s.paymentOffer} />
          <li>
            <Link href={routes.privacy(locale)}>{t("Конфиденциальность")}</Link>
          </li>
          {/* Hidden on the Apple-facing /offer and /contacts (./FooterPlusLink.tsx). */}
          <FooterOldSiteLink href={routes.oldSite(locale)} label={s.oldSite} />
        </ul>

        <div className="ia-footer__bottom">
          <Suspense fallback={null}>
            <FooterLanguages label={t("Язык")} />
          </Suspense>
          <span className="inline-flex flex-wrap items-center gap-x-3">
            <span>© {COPYRIGHT_YEAR} inApp</span>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-ia-accent">
              {SUPPORT_EMAIL}
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
