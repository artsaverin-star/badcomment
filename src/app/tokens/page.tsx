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
        title="Энергия"
        description={
          <span className="mx-auto block max-w-md">
            Открывай разборы, идеи и целые категории за энергию. На старте дарим {SIGNUP_GRANT}{" "}
            {tokensWord(SIGNUP_GRANT)}.
          </span>
        }
      />
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
