import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { promoScore } from "@/lib/promoScore";
import ideasData from "@/data/ideas.json";
import BuildProgress from "@/components/BuildProgress";
import { FlameIcon, BulbIcon, RocketIcon } from "@/components/BuildIcons";

export const dynamic = "force-dynamic";

// «Создание» — the section's home page: what happens here, why it works and
// what superpower the user gets. Step 1 of the road (pick the niche) lives
// right on it. The whole plan is assembled from real review data, no LLM.

type RApp = { icon?: string | null; ratings?: number };
type RSet = { name: string; nameEn?: string; apps?: RApp[]; totalReviews?: number };

export default async function BuildHome() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const ideas = ideasData as { category: string }[];

  const all = Object.entries(RATING_BY_SLUG as Record<string, RSet>).filter(([slug]) => isActiveCategory(slug) && ideas.some((i) => i.category === slug));
  const totalReviews = all.reduce((s, [, r]) => s + (r.totalReviews || 0), 0);
  const totalIdeas = all.reduce((s, [slug]) => s + ideas.filter((i) => i.category === slug).length, 0);

  const niches = all
    .map(([slug, r]) => {
      const icon = [...(r.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon)?.icon ?? null;
      return { slug, name: (ru ? r.name : r.nameEn) || r.name, icon, ideas: ideas.filter((i) => i.category === slug).length, promo: promoScore(slug)?.score ?? 0 };
    })
    .sort((a, b) => b.promo - a.promo);

  const how = ru
    ? [
        { Icon: FlameIcon, t: "Выбери боль", d: "Ниши и боли не придуманы: каждая проверена сотнями реальных отзывов." },
        { Icon: BulbIcon, t: "Получи план", d: "Решение, конкуренты, кто заплатит, имя и запросы в сторе." },
        { Icon: RocketIcon, t: "Собери и запусти", d: "Готовые промты для дизайна и кода плюс каналы первых пользователей." },
      ]
    : [
        { Icon: FlameIcon, t: "Pick a pain", d: "Niches and pains aren't invented: each is verified by hundreds of real reviews." },
        { Icon: BulbIcon, t: "Get the plan", d: "Solution, competitors, who pays, the name and store queries." },
        { Icon: RocketIcon, t: "Build and launch", d: "Ready prompts for design and code plus channels for the first users." },
      ];

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">{ru ? "Собери своё приложение" : "Build your own app"}</h1>
        <p className="mx-auto mt-5 max-w-[56ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Мы разобрали <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("ru-RU")}</span> реальных отзывов в {all.length} нишах и собрали {totalIdeas} проверенных болей: видно заранее, за что люди уже платят и на что жалуются. Выбираешь боль, получаешь план и собираешь приложение за вечер с ChatGPT и Cursor.</>
            : <>We went through <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("en-US")}</span> real reviews across {all.length} niches and verified {totalIdeas} pains: you see in advance what people already pay for and complain about. Pick a pain, get the plan and build the app in an evening with ChatGPT and Cursor.</>}
        </p>
      </header>

      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        {how.map(({ Icon, t, d }, i) => (
          <div key={i} className="card-min rounded-[22px] p-5">
            <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-bg-muted)]"><Icon size={22} /></span>
            <div className="mt-3 text-body font-semibold text-[var(--color-text-primary)]">{t}</div>
            <p className="mt-1 text-footnote text-[var(--color-text-secondary)]">{d}</p>
          </div>
        ))}
      </div>

      <div className="mt-10"><BuildProgress active={0} doneCount={0} ru={ru} sticky={false} /></div>

      <section className="mt-10">
        <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Шаг 1. Выбери нишу" : "Step 1. Pick the niche"}</h2>
        <p className="mt-2 max-w-[58ch] text-callout text-[var(--color-text-secondary)]">
          {ru ? "Выше стоят ниши, где у новичка больше шансов: меньше гигантов и накрутки." : "Niches where a newcomer has the best odds are on top: fewer giants, less fakery."}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
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
                  {ru ? `шанс новичка ${n.promo}` : `newcomer odds ${n.promo}`}
                </span>
              )}
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
