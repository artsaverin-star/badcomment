"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
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
import { useLocale, useT, useWebStrings } from "../../i18n/client";
import { href, routes } from "../../routing";
import { openSignIn } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { AppStoreBadge } from "../../ui/AppStore";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import { CheckIcon, RadioOnIcon } from "../../ui/icons";
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
import { plusStrings } from "./strings";
import "./plus.css";

// The web Plus paywall (spec 03 §2 adapted per §2.7 and DECISIONS §10). One component for
// the /<L>/plus page and the sheet (PaywallHost). App layout: artwork → «Полный доступ» →
// description → plan row → status lines → disclosure → primary CTA → «Остаться с бесплатным
// разбором». Web deltas: ONE plan («Plus навсегда», the YooKassa lifetime SKU at
// ACCESS_PRICE_RUB), a payment-method step (bank card / SBP), the YooKassa note, legal links
// (payment offer, terms, support) and the separate-App-Store note with the badge.
//
// Primary button state machine (web):
//   plus                     → «Открыть библиотеку» (close / go to the research catalog)
//   guest                    → «Купить навсегда» → sign-in (intent kept, resumed after it)
//   signed in                → «Купить навсегда» → method choice → POST /api/pay/yookassa
//                              {kind:"lifetime", method, source:"v2_<surface>"} → YooKassa
// Analytics mirror the old BuyButton exactly (src/lib/track.ts), with source "v2_<surface>".

type Props = {
  offer: PlusOfferData;
  /** Analytics surface without the "v2_" prefix, e.g. "idea_card", "plus_page". */
  source: string;
  variant: "page" | "sheet";
  /** Sheet only: close the paywall. */
  onClose?: () => void;
  /** The user asked for access (CTA or a resumed purchase): the host may auto-close on success. */
  onRequested?: () => void;
};

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

export function PlusOffer({ offer, source, variant, onClose, onRequested }: Props) {
  const t = useT();
  const s = useWebStrings(plusStrings);
  const locale = useLocale();
  const viewer = useViewer();
  const router = useRouter();
  const methodTitleId = useId();

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

  const Title = variant === "page" ? "h1" : "h2";
  const secondaryLabel = plus ? t("Закрыть") : t("Остаться с бесплатным разбором");

  return (
    <div className={cx("ia-plus", variant === "page" ? "ia-plus--page" : "ia-plus--sheet")}>
      <PlusArt />

      <div className="ia-plus__head">
        <Title id="paywall-heading" className="ia-plus__title">
          {plus ? t("Доступ открыт") : t("Полный доступ")}
        </Title>
        <p className="ia-plus__lead">{t("Все разборы и идеи, новые выпуски и экспорт материалов.")}</p>
      </div>

      {!plus ? (
        <>
          <ul className="ia-plus__benefits" aria-label={s.benefitsLabel}>
            {offer.benefits.map((b) => (
              <li key={b}>
                <CheckIcon size={17} strokeWidth={2.4} aria-hidden="true" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <div className="ia-plus__plan" id="paywall-plan-lifetime" data-selected="true">
            <RadioOnIcon className="ia-plus__plan-radio" size={21} strokeWidth={2} aria-hidden="true" />
            <span className="ia-plus__plan-text">
              <span className="ia-plus__plan-title">{s.planTitle}</span>
              <span className="ia-plus__plan-detail">{t("Один платёж. Без продления.")}</span>
            </span>
            <span className="ia-plus__plan-price">{offer.priceLabel}</span>
          </div>
        </>
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

      <div className="ia-plus__footer">
        {!plus ? (
          <p className="ia-plus__disclosure" id="paywall-lifetime-price">
            <strong>{t("%1$@ один раз", [offer.priceLabel])}</strong>
            <span>{t("Пожизненный доступ. Без подписки.")}</span>
          </p>
        ) : null}

        {plus ? (
          variant === "page" ? (
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
            <p className="ia-plus__methods-title" id={methodTitleId}>
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
            <Button variant="text" disabled={!!busy} onClick={() => setStep("offer")}>
              {t("Назад")}
            </Button>
          </div>
        ) : (
          <Button variant="welcome" id="purchase-access" onClick={primary}>
            {t("Купить навсегда")}
          </Button>
        )}

        {!plus && !viewer.loggedIn ? <p className="ia-plus__fine">{s.signInFirst}</p> : null}

        {variant === "sheet" ? (
          <button type="button" className="ia-plus__secondary" id="paywall-free" onClick={onClose}>
            {secondaryLabel}
          </button>
        ) : !plus ? (
          <Link className="ia-plus__secondary" id="paywall-free" href={offer.freeTopicHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>

      {!plus ? <p className="ia-plus__fine ia-plus__paynote">{s.payNote}</p> : null}

      <nav className="ia-plus__legal" aria-label={s.legalLabel}>
        {!viewer.loggedIn ? (
          <button type="button" id="restore-access" onClick={() => openSignIn({ reason: "restore" })}>
            {s.restore}
          </button>
        ) : null}
        <Link href={href(locale, "offer", "payment")}>{s.offerLink}</Link>
        <Link href={routes.offer(locale)}>{t("Условия использования")}</Link>
        <Link href={routes.contacts(locale)}>{s.supportLink}</Link>
      </nav>

      <section className="ia-plus__iphone" aria-label={s.iphoneTitle}>
        <p>{s.iphoneNote}</p>
        <AppStoreBadge size="sm" />
      </section>
    </div>
  );
}
