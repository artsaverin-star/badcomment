import { Header } from "@saverin/ui-web";
import { yookassaEnabled } from "@/lib/yookassa";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { SIGNUP_GRANT, LIFETIME, tokensWord } from "@/lib/tokenConfig";
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
            ? `🚀 Early access forever — ${LIFETIME.rub} ₽`
            : `🚀 Ранний доступ навсегда — ${LIFETIME.rub} ₽`}
        </p>
        <p className="mx-auto mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-[var(--color-text-secondary)]">
          {locale === "en"
            ? "Honestly — I've put a lot of time and money into this project, and I'm just trying to recoup some of it. So I'm giving lifetime access to everything for the price of one coffee — getting in early is the best thing you can do here. Thank you for being here 🙏"
            : "Честно — я вложил в этот проект кучу времени и денег, и сейчас просто пытаюсь хоть как-то их отбить. Поэтому отдаю доступ ко всему навсегда за цену одной чашки кофе — зайти сейчас одним из первых и есть лучшее, что тут можно сделать. Спасибо, что вы здесь 🙏"}
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
