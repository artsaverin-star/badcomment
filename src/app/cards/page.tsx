import type { Metadata } from "next";
import { getAccess } from "@/lib/access";
import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { DRAW_COST } from "@/lib/tokenConfig";
import insightsData from "@/data/insights.json";
import CardDeck from "@/components/CardDeck";
import AtmosphereSetter from "@/components/AtmosphereSetter";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Колода идей — inApp",
  description: "Тяни карту и открывай идею приложения под подтверждённый спрос — из сотен тысяч реальных отзывов.",
};

export default async function CardsPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const access = await getAccess();

  const totalReviews = (insightsData as { reviewsScanned?: number }[]).reduce((s, a) => s + (a.reviewsScanned || 0), 0);
  const ideasCount = listIdeas().length;
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");

  return (
    <main className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />

      <header className="text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Колода идей" : "Idea deck"}</div>
        <h1 className="glow-sweep mx-auto mt-5 max-w-[14ch] text-[clamp(34px,9vw,64px)] font-black leading-[0.98] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Тяни карту — открой идею" : "Draw a card — get an idea"}
        </h1>
        <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[19px]">
          {ru ? (
            <>
              Мы прочитали <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(totalReviews)}</span> отзывов и собрали <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(ideasCount)}</span> идей, которые люди реально просят. Тяни карту — и тебе выпадет готовая идея, что построить.
            </>
          ) : (
            <>
              We read <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(totalReviews)}</span> reviews and pulled out <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">{nf(ideasCount)}</span> ideas people actually ask for. Draw a card — you get a ready idea to build.
            </>
          )}
        </p>
      </header>

      <CardDeck
        locale={locale}
        loggedIn={access.loggedIn}
        balance={access.balance}
        unlimited={access.unlimited}
        drawCost={DRAW_COST}
      />
    </main>
  );
}
