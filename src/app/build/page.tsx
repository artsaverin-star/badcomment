import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { promoScore } from "@/lib/promoScore";
import { getAccess } from "@/lib/access";
import { openFreeIdeas, FREE_BUILD_IDEAS, DEMO_BUILD_IDEA } from "@/lib/buildAccess";
import ideasData from "@/data/ideas.json";
import buildCopy from "@/data/buildCopy.json";
import ideaCovers from "@/data/ideaCovers.json";
import BuildProgress from "@/components/BuildProgress";


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
  const totalApps = all.reduce((s, [, r]) => s + (r.apps?.length || 0), 0);
  const totalIdeas = all.reduce((s, [slug]) => s + ideas.filter((i) => i.category === slug).length, 0);

  // The free ladder: which niches have at least one buildable idea at this
  // viewer's tier. Everything else wears a lock (the pains stay readable).
  const access = await getAccess();
  const freeSet = openFreeIdeas(access);
  const freeCats = new Set(FREE_BUILD_IDEAS.filter((f) => freeSet.has(f.idea)).map((f) => f.category));

  const niches = all
    .map(([slug, r]) => {
      const icon = [...(r.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon)?.icon ?? null;
      const open = access.unlimited || access.has("category", slug) || access.has("chapter", slug) || freeCats.has(slug);
      return { slug, name: (ru ? r.name : r.nameEn) || r.name, icon, open, ideas: ideas.filter((i) => i.category === slug).length, promo: promoScore(slug)?.score ?? 0 };
    })
    .sort((a, b) => b.promo - a.promo);

  // The showcase idea: open with no account, shown right at the start.
  const demoCopy = (buildCopy as Record<string, { painTitle?: string; painTitleEn?: string }>)[DEMO_BUILD_IDEA.idea];
  const demo = {
    href: `${lp}/build/${DEMO_BUILD_IDEA.category}/${DEMO_BUILD_IDEA.idea}`,
    title: (ru ? demoCopy?.painTitle : demoCopy?.painTitleEn) || "",
    cover: (ideaCovers as Record<string, string>)[DEMO_BUILD_IDEA.idea],
    niche: (() => {
      const r = (RATING_BY_SLUG as Record<string, RSet>)[DEMO_BUILD_IDEA.category];
      return (ru ? r?.name : r?.nameEn) || r?.name || "";
    })(),
  };

  // Геометрия из фигмы (Port, 2252:3067), позиционирование от ЦЕНТРА
  // повёрнутого бокса: огонь центр 61/63 при 115% и 18°, лампа 65/50 при
  // 105% (режется сверху и снизу), ракета 72/55 при 95%.
  const how = [
    { img: "/build/flame.webp", t: ru ? "Выбери\nболь людей" : "Pick\na real pain", g: "bg-[radial-gradient(circle_at_50%_46%,#e87e28_28%,#e6402b_64%,#e4022d_96%)]", pos: "top", art: { width: "115%", left: "61%", top: "63%", transform: "translate(-50%, -50%) rotate(18.44deg)" } },
    { img: "/build/bulb.webp", t: ru ? "Получи\nидею" : "Get\nthe idea", g: "bg-[radial-gradient(circle_at_50%_46%,#8f43ea_30%,#722cc7_68%,#5615a4_96%)]", pos: "mid", art: { width: "132%", left: "75%", top: "50%", transform: "translate(-50%, -50%) rotate(8.33deg)" } },
    { img: "/build/rocket.webp", t: ru ? "Собери\nи запусти" : "Build\nand launch", g: "bg-[radial-gradient(circle_at_35%_38%,#63a5f2_0%,#3670e4_62%,#2b62d9_100%)]", pos: "top", art: { width: "112%", left: "66%", top: "56%", transform: "translate(-50%, -50%)" } },
  ];

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">{ru ? "Собери своё приложение" : "Build your own app"}</h1>
        <p className="mx-auto mt-5 max-w-[56ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Мы детально разобрали <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalApps.toLocaleString("ru-RU")}</span> приложений и <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("ru-RU")}</span> реальных отзывов в {all.length} нишах, собрали {totalIdeas} проверенных болей: видно заранее, за что люди уже платят и на что жалуются. Выбираешь боль, получаешь план и собираешь приложение за вечер с любой нейросетью.</>
            : <>We took apart <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalApps.toLocaleString("en-US")}</span> apps and <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{totalReviews.toLocaleString("en-US")}</span> real reviews across {all.length} niches and verified {totalIdeas} pains: you see in advance what people already pay for and complain about. Pick a pain, get the plan and build the app in an evening with whatever AI you use.</>}
        </p>
      </header>

      <div className="mt-10 grid grid-cols-3 gap-2.5 sm:gap-3">
        {how.map(({ img, t, g, pos, art }, i) => (
          <div key={i} className={`relative aspect-square overflow-hidden rounded-[20px] sm:rounded-[26px] ${g}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt="" className="absolute max-w-none" style={art} />
            <div className={`absolute left-3.5 whitespace-pre-line text-footnote font-bold leading-tight text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.3)] sm:left-5 sm:text-title3 ${pos === "mid" ? "top-1/2 -translate-y-1/2" : "top-3 sm:top-5"}`}>{t}</div>
          </div>
        ))}
      </div>

      {!access.unlimited && demo.title && (
        <Link href={demo.href} className="card-min group mt-10 flex items-center gap-4 rounded-[24px] p-4 transition-colors hover:border-[var(--color-border-strong)] sm:gap-5 sm:p-5">
          {demo.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={demo.cover} alt="" loading="lazy" decoding="async" className="h-[72px] w-[104px] shrink-0 rounded-[16px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-caption font-bold text-[#1f9d47]">{ru ? "Пример открыт всем" : "Open example"}</div>
            <div className="mt-1 text-body font-semibold text-pretty text-[var(--color-text-primary)]">{demo.title}</div>
            <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{ru ? `Пройди сборку от боли до плана в нише «${demo.niche}»` : `Walk the build from pain to plan in ${demo.niche}`}</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </Link>
      )}

      <div className="mt-10"><BuildProgress active={0} doneCount={0} ru={ru} sticky={false} /></div>

      <section className="mt-10">
        <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Шаг 1. Выбери нишу" : "Step 1. Pick the niche"}</h2>
        <p className="mt-2 max-w-[58ch] text-callout text-[var(--color-text-secondary)]">
          {ru ? "Выше стоят ниши, где у новичка больше шансов: меньше гигантов и накрутки." : "Niches where a newcomer has the best odds are on top: fewer giants, less fakery."}
          {!access.unlimited && (ru
            ? " Боли каждой ниши видны бесплатно. Одна идея открыта всем как пример, вход открывает четыре отобранные, один платёж открывает всё."
            : " Every niche's pains are free to read. One idea is open to everyone as the example, a sign-in opens four hand-picked ones, a single payment opens everything.")}
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          {niches.map((n) => (
            <Link key={n.slug} href={`${lp}/build/${n.slug}`} className="card-min group flex items-center gap-4 rounded-[20px] p-4 transition-colors hover:border-[var(--color-border-strong)] sm:p-5">
              {n.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={n.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[24%] bg-[var(--color-bg-muted)] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                : <span className="size-11 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
              <div className="min-w-0 flex-1">
                <div className="text-body font-semibold text-[var(--color-text-primary)]">{n.name}</div>
                <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{n.ideas} {ru ? "проверенных болей" : "verified pains"}</div>
              </div>
              {n.promo > 0 && (
                <span className={`shrink-0 rounded-full px-3 py-1.5 text-caption font-bold tabular-nums ${n.promo >= 60 ? "bg-[#30d158]/15 text-[#1f9d47]" : n.promo >= 45 ? "bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)]" : "bg-[var(--color-bg-muted)] text-[var(--color-text-tertiary)]"}`}>
                  {ru ? `шанс ${n.promo}` : `odds ${n.promo}`}
                </span>
              )}
              {n.open
                ? <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                : <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.4" /></svg>}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
