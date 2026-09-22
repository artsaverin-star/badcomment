import { notFound } from "next/navigation";
import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { ideaCard } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import IdeaSwipeDeck, { type SwipeCard } from "@/components/IdeaSwipeDeck";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type FullIdea = { slug: string; category: string; title: string; oneLiner: string };
const cleanTitle = (s: string) => { const m = (s || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, ""); return m.charAt(0).toUpperCase() + m.slice(1); };

// Prototype homepage: a motion-forward swipe deck of the top ideas.
// Owner-only — the cards carry oneLiner + whyPay for the whole top 30, which
// is exactly the paid payload the public surfaces cut for non-owners.
export default async function TestPage() {
  const access = await getAccess();
  if (!access.unlimited) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";

  const nameOf = (slug: string): string => {
    const r = (RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string }>)[slug];
    return (ru ? r?.name : r?.nameEn) || r?.name || slug;
  };

  const cards: SwipeCard[] = (listIdeas() as unknown as FullIdea[])
    .map((i) => ({ i, s: scoreFor(i.slug, locale) }))
    .filter((x) => x.s)
    .sort((a, b) => b.s!.composite - a.s!.composite)
    .slice(0, 30)
    .map(({ i, s }) => {
      const ov = ideaCard(i.slug, locale);
      return {
        slug: i.slug, category: i.category, categoryName: nameOf(i.category),
        title: cleanTitle(ov?.title ?? i.title), oneLiner: ov?.oneLiner ?? i.oneLiner,
        whyPay: s!.whyPay, pricePoint: s!.pricePoint,
        money: s!.money, simplicity: s!.simplicity, demand: s!.demand, composite: s!.composite,
      };
    });

  return (
    <main className="mx-auto flex w-full max-w-[560px] flex-col items-center px-4 pb-24 pt-16 sm:pt-24">
      <AtmosphereSetter random />
      <header className="mb-12 text-center">
        <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Прототип" : "Prototype"}</div>
        <h1 className="glow-sweep mt-4 text-display text-balance text-[var(--color-text-primary)]">{ru ? "Идеи одна за одной" : "Ideas, one by one"}</h1>
        <p className="mx-auto mt-5 max-w-[46ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru ? "Листай карточки идей, отранжированных по деньгам, простоте и спросу." : "Swipe through ideas ranked by money, simplicity and demand."}
        </p>
      </header>
      <IdeaSwipeDeck cards={cards} locale={locale} />
    </main>
  );
}
