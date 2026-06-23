"use client";

import BuyButton from "./BuyButton";
import { LIFETIME } from "@/lib/tokenConfig";
import type { Locale } from "@/lib/i18n";

// Premium category → one ₽ purchase opens everything (a payment-options popup).
// Non-premium niches aren't sellable yet — they show a "in preparation" status.
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
}: {
  slug: string;
  categoryName?: string;
  sellable: boolean;
  price: number;
  loggedIn: boolean;
  pregenDate: string;
  locale?: Locale;
  starsHref?: string;
  starsLabel?: string;
}) {
  const ru = locale !== "en";

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
      <BuyButton
        kind="category"
        slug={slug}
        price={price}
        label={ru ? `Открыть за ${price} ₽` : `Unlock for ${price} ₽`}
        loggedIn={loggedIn}
        locale={locale}
        title={(ru ? "Разбор категории" : "Category breakdown") + (categoryName ? ` ${categoryName}` : "")}
        subtitle={ru ? "Выводы, все идеи и разбор конкурентов ниши — открывается навсегда." : "Findings, all ideas and the competitor teardown — unlocked forever."}
        starsHref={starsHref}
        starsLabel={starsLabel}
        lifetimePrice={LIFETIME.rub}
      />
    </div>
  );
}
