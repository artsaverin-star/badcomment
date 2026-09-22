"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type Ref } from "react";
import { createPortal } from "react-dom";
import {
  trackAddPaymentInfo,
  trackBeginCheckout,
  trackLoginRequired,
  trackOfferOpen,
  trackPaymentError,
  trackPaymentRedirect,
  trackPaywallView,
} from "@/lib/track";
import { MEDIA_BASE } from "../../content/media";
import { useLocale, useT, useWeb } from "../../i18n/client";
import { href, routes } from "../../routing";
import { openSignIn } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { AppStoreBadge } from "../../ui/AppStore";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import {
  checkoutSource,
  clearResume,
  peekResume,
  PLUS_ITEM,
  PLUS_KIND,
  saveResume,
  type PayMethod,
  type PlusOfferData,
} from "./offer";
import type { PlusStrings } from "./strings";
import "./plus.css";

// The web Plus paywall (spec 03 §2 adapted per §2.7 and DECISIONS §10), laid out like
// ClarityPaywallView: artwork → «Полный доступ» → description → [plan row · status lines ·
// legal row] in the scrolling content, and the footer (disclosure → primary capsule →
// «Остаться с бесплатным разбором») pinned below it (ClarityWelcomeFooter sits outside the
// ScrollView). One component for three places:
//   page     /<L>/plus — the footer sticks to the bottom of the viewport;
//   sheet    the global paywall sheet (PaywallHost) — the footer sticks to the sheet bottom;
//   welcome  the replay's last page (WelcomeFlow) — the footer is portalled into the replay's
//            own pinned footer, under the same nav bar with back and dot 5/5 (the app's step 4).
// Web deltas: ONE plan (the app's «Навсегда» row = the YooKassa lifetime SKU at
// ACCESS_PRICE_RUB), a payment-method step (bank card / SBP), the sign-in and YooKassa notes,
// web legal links (payment offer, terms, privacy, support) and the App Store note with the badge.
//
// Primary button state machine (web):
//   plus                     → «Открыть библиотеку» (close / go to the research catalog)
//   guest                    → «Купить навсегда» → sign-in (intent kept, resumed after it)
//   signed in                → «Купить навсегда» → method choice → POST /api/pay/yookassa
//                              {kind:"lifetime", method, source:"v2_<surface>"} → YooKassa
// Analytics mirror the old BuyButton exactly (src/lib/track.ts), with source "v2_<surface>".
// Strings: the page locale's plusStrings row (useWeb("plus")), handed down by the server or by
// the sheet's offer fetch; app keys from PLUS_UI_KEYS.

type Props = {
  offer: PlusOfferData;
  /** Analytics surface without the "v2_" prefix, e.g. "idea_card", "plus_page". */
  source: string;
  variant: "page" | "sheet" | "welcome";
  /** Sheet / welcome: close the paywall (the replay). */
  onClose?: () => void;
  /** The user asked for access (CTA or a resumed purchase): the host may auto-close on success. */
  onRequested?: () => void;
  /** Welcome: the replay's pinned footer; the paywall footer renders into it (null until mounted). */
  footerTarget?: HTMLElement | null;
  /** Welcome: the replay moves focus to the page heading on every step change. */
  titleRef?: Ref<HTMLHeadingElement>;
};

/** Three library objects fly into place, then float (ClarityPaywall.swift:151-189). */
function PlusArt() {
  const layer = (name: string, cls: string) => (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP artwork (spec 04 §6.3)
    <img
      className={`ia-plus__art-layer ia-plus__art-layer--${cls}`}
      src={`${MEDIA_BASE}/welcome/${name}-400.webp`}
      srcSet={`${MEDIA_BASE}/welcome/${name}-400.webp 400w, ${MEDIA_BASE}/welcome/${name}-800.webp 800w`}
      sizes="(min-width: 760px) 360px, 80vw"
      width={400}
      height={400}
      alt=""
      decoding="async"
    />
  );
  return (
    <div className="ia-plus__art" aria-hidden="true">
      {layer("WelcomeResearch_v7", "left")}
      {layer("WelcomeProduct_v7", "right")}
      {layer("WelcomeLibrary_v7", "center")}
    </div>
  );
}

