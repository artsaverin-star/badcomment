import { Header } from "@saverin/ui-web";
import { isPremium, FREE_CATEGORIES } from "@/lib/premium";
import { yookassaEnabled } from "@/lib/yookassa";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import Pricing from "@/components/Pricing";

export const dynamic = "force-dynamic";

// Premium pricing page. One plan, two billing options (1000 ₽/мес, 3000 ₽/6 мес
// −50%), paid in Telegram Stars via the bot or by card via ЮKassa.
export default async function PremiumPage() {
  const premium = await isPremium();
  const cardEnabled = yookassaEnabled();
  const locale = await getLocale();
  const user = await getSessionUser();
  // Передаём id сайт-аккаунта боту, чтобы оплата звёздами начислила премиум
  // именно этому аккаунту (даже если он залогинен через Google).
  const bot = process.env.BOT_USERNAME || "inAppProBot";
  const botUrl = user ? `https://t.me/${bot}?start=premium_${user.id}` : `https://t.me/${bot}?start=premium`;

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
          <Pricing botUrl={botUrl} cardEnabled={cardEnabled} locale={locale} loggedIn={!!user} />
        </div>
      )}
    </main>
  );
}
