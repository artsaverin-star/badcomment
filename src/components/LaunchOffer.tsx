"use client";

import BuyButton from "./BuyButton";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// The header now states the real offer instead of showing an unexplained
// discount percentage. The shared BuyButton owns the modal and checkout logic.
export default function LaunchOffer({ locale = "ru", loggedIn }: { locale?: Locale; loggedIn: boolean }) {
  const ru = locale !== "en";
  return (
    <BuyButton
      loggedIn={loggedIn}
      locale={locale}
      source="header"
      triggerClassName="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-brand)] px-3 text-footnote font-bold text-white transition-opacity hover:opacity-90"
    >
      <span className="tabular-nums">{ACCESS_PRICE_RUB}&nbsp;₽</span>
      <span className="hidden sm:inline">&nbsp;· {ru ? "навсегда" : "forever"}</span>
    </BuyButton>
  );
}
