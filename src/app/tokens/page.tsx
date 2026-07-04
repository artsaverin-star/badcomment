import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { LIFETIME, FRIEND_PRICE_RUB, LAUNCH_PROMO } from "@/lib/tokenConfig";
import BuyButton from "@/components/BuyButton";

export const dynamic = "force-dynamic";

// The access page: the same single offer as every paywall on the site —
// lifetime ownership, one price. The legacy multi-SKU store is gone.
export default async function TokensPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const ru = locale !== "en";

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">{ru ? "Доступ" : "Access"}</h1>
        <p className="mx-auto mt-5 max-w-[54ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? `Готовые идеи и выводы из тысяч реальных отзывов. Весь сайт навсегда за ${LAUNCH_PROMO ? `${FRIEND_PRICE_RUB} ₽ вместо ${LIFETIME.rub}` : `${LIFETIME.rub} ₽`}.`
            : `Ready ideas and conclusions from thousands of real reviews. The whole site forever for ${LAUNCH_PROMO ? `${FRIEND_PRICE_RUB} ₽ instead of ${LIFETIME.rub}` : `${LIFETIME.rub} ₽`}.`}
        </p>
      </header>

      <div className="mt-10 flex justify-center">
        {access.unlimited ? (
          <div className="card-min w-full max-w-[420px] rounded-[24px] p-8 text-center">
            <div className="text-title3 text-[var(--color-text-primary)]">{ru ? "У тебя уже всё открыто" : "You already have everything"}</div>
            <p className="mt-3 text-callout text-[var(--color-text-secondary)]">
              {ru ? "Все разборы, идеи и народный рейтинг доступны навсегда, включая всё, что выйдет дальше." : "Every breakdown, idea and the people's rating are yours forever, including everything that comes next."}
            </p>
          </div>
        ) : (
          <BuyButton inline loggedIn={access.loggedIn} locale={locale} />
        )}
      </div>
    </main>
  );
}
