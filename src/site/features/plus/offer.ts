// The web Plus offer — client-safe facts and helpers shared by the paywall and the payment
// return page. Prices are FROZEN (DECISIONS §10): the web sells only the existing YooKassa
// "lifetime" SKU at ACCESS_PRICE_RUB (990 ₽), presented as «Plus навсегда». The price has one
// source of truth (src/lib/tokenConfig.ts) — never hard-code it here.

import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import { INTL_LOCALE, type Locale } from "../../i18n/locales";

/** POST /api/pay/yookassa `kind` — the only SKU the web sells. */
export const PLUS_KIND = "lifetime" as const;

export const PLUS_PRICE_RUB: number = ACCESS_PRICE_RUB;

/** Same analytics item as the old BuyButton / PurchaseTracker (GA4 + Metrica ecommerce). */
export const PLUS_ITEM = { id: "lifetime", name: "inApp — полный доступ навсегда", price: ACCESS_PRICE_RUB } as const;

export type PayMethod = "bank_card" | "sbp";

/** "990 ₽" / "₽990" in the page locale (currency RUB, no kopecks). */
export function formatRub(locale: Locale, amount: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: "currency",
    currency: "RUB",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Analytics + PaymentAttempt source of a new-site surface: "v2_<surface>".
 * Matches the pay route's sanitiser ([a-zA-Z0-9_./:-], ≤ 160).
 */
export function checkoutSource(surface: string | null | undefined): string {
  const clean = (surface || "plus_page").replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 60) || "plus_page";
  return clean.startsWith("v2_") ? clean : `v2_${clean}`;
}

/** What the server hands to the paywall (price label and benefit lines are localized). */
export type PlusOfferData = {
  priceRub: number;
  priceLabel: string;
  benefits: string[];
  /** /<L>/segment/<free topic> — «Остаться с бесплатным разбором» on the page. */
  freeTopicHref: string;
};

// ---------------------------------------------------------------------------
// Resume after sign-in. Buying needs an account; Google and the e-mail link leave the page,
// so the intent survives in localStorage (not sessionStorage: the magic link may open in a
// new tab). Consumed by the paywall once the viewer is signed in.

const RESUME_KEY = "ia2:plus.resume";
const RESUME_TTL_MS = 30 * 60 * 1000;

export type PlusResume = { source: string; at: number };

export function saveResume(source: string): void {
  try {
    window.localStorage.setItem(RESUME_KEY, JSON.stringify({ source, at: Date.now() } satisfies PlusResume));
  } catch {
    /* storage denied: the user simply presses the button again */
  }
}

export function peekResume(): PlusResume | null {
  try {
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as PlusResume;
    if (!r || typeof r.source !== "string" || typeof r.at !== "number" || Date.now() - r.at > RESUME_TTL_MS) {
      window.localStorage.removeItem(RESUME_KEY);
      return null;
    }
    return r;
  } catch {
    return null;
  }
}

export function clearResume(): void {
  try {
    window.localStorage.removeItem(RESUME_KEY);
  } catch {
    /* ignore */
  }
}
