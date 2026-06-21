import { Header } from "@saverin/ui-web";
import { yookassaEnabled } from "@/lib/yookassa";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { SIGNUP_GRANT, tokensWord } from "@/lib/tokenConfig";
import TokenStore from "@/components/TokenStore";

export const dynamic = "force-dynamic";

// Token wallet + pack store. Tokens unlock content permanently (app/idea/
// category). New accounts start with SIGNUP_GRANT free tokens.
export default async function TokensPage() {
  const access = await getAccess();
  const cardEnabled = yookassaEnabled();
  const locale = await getLocale();

  const bot = process.env.BOT_USERNAME || "inAppProBot";
  // The bot reads start=buy_<userId>_<packId> / start=life_<userId> and sends a
  // Stars invoice, crediting this exact site account (even via Google login).
  const botStart = `https://t.me/${bot}?start=`;
  const uid = access.user?.id ?? "";

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-14">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title={locale === "en" ? "Energy" : "Энергия"}
        description={
          <span className="mx-auto block max-w-md">
            {locale === "en"
              ? `Unlock breakdowns, ideas and whole categories with energy. ${SIGNUP_GRANT} free on signup.`
              : `Открывай разборы, идеи и целые категории за энергию. На старте дарим ${SIGNUP_GRANT} ${tokensWord(SIGNUP_GRANT)}.`}
          </span>
        }
      />
      <div className="mx-auto mt-6 max-w-xl rounded-2xl border border-[color-mix(in_srgb,var(--color-text-brand)_40%,var(--color-border-subtle))] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] p-4 text-center">
        <p className="text-callout font-semibold text-[var(--color-text-primary)]">
          {locale === "en"
            ? "🚀 Beta: founder lifetime access — 2990 ₽ instead of 9990 ₽"
            : "🚀 Бета: доступ основателя навсегда — 2990 ₽ вместо 9990 ₽"}
        </p>
        <p className="mt-1 text-footnote text-[var(--color-text-secondary)]">
          {locale === "en"
            ? "This price holds only during the beta. One time — every niche, conclusion and idea open forever."
            : "Цена действует только пока идёт бета. Один раз — и все ниши, выводы и идеи открыты навсегда."}
        </p>
      </div>
      <div className="mt-8">
        <TokenStore
          balance={access.balance}
          unlimited={access.unlimited}
          loggedIn={access.loggedIn}
          cardEnabled={cardEnabled}
          botStart={botStart}
          uid={uid}
          locale={locale}
        />
      </div>
    </main>
  );
}
