import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { ideaCard } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import Leaderboard, { type Row } from "@/components/Leaderboard";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const title = ru ? "Топ идей приложений по деньгам и простоте" : "Top app ideas by money and simplicity";
  const description = ru
    ? "Идеи приложений, отранжированные по деньгам (кто уже платит и сколько), простоте сборки для соло-фаундера и спросу из реальных отзывов."
    : "App ideas ranked by money (who already pays and how much), buildability for a solo founder, and demand from real reviews.";
  const url = `https://inapp.pro/${lp}/ideas/top`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru/ideas/top", en: "https://inapp.pro/en/ideas/top", "x-default": "https://inapp.pro/en/ideas/top" } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

type FullIdea = { slug: string; category: string; title: string; oneLiner: string };
const cleanTitle = (s: string) => { const m = (s || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, ""); return m.charAt(0).toUpperCase() + m.slice(1); };

export default async function IdeasTopPage() {
  const locale = await getLocale();
  const ru = locale !== "en";

  const nameOf = (slug: string): string => {
    const r = (RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string }>)[slug];
    return (ru ? r?.name : r?.nameEn) || r?.name || slug;
  };

  const ranked = (listIdeas() as unknown as FullIdea[])
    .map((i) => ({ i, s: scoreFor(i.slug, locale) }))
    .filter((x) => x.s)
    .sort((a, b) => b.s!.composite - a.s!.composite);

  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);
  const loggedIn = access.loggedIn;
  const limit = owner ? ranked.length : loggedIn ? 24 : 12;
  const gate: "auth" | "paywall" | null = owner ? null : loggedIn ? "paywall" : "auth";

  const rows: Row[] = ranked.slice(0, limit).map(({ i, s }) => {
    const ov = ideaCard(i.slug, locale);
    return {
      title: cleanTitle(ov?.title ?? i.title),
      oneLiner: ov?.oneLiner ?? i.oneLiner,
      category: i.category, categoryName: nameOf(i.category),
      money: s!.money, simplicity: s!.simplicity, demand: s!.demand, composite: s!.composite,
      whyPay: s!.whyPay, pricePoint: s!.pricePoint,
    };
  });

  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-16 sm:pt-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Все идеи" : "All ideas"}
      </Link>

      <header className="mt-10">
        <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Рейтинг идей" : "Idea ranking"}</div>
        <h1 className="glow-sweep mt-4 text-display text-balance text-[var(--color-text-primary)]">
          {ru ? "Топ идей: где деньги и что реально собрать" : "Top ideas: where the money is and what you can build"}
        </h1>
        <p className="mt-6 max-w-[60ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Каждая идея оценена по трём осям из реальных данных: деньги (кто уже платит и сколько, из цен в отзывах), простота сборки для соло-фаундера и спрос. Итог — их взвешенная сумма."
            : "Every idea is scored on three axes from real data: money (who already pays and how much, from prices in reviews), buildability for a solo founder, and demand. The score is their weighted sum."}
        </p>
      </header>

      <div className="mt-10">
        <Leaderboard
          rows={rows}
          total={ranked.length}
          gate={gate}
          loggedIn={loggedIn}
          locale={locale}
          deckPrice={DECK_PRICE_RUB}
          starsHref={access.user ? `https://t.me/${bot}?start=deck_${access.user.id}` : undefined}
          starsLabel={`${DECK_STARS} ⭐ Telegram`}
          lifetimeStarsHref={access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined}
          lifetimePrice={LIFETIME.rub}
        />
      </div>
    </main>
  );
}
