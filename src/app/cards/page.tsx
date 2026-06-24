import type { Metadata } from "next";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { getLocale } from "@/lib/i18n.server";
import { buildFeed } from "@/lib/ideaFeed";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import insightsData from "@/data/insights.json";
import IdeaFeed from "@/components/IdeaFeed";
import AtmosphereSetter from "@/components/AtmosphereSetter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Лента идей — inApp",
  description: "Свайпай идеи приложений, которые люди уже просят в отзывах. С доказательствами и разбором: что строить и как заработать.",
};

export default async function CardsPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);

  const { items, dailySlug } = buildFeed(locale, owner);
  const totalReviews = (insightsData as { reviewsScanned?: number }[]).reduce((s, a) => s + (a.reviewsScanned || 0), 0);
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-4 pb-12 pt-4 sm:pt-7">
      <AtmosphereSetter random />

      <header className="mb-3 text-center sm:mb-5">
        <h1 className="glow-sweep mx-auto text-[clamp(28px,8vw,46px)] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Идеи приложений" : "App ideas"}
        </h1>
        <p className="mx-auto mt-2.5 max-w-[42ch] text-[14px] text-[var(--color-text-secondary)] sm:text-[16px]">
          {ru ? <>на основе {nf(totalReviews)} отзывов на приложения<br />в App Store и Google Play</> : <>from {nf(totalReviews)} app reviews<br />on App Store and Google Play</>}
        </p>
      </header>

      <IdeaFeed
        items={items}
        dailySlug={dailySlug}
        locale={locale}
        loggedIn={access.loggedIn}
        deckPrice={DECK_PRICE_RUB}
        starsHref={access.user ? `https://t.me/${bot}?start=deck_${access.user.id}` : undefined}
        starsLabel={`${DECK_STARS} ⭐ Telegram`}
        lifetimeStarsHref={access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined}
        lifetimePrice={LIFETIME.rub}
      />
    </main>
  );
}
