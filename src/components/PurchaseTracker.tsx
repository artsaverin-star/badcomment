"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/track";

type PaymentStatus = {
  status?: string;
  amountRub?: number;
  transactionId?: string;
  source?: string | null;
};

// A redirect back from YooKassa is not proof of payment. We poll our own
// server-side attempt, which becomes "succeeded" only after the verified
// webhook has granted access, and only then emit the analytics purchase.
export default function PurchaseTracker() {
  const params = useSearchParams();
  const pathname = usePathname() || "/library";
  const router = useRouter();
  const checkout = params.get("checkout") || "";
  const [state, setState] = useState<"checking" | "confirmed" | "failed" | "delayed" | null>(checkout ? "checking" : null);

  useEffect(() => {
    if (!checkout) return;
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
          if (!localStorage.getItem(dedupeKey)) {
            localStorage.setItem(dedupeKey, "1");
            trackPurchase(data.transactionId, { id: "lifetime", name: "inApp — полный доступ навсегда", price: data.amountRub }, data.source || "payment_return");
          }
          setState("confirmed");
          router.replace(pathname);
          router.refresh();
          return;
        }
        if (response.ok && (data.status === "canceled" || data.status === "failed")) {
          setState("failed");
          return;
        }
      } catch {
        // A short network interruption should not turn a real payment into an
        // error. Keep polling until the bounded confirmation window expires.
      }
      if (!active) return;
      if (attempts < 30) timer = window.setTimeout(poll, 1000);
      else setState("delayed");
    }

    void poll();
    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, [checkout, pathname, router]);

  if (!state) return null;
  const ru = typeof document === "undefined" || document.documentElement.lang !== "en";
  const copy = {
    checking: ru ? "Проверяем оплату…" : "Confirming payment…",
    confirmed: ru ? "Оплата подтверждена. Полный доступ открыт." : "Payment confirmed. Full access is open.",
    failed: ru ? "Оплата не завершена. Деньги не списаны." : "Payment wasn't completed. You weren't charged.",
    delayed: ru ? "Подтверждение задерживается. Доступ включится автоматически; можно обновить страницу через минуту." : "Confirmation is taking longer than usual. Access will activate automatically; refresh in a minute.",
  }[state];
  return (
    <div className="mb-6 rounded-[var(--radius-xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3 text-center text-footnote text-[var(--color-text-secondary)]" role="status">
      {copy}
    </div>
  );
}
