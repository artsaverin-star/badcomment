import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getNicheName } from "@/lib/ratingAppSlug";
import { listIdeas } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";

export const dynamic = "force-dynamic";

// Builder path, step 0.5: pick the idea inside the chosen niche (admin-only).

export default async function BuildIdeaPicker({ params }: { params: Promise<{ slug: string }> }) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();
  const { slug } = await params;
  if (!isActiveCategory(slug)) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const niche = getNicheName(slug, locale);
  if (!niche) notFound();

  const ideas = listIdeas()
    .filter((i) => i.category === slug)
    .map((i) => {
      const en = !ru ? ideaContentEn(i.slug, locale) : null;
      const s = scoreFor(i.slug, locale);
      return { slug: i.slug, title: en?.title || i.title, oneLiner: en?.oneLiner || i.oneLiner, founder: s?.founder != null ? Math.round((s.founder / 45) * 100) : s?.composite ?? 0 };
    })
    .sort((a, b) => b.founder - a.founder);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <Link href={`${lp}/build`} className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Ниши" : "Niches"}
      </Link>
      <h1 className="mt-10 text-title1 text-balance text-[var(--color-text-primary)]">{ru ? `Что соберём в нише «${niche}»?` : `What shall we build in ${niche}?`}</h1>
      <p className="mt-3 text-callout text-[var(--color-text-secondary)]">{ru ? "Идеи отсортированы под соло-фаундера: продвижение и заметность весят больше." : "Ideas sorted for a solo founder: promo and standout weigh more."}</p>

      <div className="mt-8 flex flex-col gap-3">
        {ideas.map((i) => (
          <Link key={i.slug} href={`${lp}/build/${slug}/${i.slug}`} className="card-min flex items-center justify-between gap-4 rounded-[22px] p-6 transition-colors hover:border-[var(--color-border-strong)]">
            <div className="min-w-0">
              <div className="text-body font-semibold text-[var(--color-text-primary)]">{i.title}</div>
              <p className="mt-1 line-clamp-2 text-callout text-[var(--color-text-secondary)]">{i.oneLiner}</p>
            </div>
            <span className="shrink-0 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-1.5 text-callout font-bold tabular-nums text-[var(--color-text-primary)]">{i.founder}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
