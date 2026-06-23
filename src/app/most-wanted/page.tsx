import type { Metadata } from "next";
import Link from "next/link";
import { listIdeas, type Idea } from "@/lib/ideas";
import { PREMIUM_NICHE_SET } from "@/lib/premiumNiches";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { appCardsFor, descriptionFor, type RegenCard } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { hasInsight } from "@/lib/readyApps";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import insightsData from "@/data/insights.json";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

// Cornerstone editorial: a McKinsey-style market read of the app landscape from
// real reviews — context + named competitors (loved/hated, with quotes) + the
// gap + what to build + synthesis. Proof-first, no invented numbers.

const nf = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");

type EvLike = { app?: string; rating: number; quote: string; quoteRu?: string };
function quoteText(e: EvLike | undefined, ru: boolean) {
  if (!e) return null;
  return { app: e.app ?? "", rating: e.rating, text: ru ? e.quoteRu ?? e.quote : e.quote };
}
function topCard(cards: RegenCard[], pole: "plus" | "minus") {
  return cards.filter((c) => (c[pole] ?? "").trim()).sort((a, b) => b.count - a.count)[0] ?? null;
}
function avgRating(pid: string): number | null {
  const hist = getProductInsights(pid)?.ratingBreakdown ?? {};
  const total = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
  if (!total) return null;
  return [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / total;
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru
    ? "Приложения, которые люди умоляют сделать — а их до сих пор нет"
    : "Apps people beg for — that still don't exist";
  const description = ru
    ? "Разбор рынка приложений по 555 000 отзывов: что любят, на что злятся и какие приложения люди умоляют сделать. С названными конкурентами, цитатами и выводами."
    : "An app-market read from 555,000 reviews: what users love, what enrages them and which apps people beg for. Named competitors, quotes and conclusions.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted`;
  return {
    title,
    description,
    keywords: ru ? ["идеи приложений", "какое приложение сделать", "анализ рынка приложений", "идея для стартапа", "ниши приложений 2026"] : ["app ideas", "what app to build", "app market analysis", "startup idea", "app niches 2026"],
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru/most-wanted", en: "https://inapp.pro/en/most-wanted", "x-default": "https://inapp.pro/en/most-wanted" } },
    openGraph: { title, description, type: "article", url, siteName: "inApp", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description, images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function MostWantedPage() {
  const locale = await getLocale();
  const ru = locale !== "en";

  const ideasAll = listIdeas();
  const totalReviews = (insightsData as { reviewsScanned?: number }[]).reduce((s, a) => s + (a.reviewsScanned || 0), 0);
  const totalApps = (insightsData as unknown[]).length;
  const totalIdeas = ideasAll.length;
  // Global average rating across the whole dataset — the "market health" exhibit.
  let rSum = 0, rCnt = 0;
  for (const a of insightsData as { ratingBreakdown?: Record<string, number> }[]) {
    const h = a.ratingBreakdown ?? {};
    for (const n of [1, 2, 3, 4, 5]) { rSum += n * (h[String(n)] ?? 0); rCnt += h[String(n)] ?? 0; }
  }
  const globalAvg = rCnt ? rSum / rCnt : null;

  // Rank premium niches by the demand behind their top gap; go deep on the best 4.
  const nicheList = [...PREMIUM_NICHE_SET]
    .map((slug) => ({ slug, idea: ideasAll.find((i) => i.category === slug) as Idea | undefined }))
    .filter((n): n is { slug: string; idea: Idea } => !!n.idea && !!getNicheThesis(n.slug, locale) && !!getCategoryBySlug(n.slug, locale))
    .sort((a, b) => (b.idea.stats?.observations ?? 0) - (a.idea.stats?.observations ?? 0))
    .slice(0, 4);

  const sections = nicheList.map(({ slug, idea }) => {
    const cat = getCategoryBySlug(slug, locale)!;
    const thesis = getNicheThesis(slug, locale)!;
    const summary = getSegmentSummary(slug);
    const leaders = cat.apps
      .filter((a) => hasInsight(a.productId))
      .slice(0, 2)
      .map((a) => {
        const pid = a.productId as string;
        const cards = appCardsFor(pid, locale)?.product ?? [];
        const love = topCard(cards, "plus");
        const flaw = topCard(cards, "minus");
        return {
          name: a.name,
          icon: a.icon,
          avg: avgRating(pid),
          desc: descriptionFor(pid, locale, getProductInsights(pid)?.description),
          love: love?.title ?? null,
          flaw: flaw?.title ?? null,
          quote: quoteText((flaw?.evidence as EvLike[] | undefined)?.[0], ru),
        };
      })
      .filter((a) => a.flaw || a.love);
    const begs = [...idea.reviewGrid].sort((a, b) => a.rating - b.rating || a.quote.length - b.quote.length).slice(0, 2);
    return { slug, cat, thesis, summary, idea, leaders, begs };
  });

  const stats = [
    { n: nf(totalReviews, ru), l: ru ? "отзывов прочитано" : "reviews read" },
    { n: nf(totalApps, ru), l: ru ? "приложений" : "apps" },
    { n: `${PREMIUM_NICHE_SET.size}`, l: ru ? "ниш разобрано" : "niches analyzed" },
    { n: globalAvg ? `${globalAvg.toFixed(1)}★` : "—", l: ru ? "средний рейтинг" : "avg rating" },
  ];

  const takeaways = ru
    ? [
        { t: "Побеждает не «больше фич», а одно дело идеально", d: "В каждой нише лидеры тонут в просьбах «верните как было» и «уберите лишнее». Победа — в скорости, надёжности и фокусе, а не в длине списка функций." },
        { t: "Скорость и сохранность — это позиционирование", d: "«Открылось мгновенно, ничего не потерялось, всё на новом телефоне» — половина пятёрок. Это не гигиена, это причина остаться." },
        { t: "Платная стена злит сильнее багов", d: "Самые яростные отзывы — не про вылеты, а про обрезанный функционал, навязчивые подписки и «отобрали то, к чему привык»." },
        { t: "«Рынок переполнен» — миф", d: "Высокий средний рейтинг уживается с тысячами однотипных «1★, бесит». Спрос на «то же, но без боли» — открыт." },
      ]
    : [
        { t: "Not more features — one thing done perfectly", d: "In every niche the leaders drown in 'bring back the old way' and 'remove the clutter'. The win is speed, reliability and focus — not a longer feature list." },
        { t: "Speed and data-safety are positioning", d: "'Opened instantly, nothing lost, everything on the new phone' — half of the 5-stars. Not hygiene — the reason to stay." },
        { t: "Paywalls enrage more than bugs", d: "The angriest reviews aren't about crashes — they're about gutted features, pushy subscriptions and 'you took away what I was used to'." },
        { t: "'The market is crowded' is a myth", d: "A high average rating coexists with thousands of identical 1-star 'this is infuriating'. Demand for 'the same, minus the pain' is wide open." },
      ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: ru ? "Приложения, которые люди умоляют сделать — а их до сих пор нет" : "Apps people beg for — that still don't exist", inLanguage: ru ? "ru" : "en", author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" }, publisher: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" } },
      { "@type": "ItemList", numberOfItems: sections.length, itemListElement: sections.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: s.cat.name })) },
    ],
  };

  return (
    <main className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      {/* HERO */}
      <header className="text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Разбор рынка по отзывам" : "A market read from reviews"}</div>
        <h1 className="glow-sweep mx-auto mt-6 max-w-[16ch] text-[clamp(32px,8.5vw,64px)] font-black leading-[0.98] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Приложения, которые люди умоляют сделать" : "Apps people beg for"}
        </h1>
        <p className="mx-auto mt-7 max-w-[56ch] text-[18px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[20px]">
          {ru
            ? <>Я месяц читал отзывы — <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> штук на <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> приложений. Ниши выглядят занятыми, рейтинги высокие — но под ними одна и та же фрустрация, которую никто не закрыл. Вот разбор: с конкурентами, цитатами и выводами.</>
            : <>I spent a month reading reviews — <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> across <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> apps. The niches look taken, the ratings are high — yet underneath sits the same unmet frustration. Here is the read — competitors, quotes and conclusions.</>}
        </p>
      </header>

      {/* MARKET CONTEXT — the dataset exhibit */}
      <section className="mt-14 rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-7 sm:p-9">
        <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-brand)]">{ru ? "Контекст" : "Context"}</div>
        <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.l} className="flex flex-col">
              <span className="text-[28px] font-black leading-none tracking-[-0.03em] tabular-nums text-[var(--color-text-primary)] sm:text-[34px]">{s.n}</span>
              <span className="mt-2 text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
        <p className="mt-7 max-w-[60ch] text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">
          {ru
            ? `Средний рейтинг ${globalAvg ? globalAvg.toFixed(1) : "—"}★ создаёт ощущение, что рынок занят. Но рейтинг — это медиана довольных; в хвосте из единиц и двоек повторяется один и тот же сценарий. Разберём четыре ниши, где разрыв виден яснее всего.`
            : `An average of ${globalAvg ? globalAvg.toFixed(1) : "—"}★ makes the market feel taken. But the rating is the median of the satisfied; in the 1–2★ tail the same script repeats. Below: four niches where the gap is clearest.`}
        </p>
      </section>

      {/* NICHE DEEP-DIVES */}
      <div className="mt-20 flex flex-col gap-24 sm:mt-28 sm:gap-32">
        {sections.map((s, i) => (
          <Reveal key={s.slug}>
            <article>
              <div className="flex items-baseline gap-3 text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                <span className="text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                <span>{s.cat.name}</span>
                {s.summary && <span className="tabular-nums">· {nf(s.summary.reviewsScanned, ru)} {ru ? "отзывов" : "reviews"}</span>}
              </div>

              {/* Thesis */}
              <h2 className="mt-5 text-[27px] font-black leading-[1.08] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[34px]">{tg(s.cat.name)}</h2>
              {s.thesis.governing && <p className="mt-5 max-w-[62ch] text-[19px] font-light leading-[1.5] text-[var(--color-text-secondary)] sm:text-[21px]">{tg(s.thesis.governing)}</p>}

              {/* Competitive landscape — named apps */}
              {s.leaders.length > 0 && (
                <div className="mt-9">
                  <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Кто уже на рынке" : "Who's already there"}</div>
                  <div className="mt-4 flex flex-col gap-4">
                    {s.leaders.map((a, k) => (
                      <div key={k} className="rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5">
                        <div className="flex items-center gap-3.5">
                          {a.icon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[13px] object-cover" />
                          ) : <div className="size-12 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{a.name}</span>
                              {a.avg != null && <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--color-text-tertiary)]">{a.avg.toFixed(1)}★</span>}
                            </div>
                            {a.desc && <span className="line-clamp-1 text-[13px] text-[var(--color-text-tertiary)]">{a.desc}</span>}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-col gap-1.5 text-[14px] leading-snug">
                          {a.love && <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-[#4ade80]">{ru ? "Любят:" : "Loved:"}</span> {tg(a.love)}</p>}
                          {a.flaw && <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-[#ff8585]">{ru ? "Бесит:" : "Hated:"}</span> {tg(a.flaw)}</p>}
                        </div>
                        {a.quote && (
                          <figure className="msg-bubble mt-3 max-w-[94%] self-start rounded-[16px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-2.5">
                            <p className="text-[13.5px] italic leading-[1.5] text-[var(--color-text-secondary)]">{tg(a.quote.text)}</p>
                            <figcaption className="mt-1 text-[11.5px] not-italic tabular-nums text-[var(--color-text-tertiary)]">{a.quote.app} · {a.quote.rating}★</figcaption>
                          </figure>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* The gap */}
              <div className="mt-9 border-l-2 border-[var(--color-text-brand)] pl-5">
                <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? `Разрыв · ${nf(s.idea.stats?.observations ?? 0, ru)} наблюдений спроса` : `The gap · ${nf(s.idea.stats?.observations ?? 0, ru)} demand signals`}</div>
                <p className="mt-2.5 text-[17px] font-semibold leading-[1.45] text-[var(--color-text-primary)]">{tg(s.idea.title)}</p>
                {s.idea.gap && <p className="mt-2 text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">{tg(s.idea.gap)}</p>}
              </div>

              {/* Begging quotes */}
              {s.begs.length > 0 && (
                <div className="mt-6 flex flex-col gap-2.5">
                  {s.begs.map((q, j) => (
                    <figure key={j} className="msg-bubble max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
                      <p className="text-[14px] italic leading-[1.55] text-[var(--color-text-secondary)]">{tg(q.quote)}</p>
                      <figcaption className="mt-1.5 text-[12px] not-italic tabular-nums text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</figcaption>
                    </figure>
                  ))}
                </div>
              )}

              {/* What to build */}
              {(s.idea.idea?.pitch || s.idea.idea?.monetization) && (
                <div className="mt-7 rounded-[18px] bg-[var(--color-surface-card-subtle)] p-5">
                  {s.idea.idea?.pitch && <p className="text-[15px] leading-[1.6] text-[var(--color-text-primary)]"><span className="font-semibold">{ru ? "Что построить. " : "What to build. "}</span>{tg(s.idea.idea.pitch)}</p>}
                  {s.idea.idea?.monetization && <p className="mt-2 text-[14px] leading-[1.6] text-[var(--color-text-tertiary)]"><span className="font-semibold text-[var(--color-text-secondary)]">{ru ? "Деньги. " : "Money. "}</span>{tg(s.idea.idea.monetization)}</p>}
                </div>
              )}

              <Link href={`/segment/${s.slug}`} className="mt-7 flex items-center rounded-[14px] border border-[var(--color-border-subtle)] px-4 py-3.5 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]">
                {ru ? `Полный разбор ниши «${s.cat.name}»` : `Full niche breakdown: ${s.cat.name}`}
              </Link>
            </article>
          </Reveal>
        ))}
      </div>

      {/* SYNTHESIS */}
      <section className="mt-24 border-t border-[var(--color-border-subtle)] pt-14 sm:mt-32">
        <div className="text-center text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-brand)]">{ru ? "Выводы" : "Takeaways"}</div>
        <h2 className="mt-3 text-center text-[28px] font-black tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[36px]">{ru ? "Что это значит для тебя" : "What it means for you"}</h2>
        <div className="mt-10 flex flex-col divide-y divide-[var(--color-border-subtle)]">
          {takeaways.map((t, i) => (
            <div key={i} className={i === 0 ? "pb-6" : "py-6 last:pb-0"}>
              <div className="flex gap-4">
                <span className="text-[15px] font-black tabular-nums text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                <div>
                  <p className="text-[18px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--color-text-primary)]">{t.t}</p>
                  <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{t.d}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20 text-center">
        <p className="mx-auto max-w-[48ch] text-[16px] leading-[1.6] text-[var(--color-text-secondary)]">
          {ru
            ? `Это 4 ниши из 13 и одна идея из ${nf(totalIdeas, ru)}. По каждой нише — все идеи под спрос, полный разбор конкурентов и цитаты.`
            : `That's 4 niches of 13 and one idea of ${nf(totalIdeas, ru)}. Per niche — all demand-backed ideas, the full competitor teardown and quotes.`}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cards" className="btn-shimmer inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[16px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
            🎴 {ru ? "Колода идей — тяни карту" : "Idea deck — draw a card"}
          </Link>
          <Link href="/catalog" className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-7 py-4 text-[16px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-tertiary)]">
            {ru ? "Все ниши" : "All niches"}
          </Link>
        </div>
      </section>
    </main>
  );
}
