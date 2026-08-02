"use client";

import BuyButton from "./BuyButton";
import type { Locale } from "@/lib/i18n";

// Premium category → the single lifetime purchase opens everything (a
// payment-options popup). Non-premium niches aren't sellable yet — they show a
// "in preparation" status. The price/stars props are legacy and ignored.
export default function CategoryGate({
  slug,
  categoryName,
  sellable,
  price,
  loggedIn,
  pregenDate,
  locale = "ru",
  starsHref,
  starsLabel,
  lifetimeStarsHref,
  inline = false,
}: {
  slug?: string;
  categoryName?: string;
  sellable: boolean;
  price?: number;
  loggedIn: boolean;
  pregenDate: string;
  locale?: Locale;
  starsHref?: string;
  starsLabel?: string;
  lifetimeStarsHref?: string;
  inline?: boolean;
}) {
  const ru = locale !== "en";
  void slug; void categoryName; void price; void starsHref; void starsLabel; void lifetimeStarsHref;

  if (!sellable) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-5 py-3 text-[14px] font-medium text-[var(--color-text-tertiary)]">
        <span aria-hidden>⏳</span>
        {ru ? `Готовим разбор · ${pregenDate}` : `In preparation · ${pregenDate}`}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2.5">
      <BuyButton loggedIn={loggedIn} locale={locale} inline={inline} />
    </div>
  );
}
