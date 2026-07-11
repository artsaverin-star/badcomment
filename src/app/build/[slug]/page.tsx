import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getNicheName } from "@/lib/ratingAppSlug";
import { listIdeas } from "@/lib/ideas";
import { scoreFor } from "@/lib/ideaScores";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import buildCopy from "@/data/buildCopy.json";
import ideaAudit from "@/data/ideaAudit.json";
import BuildProgress from "@/components/BuildProgress";
import { FlameIcon } from "@/components/BuildIcons";

export const dynamic = "force-dynamic";

// Step 2 of 7: pick the pain. Every idea in the niche is a verified pain —
// choosing the pain IS choosing the idea, the user just doesn't know it yet.
// Pain lines are authored from the corpus (buildCopy), not the analyst gap.

type Copy = { pain?: string; painEn?: string; painTitle?: string; painTitleEn?: string };

const firstSentence = (t?: string) => {
  if (!t) return "";
  const m = t.match(/^.*?[.!?…](\s|$)/);
  return (m ? m[0] : t).trim();
};

export default async function BuildPainPicker({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isActiveCategory(slug)) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const niche = getNicheName(slug, locale);
  if (!niche) notFound();

  const copy = buildCopy as Record<string, Copy>;
  const rset = (RATING_BY_SLUG as Record<string, { totalReviews?: number; count?: number }>)[slug];
  // Only pains worth building a business on: the solo-founder score gates the
  // list (weak ones are feature-fixes of someone else's app, not products).
  // A niche always keeps its top five so no list goes empty.
  const scored = listIdeas()
    .filter((i) => i.category === slug)
    .map((i) => {
      const c = copy[i.slug];
      const authored = ru ? c?.pain : c?.painEn;
      const sc = scoreFor(i.slug, locale);
      return {
        idea: i.slug,
        painTitle: (ru ? c?.painTitle : c?.painTitleEn) || "",
        pain: authored || firstSentence(i.gap as string) || i.oneLiner,
        observations: i.stats?.observations ?? 0,
        founder: sc?.founder != null ? Math.round((sc.founder / 45) * 100) : 0,
      };
    })
    .sort((a, b) => b.founder - a.founder);
  // Пограничная полоса (50-55) прошла ручной аудит: weak-вердикты (фикс
  // чужого бага, мелкая боль, слабые деньги, дубликат) исключаются.
  const audit = ideaAudit as Record<string, { verdict?: string }>;
  const ok = (x: { idea: string; founder: number }) => x.founder >= 50 && audit[x.idea]?.verdict !== "weak";
  const strong = scored.filter(ok);
  const rest = scored.filter((x) => !ok(x));
  const pains = strong.length >= 5 ? strong : [...strong, ...rest].slice(0, 5);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <BuildProgress active={1} doneCount={1} ru={ru} />
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
            <span className="mt-0.5 shrink-0"><FlameIcon size={20} /></span>
            <div className="min-w-0 flex-1">
              {p.painTitle
                ? <>
                    <p className="text-body font-semibold text-pretty text-[var(--color-text-primary)]">{p.painTitle}</p>
                    <p className="mt-1 text-footnote text-pretty text-[var(--color-text-secondary)]">{p.pain}</p>
                  </>
                : <p className="text-body text-pretty text-[var(--color-text-primary)]">{p.pain}</p>}
              {p.observations > 0 && <div className="mt-1.5 text-caption text-[var(--color-text-tertiary)]">{p.observations} {ru ? "наблюдений в отзывах" : "observations in reviews"}</div>}
            </div>
            {p.founder > 0 && (
              <span className={`mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-caption font-bold tabular-nums ${p.founder >= 60 ? "bg-[#30d158]/15 text-[#1f9d47]" : "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]"}`}>{p.founder}/100</span>
            )}
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ))}
      </div>

      {/* Floating glass control bar, same idiom as the site header. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-40 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center rounded-full border border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_70%,transparent)] p-1.5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <Link href={`${lp}/build`} className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-callout font-semibold text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M11 4 6 9l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            {ru ? "Назад" : "Back"}
          </Link>
        </div>
      </div>
    </main>
  );
}
