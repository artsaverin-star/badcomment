/* eslint-disable react/no-unescaped-entities */
import type { Metadata } from "next";
import Link from "next/link";
import { listIdeas, type Idea } from "@/lib/ideas";
import { PREMIUM_NICHE_SET } from "@/lib/premiumNiches";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import insightsData from "@/data/insights.json";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

// Cornerstone editorial — written as an essay (NYT-style), organized by the
// patterns that recur across niches, not as a per-niche card grid. Argument +
// real evidence: named apps, real review quotes (faithfully translated from the
// store originals) and real demand numbers. The "opportunities" + scale numbers
// are pulled live from our data; the patterns and quote translations are authored.

const nf = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");

type Q = { text: string; app: string; rating: number };

function Quote({ q }: { q: Q }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="msg-bubble max-w-[88%] self-start rounded-[20px] rounded-bl-[6px] bg-[var(--color-bg-muted)] px-4 py-2.5 text-[14.5px] leading-[1.45] text-[var(--color-text-primary)]">{q.text}</div>
      <span className="pl-2 text-[11.5px] tabular-nums text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</span>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru ? "Приложения, которые люди умоляют сделать — а их до сих пор нет" : "Apps people beg for — that still don't exist";
  const description = ru
    ? "Разбор рынка приложений по 555 000 отзывов: три паттерна, которые повторяются в каждой нише, с названными приложениями, цитатами и идеями под спрос."
    : "An app-market read from 555,000 reviews: three patterns that recur in every niche, with named apps, quotes and demand-backed ideas.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted`;
  return {
    title,
    description,
    keywords: ru ? ["идеи приложений", "какое приложение сделать", "анализ рынка приложений", "идея для стартапа"] : ["app ideas", "what app to build", "app market analysis", "startup idea"],
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
  let rSum = 0, rCnt = 0;
  for (const a of insightsData as { ratingBreakdown?: Record<string, number> }[]) {
    const h = a.ratingBreakdown ?? {};
    for (const n of [1, 2, 3, 4, 5]) { rSum += n * (h[String(n)] ?? 0); rCnt += h[String(n)] ?? 0; }
  }
  const avg = rCnt ? (rSum / rCnt).toFixed(1).replace(".", ru ? "," : ".") : "—";

  // Real opportunities — top gap per niche, pulled live (gap text is authored RU).
  const seen = new Set<string>();
  const gaps: Idea[] = [];
  for (const i of ideasAll) {
    if (!PREMIUM_NICHE_SET.has(i.category) || seen.has(i.category)) continue;
    seen.add(i.category);
    gaps.push(i);
    if (gaps.length >= 4) break;
  }

  // Real review quotes (faithful RU translations of the store originals; EN kept for the EN page).
  const Q1: Q[] = ru
    ? [
        { text: "После трёх привычек оно не дало добавить четвёртую без премиума. Пока-пока.", app: "HabitGenius", rating: 1 },
        { text: "Я заплатил — потому что они хитро задрали цену уже после того, как ты накопил кучу заметок.", app: "Evernote", rating: 1 },
      ]
    : [
        { text: "After three habits, it wouldn't let me make another unless I bought premium. Bye.", app: "HabitGenius", rating: 1 },
        { text: "I paid — because of the clever way they jacked up the price after you'd built up your notes.", app: "Evernote", rating: 1 },
      ];
  const Q2: Q[] = ru
    ? [
        { text: "Приложение не восстановило ни одной моей записи. Я понятия не имею, по каким дням что поливал. С 40 растениями дома это просто катастрофа.", app: "Blossom", rating: 1 },
        { text: "Последнее обновление перемешало или стёрло около 20% моих заметок и удалило половину сохранённых картинок.", app: "Evernote", rating: 1 },
      ]
    : [
        { text: "This app didn't restore any of my data. I have no clue what days I watered. With 40 plants this is truly devastating.", app: "Blossom", rating: 1 },
        { text: "Their latest update scrambled or erased about 20% of my notes and deleted half my pictures.", app: "Evernote", rating: 1 },
      ];
  const Q3: Q[] = ru
    ? [
        { text: "Оно советовало заливать некоторые растения — корни гнили, и растение погибало.", app: "Blossom", rating: 1 },
        { text: "Я ушёл на бесплатные альтернативы из-за встроенного Gemini, который я не просил и которым не пользуюсь.", app: "Google Keep", rating: 1 },
      ]
    : [
        { text: "It told me to grossly overwater plants — root rot, then the plant died.", app: "Blossom", rating: 1 },
        { text: "I left for free alternatives because of the built-in Gemini I never asked for and don't use.", app: "Google Keep", rating: 1 },
      ];

  const para = "mt-5 max-w-[62ch] text-[17px] leading-[1.7] text-[var(--color-text-secondary)] sm:text-[18px]";
  const lead = "text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-brand)]";
  const h2 = "text-[26px] font-black leading-[1.12] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[34px]";
  const strong = "font-semibold text-[var(--color-text-primary)]";

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Article", headline: ru ? "Приложения, которые люди умоляют сделать — а их до сих пор нет" : "Apps people beg for — that still don't exist", inLanguage: ru ? "ru" : "en", author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" }, publisher: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" } },
    ],
  };

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      {/* HERO */}
      <header>
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Разбор рынка по отзывам" : "A market read from reviews"}</div>
        <h1 className="glow-sweep mt-6 max-w-[18ch] text-[clamp(32px,8vw,58px)] font-black leading-[1.0] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Приложения, которые люди умоляют сделать" : "Apps people beg for"}
        </h1>
        <p className="mt-7 max-w-[60ch] text-[18px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[20px]">
          {ru ? (
            <>Я месяц читал отзывы — <span className={strong}>{nf(totalReviews, ru)}</span> на <span className={strong}>{nf(totalApps, ru)}</span> приложений. Средний рейтинг — <span className={strong}>{avg}★</span>, и он усыпляет: кажется, всё уже сделано. Но звёзды ставят довольные. В хвосте из единиц повторяются три истории — и ни одна не про нехватку функций.</>
          ) : (
            <>I spent a month reading <span className={strong}>{nf(totalReviews, ru)}</span> reviews across <span className={strong}>{nf(totalApps, ru)}</span> apps. The average is <span className={strong}>{avg}★</span> — reassuring, like it's all been done. But stars come from the happy. In the 1-star tail, three stories repeat — none about missing features.</>
          )}
        </p>
      </header>

      {/* I — PAYWALL BEFORE VALUE */}
      <Reveal className="mt-20 sm:mt-28">
        <section>
          <div className={lead}>{ru ? "Паттерн 01" : "Pattern 01"}</div>
          <h2 className={`mt-4 ${h2}`}>{ru ? "Стену ставят ровно там, где обещали ценность" : "The wall goes up exactly where the value was promised"}</h2>
          <p className={para}>
            {ru
              ? <>Самый частый сюжет плохого отзыва — не вылет и не баг. Это момент, когда приложение берёт тебя за горло там, где ты пришёл за пользой. <span className={strong}>HabitGenius</span> даёт завести три привычки — и упирает в платную стену на четвёртой. <span className={strong}>Evernote</span> ждёт, пока ты накопишь заметки за годы, и поднимает цену.</>
              : <>The most common bad-review plot isn't a crash or a bug. It's the moment the app grabs you by the throat right where you came for value. <span className={strong}>HabitGenius</span> lets you add three habits — then walls off the fourth. <span className={strong}>Evernote</span> waits until you've piled up years of notes, then raises the price.</>}
          </p>
          <div className="mt-7 flex flex-col gap-3">{Q1.map((q, i) => <Quote key={i} q={q} />)}</div>
          <p className={para}>
            {ru
              ? <>Паттерн один на все ниши: монетизируют именно ту секунду, ради которой скачали — диагноз больного растения, четвёртую привычку, накопленный архив. И теряют доверие за миг до ценности.</>
              : <>One pattern across niches: they monetize the exact second you came for — the sick-plant diagnosis, the fourth habit, the archive you built. And lose trust a breath before the value.</>}
          </p>
        </section>
      </Reveal>

      {/* II — DATA LOSS IS BETRAYAL */}
      <Reveal className="mt-20 sm:mt-28">
        <section>
          <div className={lead}>{ru ? "Паттерн 02" : "Pattern 02"}</div>
          <h2 className={`mt-4 ${h2}`}>{ru ? "Потерять данные — значит предать" : "Lose the data, and it's a betrayal"}</h2>
          <p className={para}>
            {ru
              ? <>Если первый грех — жадность, второй — беспамятство. Ни в одной нише не прощают потерю того, что уже накопили. Садовый трекер <span className={strong}>Blossom</span> теряет историю полива у человека с 40 растениями. Обновление <span className={strong}>Evernote</span> стирает пятую часть заметок.</>
              : <>If the first sin is greed, the second is amnesia. No niche forgives losing what you've already built. The garden tracker <span className={strong}>Blossom</span> wipes a 40-plant watering history. An <span className={strong}>Evernote</span> update erases a fifth of someone's notes.</>}
          </p>
          <div className="mt-7 flex flex-col gap-3">{Q2.map((q, i) => <Quote key={i} q={q} />)}</div>
          <p className={para}>
            {ru
              ? <>Сохранность данных — не гигиена, а само основание доверия. Сломал его обновлением — пользователь уходит и пишет об этом всем.</>
              : <>Data-safety isn't hygiene — it's the foundation of trust. Break it with an update and the user leaves, loudly.</>}
          </p>
        </section>
      </Reveal>

      {/* III — THE SMART THING NOBODY ASKED FOR */}
      <Reveal className="mt-20 sm:mt-28">
        <section>
          <div className={lead}>{ru ? "Паттерн 03" : "Pattern 03"}</div>
          <h2 className={`mt-4 ${h2}`}>{ru ? "«Умное», которого никто не просил" : "The 'smart' thing nobody asked for"}</h2>
          <p className={para}>
            {ru
              ? <>Третий паттерн коварнее всех — команды считают его прогрессом. Это «умная» функция, которая ломается о реальность или которую никто не звал. <span className={strong}>Blossom</span> советует полив «по холодному климату» и заливает растения до гнили. <span className={strong}>Google Keep</span> встраивает Gemini, которого не просили.</>
              : <>The third pattern is the sneakiest — teams call it progress. It's the "smart" feature that breaks on reality or that nobody invited. <span className={strong}>Blossom</span> recommends "cold-climate" watering and drowns plants into root rot. <span className={strong}>Google Keep</span> bolts on a Gemini nobody asked for.</>}
          </p>
          <div className="mt-7 flex flex-col gap-3">{Q3.map((q, i) => <Quote key={i} q={q} />)}</div>
          <p className={para}>
            {ru
              ? <>Люди приходят за простой надёжной привычкой. Им подсовывают модель мира, которая не совпадает с их миром, — и называют это интеллектом.</>
              : <>People come for a simple, reliable habit. They get a model of the world that doesn't match theirs — and it's called intelligence.</>}
          </p>
        </section>
      </Reveal>

      {/* OPPORTUNITIES — the real gaps */}
      <Reveal className="mt-24 sm:mt-32">
        <section>
          <div className={lead}>{ru ? "Что из этого напрашивается" : "What follows from this"}</div>
          <h2 className={`mt-4 ${h2}`}>{ru ? "Чего на самом деле просят" : "What people are actually asking for"}</h2>
          <p className={para}>
            {ru
              ? "Сложите три паттерна — и видно: просят не больше функций, а честную цену, сохранность данных и одно дело, доведённое до конца. Вот разрывы, под которыми стоит измеримый спрос."
              : "Stack the three patterns and it's clear: not more features, but fair pricing, data-safety and one thing finished. Here are the gaps with measurable demand behind them."}
          </p>
          <div className="mt-10 flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {gaps.map((g, i) => (
              <Link key={g.slug} href={`/segment/${g.category}`} className="group block py-6 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  <span className="text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                  <span>{g.categoryName}</span>
                  <span className="tabular-nums">· {nf(g.stats?.observations ?? 0, ru)} {ru ? "за спрос" : "demand signals"}</span>
                </div>
                <p className="mt-2.5 text-[19px] font-bold leading-[1.25] tracking-[-0.01em] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-text-brand)] sm:text-[21px]">{tg(g.title)}</p>
                {g.gap && <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{tg(g.gap)}</p>}
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* CTA */}
      <section className="mt-24 border-t border-[var(--color-border-subtle)] pt-14 text-center sm:mt-32">
        <p className="mx-auto max-w-[44ch] text-[22px] font-light leading-[1.4] text-[var(--color-text-primary)] sm:text-[26px]">
          {ru ? "Ниша не «занята», когда лидеры теряют доверие на каждом шагу. Она открыта." : "A niche isn't 'taken' when the leaders lose trust at every step. It's open."}
        </p>
        <p className="mx-auto mt-5 max-w-[48ch] text-[15px] leading-[1.6] text-[var(--color-text-tertiary)]">
          {ru ? `Это три паттерна и ${gaps.length} разрыва из ${nf(totalIdeas, ru)} идей под спрос. По каждой нише — все идеи, полный разбор конкурентов и цитаты.` : `Three patterns and ${gaps.length} gaps of ${nf(totalIdeas, ru)} demand-backed ideas. Per niche — all ideas, the full teardown and quotes.`}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cards" className="btn-shimmer inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[16px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
            🎴 {ru ? "Колода идей — тяни карту" : "Idea deck — draw a card"}
          </Link>
          <Link href="/catalog" className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-7 py-4 text-[16px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-tertiary)]">
            {ru ? "Все ниши" : "All niches"}
          </Link>
        </div>
        <p className="mx-auto mt-10 max-w-[40ch] text-[12px] leading-[1.5] text-[var(--color-text-tertiary)]">
          {ru ? "Цитаты — перевод реальных отзывов из App Store и Google Play. Цифры спроса — из извлечённых наблюдений." : "Quotes are translations of real App Store / Google Play reviews. Demand numbers come from extracted observations."}
        </p>
      </section>
    </main>
  );
}
