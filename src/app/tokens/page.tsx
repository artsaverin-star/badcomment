import { Header } from "@saverin/ui-web";
import { yookassaEnabled } from "@/lib/yookassa";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { LIFETIME, DECK_PRICE_RUB } from "@/lib/tokenConfig";
import TokenStore from "@/components/TokenStore";

export const dynamic = "force-dynamic";

// Store: two SKUs — the deck (cheap entry) and Lifetime (everything forever).
// Categories are bought on their own pages.
export default async function TokensPage() {
  const access = await getAccess();
  const cardEnabled = yookassaEnabled();
  const locale = await getLocale();
  const ru = locale !== "en";

  const bot = process.env.BOT_USERNAME || "inAppProBot";
  const botStart = `https://t.me/${bot}?start=`;
  const uid = access.user?.id ?? "";
  const hasDeck = access.user ? await ownsDeck(access.user.id) : false;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-14">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={ru ? "Доступ" : "Access"}
        description={
          <span className="mx-auto block max-w-md">
            {ru
              ? `Готовые идеи и выводы из тысяч реальных отзывов. Колода — ${DECK_PRICE_RUB} ₽, всё навсегда — ${LIFETIME.rub} ₽.`
              : `Ready ideas and conclusions from thousands of real reviews. Deck — ${DECK_PRICE_RUB} ₽, everything forever — ${LIFETIME.rub} ₽.`}
          </span>
        }
      />
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[color-mix(in_srgb,var(--color-text-brand)_40%,var(--color-border-subtle))] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] p-4 text-center">
        <p className="mx-auto max-w-[52ch] text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
          {ru
            ? "Тут золотой контент: тысячи реальных отзывов, разобранные в готовые идеи и выводы. За такое McKinsey берёт тонну денег и полгода с умным лицом 😎 А тут — навсегда и за цену пары чашек кофе."
            : "Gold content here: thousands of real reviews turned into ready ideas and conclusions. McKinsey charges a fortune and six months of a serious face for this 😎 Here it's yours forever, for the price of a couple coffees."}
        </p>
      </div>
      <div className="mt-8">
        <TokenStore
          unlimited={access.unlimited}
          loggedIn={access.loggedIn}
          cardEnabled={cardEnabled}
          botStart={botStart}
          uid={uid}
          ownsDeck={hasDeck}
          locale={locale}
        />
      </div>
    </main>
  );
}
