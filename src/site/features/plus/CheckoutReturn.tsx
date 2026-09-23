"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { trackPurchase } from "@/lib/track";
import { useLocale, useT, useWeb } from "../../i18n/client";
import { routes } from "../../routing";
import { openPaywall, openSignIn } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { Button } from "../../ui/Button";
import { cx } from "../../ui/cx";
import { AlertIcon, CheckIcon, ClearIcon } from "../../ui/icons";
import { PLUS_ITEM } from "./offer";
import type { PlusStrings } from "./strings";
import "./plus.css";
import { AppCodeCard, type AppCodeView } from "./AppCodeCard";

// Payment return (YooKassa return_url = /library?checkout=<uuid> → /<L>/library?checkout=…).
// A redirect back from YooKassa is NOT proof of payment: poll our own server-side attempt
// (GET /api/pay/status, 1 s × 30), which becomes "succeeded" only after the verified webhook
// granted access — and only then emit the analytics purchase, once per transaction (the same
// localStorage de-dupe key as the old PurchaseTracker). Then refresh the server tree so the
// whole page knows about Plus. Banner copy: spec 06 §4.2. One live region for every state
// (a region created together with its text is not reliably announced — a11y review m9).

type PaymentStatus = {
  status?: string;
  amountRub?: number;
  transactionId?: string;
  source?: string | null;
};

type View = "checking" | "confirmed" | "failed" | "delayed" | "signin" | "missing";

const MAX_ATTEMPTS = 30;
const POLL_MS = 1000;

function Tracker({ checkout, onConfirmed }: { checkout: string; onConfirmed: () => void }) {
  const t = useT();
  const s = useWeb<PlusStrings>("plus");
  const locale = useLocale();
  const [view, setView] = useState<View>("checking");

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let attempts = 0;

    async function poll() {
      attempts++;
      try {
        const response = await fetch(`/api/pay/status?checkout=${encodeURIComponent(checkout)}`, { cache: "no-store" });
        const data = (await response.json().catch(() => ({}))) as PaymentStatus;
        if (!active) return;
        if (response.ok && data.status === "succeeded" && data.transactionId && data.amountRub) {
          const dedupeKey = `inapp_purchase:${data.transactionId}`;
          let seen = false;
          try {
            seen = !!window.localStorage.getItem(dedupeKey);
            if (!seen) window.localStorage.setItem(dedupeKey, "1");
          } catch {
            /* storage denied: still report once for this page view */
          }
          if (!seen) {
            trackPurchase(data.transactionId, { ...PLUS_ITEM, price: data.amountRub }, data.source || "payment_return");
          }
          setView("confirmed");
          onConfirmed();
          return;
        }
        if (response.ok && (data.status === "canceled" || data.status === "failed")) {
          setView("failed");
          return;
        }
        if (response.status === 401) {
          setView("signin");
          return;
        }
        if (response.status === 400 || response.status === 404) {
          setView("missing");
          return;
        }
      } catch {
        // A short network interruption must not turn a real payment into an error:
        // keep polling until the bounded confirmation window expires.
      }
      if (!active) return;
      if (attempts < MAX_ATTEMPTS) timer = window.setTimeout(poll, POLL_MS);
      else setView("delayed");
    }

    void poll();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [checkout, onConfirmed]);

  const confirmed = view === "confirmed";
  const failed = view === "failed" || view === "missing";
  const message = {
    checking: s.checking,
    confirmed: s.confirmed,
    failed: s.failed,
    delayed: s.delayed,
    signin: s.signinNeeded,
    missing: s.missing,
  }[view];

  return (
    <div className="ia-checkout">
      <span
        className={cx(
          "ia-checkout__icon",
          confirmed && "ia-checkout__icon--ok",
          failed && "ia-checkout__icon--fail",
        )}
        aria-hidden="true"
      >
        {view === "checking" ? (
          <span className="ia-spinner ia-checkout__spinner" />
        ) : confirmed ? (
          <CheckIcon size={30} strokeWidth={2.4} />
        ) : failed ? (
          <ClearIcon size={30} strokeWidth={2} />
        ) : (
          <AlertIcon size={30} strokeWidth={2} />
        )}
      </span>
      <h1 className="ia-checkout__title">{confirmed ? s.doneTitle : s.returnTitle}</h1>
      <p className="ia-checkout__text" role="status" aria-live="polite">
        {message}
      </p>
      {confirmed ? <p className="ia-checkout__text">{s.doneLead}</p> : null}
      {confirmed ? <ConfirmedAppCode /> : null}
      <div className="ia-checkout__actions">
        {confirmed ? (
          <>
            <Button variant="welcome" href={routes.research(locale)}>
              {s.openResearch}
            </Button>
            <Button variant="text" href={routes.saved(locale)}>
              {t("Сохранённое")}
            </Button>
          </>
        ) : null}
        {view === "signin" ? (
          <Button variant="welcome" onClick={() => openSignIn({ reason: "checkout" })}>
            {s.signIn}
          </Button>
        ) : null}
        {view === "failed" ? (
          <Button variant="welcome" onClick={() => openPaywall({ source: "checkout_retry" })}>
            {s.tryAgain}
          </Button>
        ) : null}
        {view === "delayed" ? (
          <Button variant="welcome" onClick={() => window.location.reload()}>
            {s.refresh}
          </Button>
        ) : null}
        {view === "missing" || view === "delayed" ? (
          <Button variant="text" href={routes.contacts(locale)}>
            {s.supportLink}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/** After a confirmed lifetime purchase: the buyer's free App Store code for the iOS app. */
function ConfirmedAppCode() {
  const locale = useLocale();
  const [view, setView] = useState<AppCodeView | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void fetch("/api/site/app-code", { cache: "no-store" })
      .then(async (r) => {
        if (!active || !r.ok) return;
        const d = (await r.json()) as { code: string | null; redeemUrl?: string; expiresAt?: string };
        setView(d.code && d.redeemUrl && d.expiresAt ? { code: d.code, redeemUrl: d.redeemUrl, expiresAt: d.expiresAt } : null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  if (view === undefined) return null;
  return (
    <div className="ia-checkout__appcode">
      <AppCodeCard locale={locale} view={view} />
    </div>
  );
}

export function CheckoutReturn({ checkout }: { checkout: string }) {
  const viewer = useViewer();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  // Re-mount (restart polling) when the viewer signs in on this page.
  return <Tracker key={viewer.loggedIn ? "in" : "out"} checkout={checkout} onConfirmed={refresh} />;
}