/** SF `largecircle.fill.circle`, 21 pt: a ring with a filled centre (ClarityPaywall.swift:110). */
function RadioOn() {
  return (
    <svg className="ia-plus__plan-radio" width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="5.5" fill="currentColor" />
    </svg>
  );
}

export function PlusOffer({ offer, source, variant, onClose, onRequested, footerTarget, titleRef }: Props) {
  const t = useT();
  const s = useWeb<PlusStrings>("plus");
  const locale = useLocale();
  const viewer = useViewer();
  const router = useRouter();
  const methodTitleId = useId();
  const methodTitle = useRef<HTMLParagraphElement>(null);

  const src = checkoutSource(source);
  const plus = viewer.plus;
  const [step, setStep] = useState<"offer" | "method">("offer");
  const [busy, setBusy] = useState<PayMethod | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!plus) trackPaywallView(src, offer.priceRub);
  }, [src, plus, offer.priceRub]);

  // Resume a purchase that was interrupted by sign-in (Telegram refresh, Google/e-mail return).
  useEffect(() => {
    if (!viewer.loggedIn || plus || !peekResume()) return;
    const timer = window.setTimeout(() => {
      if (!peekResume()) return;
      clearResume();
      onRequested?.();
      trackBeginCheckout(PLUS_ITEM, src);
      setStep("method");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [viewer.loggedIn, plus, src, onRequested]);

  // «Купить навсегда» is replaced by the method choice: keep focus with it (a11y review m18).
  useEffect(() => {
    if (step === "method") methodTitle.current?.focus({ preventScroll: true });
  }, [step]);

  function askSignIn() {
    trackLoginRequired(src);
    saveResume(source);
    openSignIn({ reason: "plus" });
  }

  function primary() {
    setError(null);
    onRequested?.();
    trackOfferOpen(src, viewer.loggedIn, offer.priceRub);
    if (!viewer.loggedIn) {
      askSignIn();
      return;
    }
    trackBeginCheckout(PLUS_ITEM, src);
    setStep("method");
  }

  async function pay(method: PayMethod) {
    if (busy) return;
    trackAddPaymentInfo(PLUS_ITEM, method, src);
    setBusy(method);
    setError(null);
    try {
      const res = await fetch("/api/pay/yookassa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: PLUS_KIND, method, source: src }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (res.ok && data.url) {
        trackPaymentRedirect(src, method, offer.priceRub);
        window.location.assign(data.url);
        return; // stay busy until the browser leaves for YooKassa
      }
      trackPaymentError(src, method, res.ok ? "missing_url" : `http_${res.status}`);
      if (res.status === 401) {
        setStep("offer");
        askSignIn();
      } else if (res.status === 409) {
        setError(s.errAlreadyActive);
        router.refresh();
      } else if (res.status === 503) {
        setError(s.errUnavailable);
      } else {
        setError(s.errFailed);
      }
    } catch {
      trackPaymentError(src, method, "network");
      setError(s.errNetwork);
    }
    setBusy(null);
  }

  const Title = variant === "sheet" ? "h2" : "h1";
  const toLibrary = variant !== "sheet";

  const primaryControl = plus ? (
    toLibrary ? (
      <Button variant="welcome" id="purchase-done" href={routes.research(locale)}>
        {t("Открыть библиотеку")}
      </Button>
    ) : (
      <Button variant="welcome" id="purchase-done" onClick={onClose}>
        {t("Открыть библиотеку")}
      </Button>
    )
  ) : step === "method" && viewer.loggedIn ? (
    <div className="ia-plus__methods" role="group" aria-labelledby={methodTitleId}>
      <p className="ia-plus__methods-title" id={methodTitleId} ref={methodTitle} tabIndex={-1}>
        {s.methodTitle}
      </p>
      <Button
        variant="welcome"
        block
        id="purchase-bank-card"
        busy={busy === "bank_card"}
        disabled={!!busy}
        onClick={() => void pay("bank_card")}
      >
        {s.methodCard}
      </Button>
      <Button
        variant="secondary"
        block
        className="ia-plus__method-alt"
        id="purchase-sbp"
        busy={busy === "sbp"}
        disabled={!!busy}
        onClick={() => void pay("sbp")}
      >
        {s.methodSbp}
      </Button>
      <button type="button" className="ia-plus__secondary" disabled={!!busy} onClick={() => setStep("offer")}>
        {t("Назад")}
      </button>
    </div>
  ) : (
    <Button variant="welcome" id="purchase-access" onClick={primary}>
      {t("Купить навсегда")}
    </Button>
  );

  // The app's secondary row: «Остаться с бесплатным разбором» / «Закрыть» once unlocked.
  const secondaryControl =
    variant === "sheet" || (plus && onClose) ? (
      <button type="button" className="ia-plus__secondary" id="paywall-free" onClick={onClose}>
        {plus ? t("Закрыть") : t("Остаться с бесплатным разбором")}
      </button>
    ) : !plus ? (
      <Link className="ia-plus__secondary" id="paywall-free" href={offer.freeTopicHref}>
        {t("Остаться с бесплатным разбором")}
      </Link>
    ) : null;

  const footer = (
    <div className={cx("ia-plus__footer", variant === "welcome" && "ia-plus__footer--slot")}>
      {!plus ? (
        <p className="ia-plus__disclosure" id="paywall-lifetime-price">
          <strong>{t("%1$@ один раз", [offer.priceLabel])}</strong>
          <span>{t("Пожизненный доступ. Без подписки.")}</span>
        </p>
      ) : null}
      {primaryControl}
      {secondaryControl}
    </div>
  );

  return (
    <div className={cx("ia-plus", `ia-plus--${variant}`)}>
      <PlusArt />

      <div className="ia-plus__head">
        <Title
          id="paywall-heading"
          ref={titleRef}
          tabIndex={titleRef ? -1 : undefined}
          className="ia-plus__title"
        >
          {plus ? t("Доступ открыт") : t("Полный доступ")}
        </Title>
        <p className="ia-plus__lead">{t("Все разборы и идеи, новые выпуски и экспорт материалов.")}</p>
      </div>

      {/* ClarityPaywall.swift:51-55: plans, status lines and the legal row, 12 apart. */}
      <div className="ia-plus__group">
        {!plus ? (
          <div className="ia-plus__plan" id="paywall-plan-lifetime" data-selected="true">
            <RadioOn />
            <span className="ia-plus__plan-text">
              <span className="ia-plus__plan-title">{t("Навсегда")}</span>
              <span className="ia-plus__plan-detail">{t("Один платёж. Без продления.")}</span>
            </span>
            <span className="ia-plus__plan-price">{offer.priceLabel}</span>
          </div>
        ) : (
          <p className="ia-plus__unlocked" id="purchase-unlocked">
            {t("Полный доступ активен")}
          </p>
        )}

        {error ? (
          <p className="ia-plus__error" id="purchase-error" role="alert">
            {error}
          </p>
        ) : null}
        {!plus && !viewer.loggedIn ? <p className="ia-plus__note">{s.signInFirst}</p> : null}
        {!plus ? <p className="ia-plus__note">{s.payNote}</p> : null}

        <nav className="ia-plus__legal" aria-label={s.legalLabel}>
          {!viewer.loggedIn ? (
            <button type="button" id="restore-access" onClick={() => openSignIn({ reason: "restore" })}>
              {s.restore}
            </button>
          ) : null}
          <Link href={href(locale, "offer", "payment")}>{s.offerLink}</Link>
          <Link href={routes.offer(locale)}>{t("Условия использования")}</Link>
          <Link href={routes.privacy(locale)} id="paywall-privacy">
            {t("Конфиденциальность")}
          </Link>
          <Link href={routes.contacts(locale)}>{s.supportLink}</Link>
        </nav>
      </div>

      <div className="ia-plus__iphone">
        <p>{s.iphoneNote}</p>
        <AppStoreBadge size="sm" />
      </div>

      {variant === "welcome" ? (footerTarget ? createPortal(footer, footerTarget) : null) : footer}
    </div>
  );
}
