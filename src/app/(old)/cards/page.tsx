import type { Metadata } from "next";
import { ogImage } from "@/lib/og";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { getLocale } from "@/lib/i18n.server";
import { buildFeed } from "@/lib/ideaFeed";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import { getCatalogData } from "@/lib/catalogData";
import { isPremium } from "@/lib/premium";
import IdeaFeed from "@/components/IdeaFeed";
import AtmosphereSetter from "@/components/AtmosphereSetter";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/cards`;
  const title = ru ? "Лента идей приложений — inApp" : "App idea feed — inApp";
  const description = ru
    ? "Свайпай идеи приложений, которые люди уже просят в отзывах. По каждой — что строить, для кого и как заработать, с доказательствами из отзывов."
    : "Swipe app ideas people already ask for in reviews. For each — what to build, for whom and how it makes money, backed by real review evidence.";
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ru: "https://inapp.pro/ru/cards", en: "https://inapp.pro/en/cards", "x-default": "https://inapp.pro/en/cards" },
    },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [ogImage(ru)] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(ru)] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function CardsPage({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
  const locale = await getLocale();
  const ru = locale !== "en";
  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);

  // Preview override so an owner can see the woven-in cards without logging out:
  // ?preview=guest → both (sign-in + unlock); ?preview=paywall → unlock only.
  const preview = (await searchParams).preview;
  const previewGuest = preview === "guest";
  const loggedIn = previewGuest ? false : access.loggedIn;
  const hasAccess = previewGuest || preview === "paywall" ? false : owner;

  // Use the effective access (honours ?preview=) so depth never leaks to a
  // non-owner — and an owner previewing the gate sees the true locked state.
  // The deck client truncates browsing at 10 (guest) / 14 (signed-in), so a
  // non-owner's payload is cut to exactly that: shipping the other ~580
  // previews only leaked every title+pitch+quote into the flight data.
  const { items: feedItems } = buildFeed(locale, hasAccess);
  const items = hasAccess ? feedItems : feedItems.slice(0, loggedIn ? 14 : 10);
  // Single honest review-count figure — same source as the homepage headline.
  const { totalReviews } = getCatalogData(locale, await isPremium());
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="relative mx-auto flex w-full max-w-[760px] flex-1 flex-col justify-center overflow-x-clip px-2 sm:px-4 py-4">
      <AtmosphereSetter random />

      <header className="mb-2 text-center sm:mb-4">
        <h1 className="glow-sweep mx-auto text-display text-[var(--color-text-primary)] text-balance">
          {ru ? "Идеи приложений" : "App ideas"}
        </h1>
        <p className="mx-auto mt-2 max-w-[42ch] text-body text-[var(--color-text-secondary)] sm:mt-2.5">
          {ru ? <>на основе {nf(totalReviews)} отзывов на приложения<br />в App Store и Google Play</> : <>from {nf(totalReviews)} app reviews<br />on App Store and Google Play</>}
        </p>
      </header>

      <IdeaFeed
        items={items}
        dailySlug={null}
        hasAccess={hasAccess}
        locale={locale}
        loggedIn={loggedIn}
        deckPrice={DECK_PRICE_RUB}
        starsHref={access.user ? `https://telegram.me/${bot}?start=deck_${access.user.id}` : undefined}
        starsLabel={`${DECK_STARS} ⭐ Telegram`}
        lifetimeStarsHref={access.user ? `https://telegram.me/${bot}?start=life_${access.user.id}` : undefined}
        lifetimePrice={LIFETIME.rub}
      />
    </main>
  );
}
