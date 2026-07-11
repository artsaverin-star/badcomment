import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { promoScore } from "@/lib/promoScore";
import ideasData from "@/data/ideas.json";
import BuildProgress from "@/components/BuildProgress";

export const dynamic = "force-dynamic";

// «Создай свой апп», step 1 of 8: pick the niche (admin-only prototype).
// The whole road is visible from the first screen; the copy flexes the data.

type RApp = { icon?: string | null; ratings?: number };
type RSet = { name: string; nameEn?: string; apps?: RApp[]; totalReviews?: number };

export default async function BuildNichePicker() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const ideas = ideasData as { category: string }[];

  const all = Object.entries(RATING_BY_SLUG as Record<string, RSet>).filter(([slug]) => isActiveCategory(slug) && ideas.some((i) => i.category === slug));
  const totalReviews = all.reduce((s, [, r]) => s + (r.totalReviews || 0), 0);

  const niches = all
    .map(([slug, r]) => {
      const icon = [...(r.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon)?.icon ?? null;
      return { slug, name: (ru ? r.name : r.nameEn) || r.name, icon, ideas: ideas.filter((i) => i.category === slug).length, promo: promoScore(slug)?.score ?? 0 };
    })
    .sort((a, b) => b.promo - a.promo);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Создай свой апп · прототип · только для админа" : "Build your app · prototype · admin only"}</div>
      <div className="mt-6"><BuildProgress active={0} doneCount={0} ru={ru} /></div>

      <header className="mt-10">
        <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{ru ? "Мы прочитали весь App Store за тебя" : "We read the whole App Store for you"}</h1>
        <p className="mt-4 max-w-[58ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <><span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("ru-RU")}</span> реальных отзывов, {all.length} ниш. Оставили только те, где аудитория уже платит и громко страдает. Выше стоят ниши, куда новичку легче пробиться.</>
            : <><span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("en-US")}</span> real reviews, {all.length} niches. We kept only the ones where the audience already pays and loudly suffers. The easiest niches to break into are on top.</>}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-2.5">
        {niches.map((n) => (
          <Link key={n.slug} href={`${lp}/build/${n.slug}`} className="card-min group flex items-center gap-4 rounded-[20px] p-4 transition-colors hover:border-[var(--color-border-strong)] sm:p-5">
            {n.icon
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={n.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[13px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
              : <span className="size-11 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
            <div className="min-w-0 flex-1">
              <div className="text-body font-semibold text-[var(--color-text-primary)]">{n.name}</div>
              <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{n.ideas} {ru ? "проверенных болей" : "verified pains"}</div>
            </div>
            {n.promo > 0 && (
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-bold tabular-nums ${n.promo >= 60 ? "bg-[#30d158]/15 text-[#1f9d47]" : n.promo >= 45 ? "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]" : "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]"}`}>
                {ru ? `пробиваемость ${n.promo}` : `break-in ${n.promo}`}
              </span>
            )}
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        ))}
      </div>
    </main>
  );
}
