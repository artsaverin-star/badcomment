"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { trackPurchase } from "@/lib/track";
import { useLocale, useT, useWebStrings } from "../../i18n/client";
import { routes } from "../../routing";
import { openPaywall, openSignIn } from "../../shell/actions";
import { useViewer } from "../../shell/ViewerContext";
import { Button } from "../../ui/Button";
import { AlertIcon, CheckIcon, ClearIcon } from "../../ui/icons";
import { PLUS_ITEM } from "./offer";
import { plusStrings } from "./strings";
import "./plus.css";

// Payment return (YooKassa return_url = /library?checkout=<uuid> → /<L>/library?checkout=…).
// A redirect back from YooKassa is NOT proof of payment: poll our own server-side attempt
// (GET /api/pay/status, 1 s × 30), which becomes "succeeded" only after the verified webhook
// granted access — and only then emit the analytics purchase, once per transaction (the same
// localStorage de-dupe key as the old PurchaseTracker). Then refresh the server tree so the
// whole page knows about Plus. Banner copy: spec 06 §4.2.

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
  const s = useWebStrings(plusStrings);
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

  if (view === "confirmed") {
    return (
      <div className="ia-checkout" role="status">
        <span className="ia-checkout__icon ia-checkout__icon--ok" aria-hidden="true">
          <CheckIcon size={30} strokeWidth={2.4} />
        </span>
        <h1 className="ia-checkout__title">{s.doneTitle}</h1>
        <p className="ia-checkout__text">{s.confirmed}</p>
        <p className="ia-checkout__text">{s.doneLead}</p>
        <div className="ia-checkout__actions">
          <Button variant="welcome" href={routes.research(locale)}>
            {s.openResearch}
          </Button>
          <Button variant="text" href={routes.saved(locale)}>
            {t("Сохранённое")}
          </Button>
        </div>
      </div>
    );
  }

  const failed = view === "failed" || view === "missing";
  const message = {
    checking: s.checking,
    failed: s.failed,
    delayed: s.delayed,
    signin: s.signinNeeded,
    missing: s.missing,
  }[view];

  return (
    <div className="ia-checkout">
      <span className={failed ? "ia-checkout__icon ia-checkout__icon--fail" : "ia-checkout__icon"} aria-hidden="true">
        {view === "checking" ? (
          <span className="ia-spinner ia-checkout__spinner" />
        ) : failed ? (
          <ClearIcon size={30} strokeWidth={2} />
        ) : (
          <AlertIcon size={30} strokeWidth={2} />
        )}
      </span>
      <h1 className="ia-checkout__title">{s.returnTitle}</h1>
      <p className="ia-checkout__text" role="status" aria-live="polite">
        {message}
      </p>
      <div className="ia-checkout__actions">
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

export function CheckoutReturn({ checkout }: { checkout: string }) {
  const viewer = useViewer();
  const router = useRouter();
  const refresh = useCallback(() => router.refresh(), [router]);
  // Re-mount (restart polling) when the viewer signs in on this page.
  return <Tracker key={viewer.loggedIn ? "in" : "out"} checkout={checkout} onConfirmed={refresh} />;
}
