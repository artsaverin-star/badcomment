import { Header } from "@saverin/ui-web";
import { isPremium, FREE_CATEGORIES } from "@/lib/premium";

export const dynamic = "force-dynamic";

// Premium landing. Phase 0: explains the offer + a (stub) Telegram entry point.
// The real subscription flow (Telegram-bot payment → user.premium flag) wires in
// with auth/billing.
export default async function PremiumPage() {
  const premium = await isPremium();
  const perks = [
    "Все разборы по категориям, а не только бесплатные",
    "Инсайты категории (синтез по 10+ приложениям) для всех тем",
    "Все идеи продуктов с цепочкой доказательств из реальных отзывов",
    "Новые категории по мере готовности",
  ];
  return (
    <main className="mx-auto w-full max-w-[600px] px-4 py-12">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={premium ? "Премиум активен" : "Премиум"}
        description={
          <span className="mx-auto block max-w-md">
            {premium
              ? "Спасибо! Все категории и идеи открыты."
              : `Бесплатно открыты ${FREE_CATEGORIES.length} категории. Премиум открывает весь каталог.`}
          </span>
        }
      />

      {!premium && (
        <>
          <ul className="mx-auto mt-8 flex max-w-md flex-col gap-2.5">
            {perks.map((p) => (
              <li key={p} className="flex gap-2.5 text-callout text-[var(--color-text-secondary)]">
                <span className="text-[var(--color-text-brand)]">✓</span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-9 max-w-md rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 text-center">
            <p className="text-callout text-[var(--color-text-secondary)]">
              Оплата и активация — через Telegram-бот.
            </p>
            <a
              href="https://t.me/"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-[var(--color-button-primary-bg)] px-6 py-3 text-callout font-semibold text-[var(--color-button-primary-text)] hover:opacity-90"
            >
              Открыть бот в Telegram
            </a>
            <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">
              Платёжный бот и подписка подключаются на следующем этапе.
            </p>
          </div>
        </>
      )}
    </main>
  );
}
