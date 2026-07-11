import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getNicheName } from "@/lib/ratingAppSlug";
import { listIdeas } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import BuildProgress from "@/components/BuildProgress";

export const dynamic = "force-dynamic";

// Step 2 of 8: pick the pain. Every idea in the niche is a verified pain —
// choosing the pain IS choosing the idea, the user just doesn't know it yet.

const firstSentence = (t?: string) => {
  if (!t) return "";
  const m = t.match(/^.*?[.!?…](\s|$)/);
  return (m ? m[0] : t).trim();
};

export default async function BuildPainPicker({ params }: { params: Promise<{ slug: string }> }) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();
  const { slug } = await params;
  if (!isActiveCategory(slug)) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const niche = getNicheName(slug, locale);
  if (!niche) notFound();

  const rset = (RATING_BY_SLUG as Record<string, { totalReviews?: number; count?: number }>)[slug];
  const pains = listIdeas()
    .filter((i) => i.category === slug)
    .map((i) => {
      const en = !ru ? ideaContentEn(i.slug, locale) : null;
      return {
        idea: i.slug,
        pain: firstSentence((en?.gap || i.gap) as string) || (en?.oneLiner || i.oneLiner),
        observations: i.stats?.observations ?? 0,
      };
    })
    .sort((a, b) => b.observations - a.observations);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <Link href={`${lp}/build`} className="text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">← {ru ? "к нишам" : "to niches"}</Link>
      <div className="mt-6"><BuildProgress active={1} doneCount={1} ru={ru} /></div>

      <header className="mt-10">
        <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{ru ? `Что болит у людей в «${niche}»` : `What hurts people in ${niche}`}</h1>
        <p className="mt-4 max-w-[58ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Мы разобрали <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{(rset?.totalReviews ?? 0).toLocaleString("ru-RU")}</span> отзывов на {rset?.count ?? 0} приложений этой ниши. Каждая боль ниже проверена: люди уже платят за её решение и всё равно страдают. Выбери ту, что зацепила.</>
            : <>We went through <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{(rset?.totalReviews ?? 0).toLocaleString("en-US")}</span> reviews across {rset?.count ?? 0} apps in this niche. Every pain below is verified: people already pay to solve it and still suffer. Pick the one that hits.</>}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-2.5">
        {pains.map((p) => (
          <Link key={p.idea} href={`${lp}/build/${slug}/${p.idea}`} className="card-min group flex items-start gap-4 rounded-[20px] p-5 transition-colors hover:border-[var(--color-border-strong)]">
            <span className="mt-0.5 text-[18px]">🔥</span>
            <div className="min-w-0 flex-1">
              <p className="text-body text-pretty text-[var(--color-text-primary)]">{p.pain}</p>
              {p.observations > 0 && <div className="mt-1.5 text-caption text-[var(--color-text-tertiary)]">{p.observations} {ru ? "наблюдений в отзывах" : "observations in reviews"}</div>}
            </div>
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
