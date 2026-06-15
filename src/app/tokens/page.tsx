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
  // The bot reads start=buy_<packId>_<userId> and sends a Stars invoice for that
  // pack, crediting this exact site account (even if logged in via Google).
  const botBase = access.user
    ? `https://t.me/${bot}?start=buy_${access.user.id}_`
    : `https://t.me/${bot}?start=buy_`;

  return (
    <main className="mx-auto w-full max-w-[560px] px-4 py-14">
      <Header
        size="L"
        as="h1"
        className="mb-3 items-center text-center"
        title="Токены"
        description={
          <span className="mx-auto block max-w-md">
            Открывай разборы, идеи и целые категории за токены. На старте дарим {SIGNUP_GRANT}{" "}
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
          botBase={botBase}
          locale={locale}
        />
      </div>
    </main>
  );
}
