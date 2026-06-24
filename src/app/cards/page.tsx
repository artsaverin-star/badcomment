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
    <main className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-4 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />

      <header className="mb-12 text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Лента идей" : "Idea feed"}</div>
        <h1 className="glow-sweep mx-auto mt-5 max-w-[16ch] text-[clamp(30px,8vw,52px)] font-black leading-[1.0] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Идеи, которые люди уже просят" : "Ideas people already ask for"}
        </h1>
        <p className="mx-auto mt-5 max-w-[44ch] text-[16px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[18px]">
          {ru ? (
            <>Свайпай идеи приложений из <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(totalReviews)}</span> реальных отзывов. Понравилась — сохраняй. Тап — весь разбор: что строить и как заработать.</>
          ) : (
            <>Swipe app ideas pulled from <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(totalReviews)}</span> real reviews. Like one — save it. Tap for the full breakdown: what to build and how to earn.</>
          )}
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
