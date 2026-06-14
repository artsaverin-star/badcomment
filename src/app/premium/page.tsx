import { Header } from "@saverin/ui-web";
import { isPremium, FREE_CATEGORIES } from "@/lib/premium";
import { yookassaEnabled } from "@/lib/yookassa";
import Pricing from "@/components/Pricing";

export const dynamic = "force-dynamic";

// Premium pricing page. One plan, two billing options (1000 ₽/мес, 3000 ₽/6 мес
// −50%), paid in Telegram Stars via the bot.
export default async function PremiumPage() {
  const premium = await isPremium();
  const cardEnabled = yookassaEnabled();
  const botUrl = `https://t.me/${process.env.BOT_USERNAME || "inAppProBot"}?start=premium`;

  return (
    <main className="mx-auto w-full max-w-[640px] px-4 py-14">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={premium ? "Премиум активен" : "Откройте весь каталог"}
        description={
          <span className="mx-auto block max-w-md">
            {premium
              ? "Спасибо! Все категории, идеи и отзывы открыты."
              : `Бесплатно — ${FREE_CATEGORIES.length} категории. Премиум открывает все разборы, идеи и отзывы.`}
          </span>
        }
      />

      {premium ? (
        <div className="mx-auto mt-8 max-w-[440px] rounded-[var(--radius-2xl)] border border-[#30d158]/40 bg-[color-mix(in_srgb,#30d158_8%,transparent)] p-6 text-center">
          <p className="text-callout text-[var(--color-text-primary)]">⭐ Премиум активен — весь каталог открыт.</p>
        </div>
      ) : (
        <div className="mt-10">
          <Pricing botUrl={botUrl} cardEnabled={cardEnabled} />
        </div>
      )}
    </main>
  );
}
