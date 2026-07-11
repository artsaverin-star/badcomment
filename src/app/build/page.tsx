import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";
import ideasData from "@/data/ideas.json";

export const dynamic = "force-dynamic";

// «Создай свой апп» — admin-only prototype. Step 0 of the builder path:
// pick a niche. The wizard itself lives at /build/<niche>/<idea>.

type RApp = { icon?: string | null; ratings?: number };
type RSet = { name: string; nameEn?: string; apps?: RApp[] };

export default async function BuildNichePicker() {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const ideas = ideasData as { category: string }[];

  const niches = Object.entries(RATING_BY_SLUG as Record<string, RSet>)
    .filter(([slug]) => isActiveCategory(slug) && ideas.some((i) => i.category === slug))
    .map(([slug, r]) => {
      const icon = [...(r.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon)?.icon ?? null;
      return { slug, name: (ru ? r.name : r.nameEn) || r.name, icon, ideas: ideas.filter((i) => i.category === slug).length };
    })
    .sort((a, b) => a.name.localeCompare(b.name, ru ? "ru" : "en"));

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Прототип · только для админа" : "Prototype · admin only"}</div>
      <h1 className="mt-4 text-display text-balance text-[var(--color-text-primary)]">{ru ? "Создай свой апп" : "Build your app"}</h1>
      <p className="mt-5 max-w-[56ch] text-lead text-pretty text-[var(--color-text-secondary)]">
        {ru
          ? "Шесть шагов от чужой боли до собственного приложения: даже если ты никогда их не делал. Начни с ниши."
          : "Six steps from someone's pain to your own app, even if you have never built one. Start with a niche."}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {niches.map((n) => (
          <Link key={n.slug} href={`${lp}/build/${n.slug}`} className="card-min flex flex-col gap-3 rounded-[22px] p-5 transition-colors hover:border-[var(--color-border-strong)]">
            {n.icon
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={n.icon} alt="" loading="lazy" decoding="async" className="size-10 rounded-[12px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
              : <span className="size-10 rounded-[12px] bg-[var(--color-bg-muted)]" />}
            <div>
              <div className="text-callout font-semibold text-[var(--color-text-primary)]">{n.name}</div>
              <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{n.ideas} {ru ? "идей" : "ideas"}</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
