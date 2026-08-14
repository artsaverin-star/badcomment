import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import BuyButton from "@/components/BuyButton";

export const dynamic = "force-dynamic";

// The access page: the same single offer as every paywall on the site —
// lifetime ownership, one price. The legacy multi-SKU store is gone.
export default async function TokensPage() {
  const access = await getAccess();
  const locale = await getLocale();
  const ru = locale !== "en";

  const lp = ru ? "/ru" : "/en";
  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
      <header className="text-center">
        <p className="text-caption font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)]">{ru ? "Один понятный тариф" : "One simple plan"}</p>
        <h1 className="mt-2 text-display text-balance text-[var(--color-text-primary)]">{ru ? "Проверь бесплатно. Открой всё, если полезно." : "Try it free. Unlock everything if it helps."}</h1>
        <p className="mx-auto mt-5 max-w-[54ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? `Полная категория «Знакомства» и базовые инструменты MCP открыты без оплаты. Полный доступ стоит ${ACCESS_PRICE_RUB} ₽ один раз — без подписки.`
            : `The complete Dating category and basic MCP tools are free. Full access costs ₽${ACCESS_PRICE_RUB} once, with no subscription.`}
        </p>
      </header>

      <div className="mt-10 grid items-start gap-4 sm:grid-cols-2">
        <section className="rounded-[var(--radius-2xl)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-6">
          <div className="text-title3 text-[var(--color-text-primary)]">{ru ? "Бесплатно" : "Free"}</div>
          <ul className="mt-4 flex flex-col gap-3 text-footnote text-[var(--color-text-secondary)]">
            {(ru
              ? ["Категория «Знакомства» целиком", "Отзывы, приложения и темы внутри примера", "Список ниш и демо-исследование через MCP"]
              : ["The full Dating category", "Reviews, apps and topics inside the sample", "Niche list and a sample MCP research result"]
            ).map((item) => <li key={item}>— {item}</li>)}
          </ul>
          <Link href={`${lp}/reviews/dating-apps`} className="mt-6 inline-flex text-callout font-semibold text-[var(--color-text-brand)] hover:underline">
            {ru ? "Посмотреть полный пример →" : "View the complete sample →"}
          </Link>
        </section>
        {access.unlimited ? (
          <div className="card-min w-full max-w-[420px] rounded-[24px] p-8 text-center">
            <div className="text-title3 text-[var(--color-text-primary)]">{ru ? "У тебя уже всё открыто" : "You already have everything"}</div>
            <p className="mt-3 text-callout text-[var(--color-text-secondary)]">
              {ru ? "Все разборы, идеи и народный рейтинг доступны навсегда, включая всё, что выйдет дальше." : "Every breakdown, idea and the people's rating are yours forever, including everything that comes next."}
            </p>
          </div>
        ) : (
          <BuyButton inline loggedIn={access.loggedIn} locale={locale} source="pricing_page" />
        )}
      </div>
    </main>
  );
}
