/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { listIdeas, type Idea } from "@/lib/ideas";
import { PREMIUM_NICHE_SET } from "@/lib/premiumNiches";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { hasInsight } from "@/lib/readyApps";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import insightsData from "@/data/insights.json";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Reveal from "@/components/Reveal";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// Cornerstone editorial — a deep JTBD read, not a list of complaints. The thesis:
// apps compete on intelligence; users buy the boring job done without friction.
// Built on REAL praise quotes (they reveal the job), real app icons + numbers.
// Honest framing: the pipeline ANALYZED the reviews (a human can't read 555k).

const nf = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");
type Q = { text: string; app: string; rating: number };

function iconsFor(slug: string, locale: Locale): string[] {
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) return [];
  return cat.apps.filter((a) => hasInsight(a.productId) && a.icon).map((a) => a.icon as string).slice(0, 6);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru ? "Чего люди на самом деле хотят от приложений — разбор 555 000 отзывов" : "What people actually want from apps — a read of 555,000 reviews";
  const description = ru
    ? "Приложения соревнуются в уме, а люди приходят за скучной работой без трения. Глубокий разбор по нишам: что на самом деле нанимают приложение делать — и что из этого строить."
    : "Apps compete on intelligence; people come for the boring job done without friction. A deep niche-by-niche read of the real job — and what to build.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted`;
  return {
    title,
    description,
    keywords: ru ? ["идеи приложений", "какое приложение сделать", "jobs to be done", "анализ рынка приложений", "идея для стартапа"] : ["app ideas", "what app to build", "jobs to be done", "app market analysis"],
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
  let rSum = 0, rCnt = 0;
  for (const a of insightsData as { ratingBreakdown?: Record<string, number> }[]) {
    const h = a.ratingBreakdown ?? {};
    for (const n of [1, 2, 3, 4, 5]) { rSum += n * (h[String(n)] ?? 0); rCnt += h[String(n)] ?? 0; }
  }
  const avg = rCnt ? (rSum / rCnt).toFixed(1).replace(".", ru ? "," : ".") : "—";

  const seen = new Set<string>();
  const gaps: Idea[] = [];
  for (const i of ideasAll) {
    if (!PREMIUM_NICHE_SET.has(i.category) || seen.has(i.category)) continue;
    seen.add(i.category);
    gaps.push(i);
    if (gaps.length >= 5) break;
  }

  type Insight = { slug: string; eyebrow: string; title: string; setup: React.ReactNode; quotes: Q[]; reveal: React.ReactNode };
  const insights: Insight[] = [
    {
      slug: "plant-care",
      eyebrow: ru ? "Уход за растениями" : "Plant care",
      title: ru ? "Продают ботаника — покупают спокойствие" : "They sell a botanist — people buy peace of mind",
      setup: ru
        ? <>Кажется, что приложение для растений — это про распознавание: навёл камеру, узнал вид, получил умный диагноз. На это уходит весь маркетинг и почти вся разработка. Но прочитайте, за что их на самом деле благодарят на пять звёзд:</>
        : <>A plant app looks like it's about recognition: point the camera, learn the species, get a smart diagnosis. That's where the marketing and most of the engineering go. But read what the 5-star reviews actually thank them for:</>,
      quotes: ru
        ? [{ text: "Напоминания об уходе — единственное, что помогло сохранить 41 комнатное растение живым.", app: "Planta", rating: 5 }, { text: "Я вечно забываю их поливать, но это невероятно помогает — растения процветают.", app: "Plant Parent", rating: 5 }]
        : [{ text: "The care reminders are the only way I've kept 41 houseplants alive and thriving!", app: "Planta", rating: 5 }, { text: "I always forget to water them, but this is incredibly helpful — my plants are thriving.", app: "Plant Parent", rating: 5 }],
      reveal: ru
        ? <>Ни слова про распознавание. Работа, ради которой остаются, — не «определи вид», а «не дай мне его убить». Это продукт про тревогу и забывчивость, а не про ботанику. Распознавание — крючок, чтобы скачать; ежедневная привычка полива — причина остаться. Почти все вкладываются в первое и недо-вкладываются во второе. Кто построит уход за растениями как мягкую систему против забывчивости (с напоминаниями, которые подстраиваются под реальные условия, а не под усреднённый шаблон), заберёт удержание целиком.</>
        : <>Not a word about recognition. The job people stay for isn't "identify the species" — it's "don't let me kill it." This is a product about anxiety and forgetfulness, not botany. Recognition is the hook to download; the daily watering habit is the reason to stay. Almost everyone over-invests in the first and under-invests in the second. Build plant care as a gentle anti-forgetfulness system — reminders that adapt to real conditions, not an averaged template — and you take the retention.</>,
    },
    {
      slug: "notes-pkm",
      eyebrow: ru ? "Заметки и PKM" : "Notes & PKM",
      title: ru ? "Чем мощнее приложение, тем хуже оно делает главное" : "The more powerful the app, the worse it does the one thing",
      setup: ru
        ? <>Категория продаёт «второй мозг»: связи, базы данных, ИИ, бесконечная вложенность. Но посмотрите, как люди описывают свою настоящую работу:</>
        : <>The category sells a "second brain": links, databases, AI, infinite nesting. But look at how people describe their actual job:</>,
      quotes: ru
        ? [{ text: "Веду в нём всё: списки продуктов, лекарства, встречи — не знаю, что бы без него делал.", app: "WeNote", rating: 5 }, { text: "Всё, что нужно запомнить, получает заметку — просто, удобно и всегда под рукой.", app: "ColorNote", rating: 5 }]
        : [{ text: "I use it for everything: grocery lists, medications, appointments — don't know what I'd do without it.", app: "WeNote", rating: 5 }, { text: "Anything I need to remember gets a note — easy to use and always at hand.", app: "ColorNote", rating: 5 }],
      reveal: ru
        ? <>Списки продуктов. Лекарства. Встречи. Не «второй мозг», а захват мелочи за секунду и уверенность, что завтра она будет на месте. И вот в чём суть: мощность и эта работа — в конфликте. Каждая новая фича замедляет ввод и добавляет поверхность, на которой данные теряются. Поэтому на удержании тихо выигрывают «тупые» Keep и Заметки — они довели до конца скорость и доверие, а не возможности. Чем громче приложение кричит про «второй мозг», тем хуже оно делает то, ради чего его открывают пятьдесят раз в день.</>
        : <>Grocery lists. Medications. Appointments. Not a "second brain" — a one-second capture and the certainty it'll be there tomorrow. Here's the catch: power and this job are in tension. Every new feature slows the capture and adds a surface where data gets lost. That's why the "dumb" Keep and Notes quietly win retention — they finished speed and trust, not capability. The louder an app shouts "second brain," the worse it does the thing people open it for fifty times a day.</>,
    },
    {
      slug: "habit-tracking",
      eyebrow: ru ? "Трекеры привычек" : "Habit trackers",
      title: ru ? "Главная механика индустрии работает против пользователя" : "The industry's signature mechanic works against the user",
      setup: ru
        ? <>Вся категория молится на серию (streak) и геймификацию. Но спросите, за что ставят пять звёзд:</>
        : <>The whole category worships the streak and gamification. But ask what earns the 5 stars:</>,
      quotes: ru
        ? [{ text: "Маленькие виджеты-плитки — отмечаешь сделанным быстро, без суеты и ерунды.", app: "Loop Habit Tracker", rating: 5 }, { text: "Даёт ту самую визуальную обратную связь, тепловая карта так радует. Никаких трюков — просто отличный дизайн.", app: "HabitKit", rating: 5 }]
        : [{ text: "The little tile widgets are great for quickly marking it done without any fuss or nonsense.", app: "Loop Habit Tracker", rating: 5 }, { text: "Gives me the visual feedback I want and the heat map is so satisfying. No gimmicks, just great design.", app: "HabitKit", rating: 5 }],
      reveal: ru
        ? <>«Никаких трюков» — это похвала на пять звёзд. Работа — не «держи число», а отметить в одно касание прямо с виджета и получить спокойный взгляд на прогресс. А серия психологически вывернута: она мотивирует ровно до первого пропуска, после которого обнулённый счётчик рождает стыд — и человек бросает в худший возможный момент. Механика, которой гордится вся категория, на самом деле баг удержания, наряженный в фичу. Кто заменит наказание прощением — а культ серии спокойным «вернись завтра» — выиграет именно там, где сейчас теряют все.</>
        : <>"No gimmicks" is a five-star compliment. The job isn't "hold a number" — it's mark it in one tap from a widget and get a calm glance at progress. The streak is psychologically backwards: it motivates right up to the first miss, after which the reset breeds shame — and people quit at the worst possible moment. The mechanic the whole category is proud of is a retention bug dressed as a feature. Replace punishment with forgiveness — the streak cult with a quiet "come back tomorrow" — and you win exactly where everyone else loses.</>,
    },
  ];

  const para = "mt-5 max-w-[64ch] text-[17px] leading-[1.75] text-[var(--color-text-secondary)] sm:text-[18px]";
  const eyebrowCls = "text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-brand)]";
  const h2 = "mt-3 text-[26px] font-black leading-[1.12] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[34px]";

  const graph = { "@context": "https://schema.org", "@graph": [{ "@type": "Article", headline: ru ? "Чего люди на самом деле хотят от приложений" : "What people actually want from apps", inLanguage: ru ? "ru" : "en", author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" }, publisher: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" } }] };

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      {/* HERO */}
      <header>
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Разбор рынка по отзывам" : "A market read from reviews"}</div>
        <h1 className="glow-sweep mt-6 max-w-[20ch] text-[clamp(30px,7.4vw,54px)] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Чего люди на самом деле хотят от приложений" : "What people actually want from apps"}
        </h1>
        <p className="mt-7 max-w-[62ch] text-[18px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[20px]">
          {ru ? (
            <>Мы проанализировали <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> отзывов на <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> приложений. И почти в каждой нише — один и тот же разрыв, которого не видно из таблицы фич: <span className="font-semibold text-[var(--color-text-primary)]">приложения соревнуются в уме, а люди приходят за скучной работой без трения</span>. Самые «умные» проигрывают тем, кто честно довёл до конца одну задачу.</>
          ) : (
            <>We analyzed <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> reviews across <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> apps. And almost every niche has the same gap you can't see from a feature table: <span className="font-semibold text-[var(--color-text-primary)]">apps compete on intelligence, while people come for the boring job done without friction</span>. The "smartest" lose to whoever actually finished one task.</>
          )}
        </p>
        <p className="mt-5 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">
          {ru ? `Средний рейтинг ${avg}★ — но звёзды ставят довольные. Правда живёт в том, за что хвалят и чего просят.` : `Average rating ${avg}★ — but stars come from the happy. The truth is in what they praise and ask for.`}
        </p>
      </header>

      {/* INSIGHTS */}
      <div className="mt-20 flex flex-col gap-24 sm:mt-28 sm:gap-32">
        {insights.map((ins, i) => {
          const icons = iconsFor(ins.slug, locale);
          return (
            <Reveal key={ins.slug}>
              <article>
                {icons.length > 0 && (
                  <Link href={`/segment/${ins.slug}`} className="mb-6 flex flex-wrap items-center gap-2">
                    {icons.map((src, k) => (
                      <img key={k} src={src} alt="" loading="lazy" decoding="async" className="size-10 rounded-[11px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                    ))}
                  </Link>
                )}
                <div className="flex items-baseline gap-3 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  <span className="text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                  <span>{ins.eyebrow}</span>
                </div>
                <h2 className={h2}>{ins.title}</h2>
                <p className={para}>{ins.setup}</p>
                <div className="mt-7 flex flex-col gap-3">
                  {ins.quotes.map((q, k) => (
                    <div key={k} className="flex flex-col gap-1">
                      <div className="msg-bubble max-w-[88%] self-start rounded-[20px] rounded-bl-[6px] bg-[var(--color-bg-muted)] px-4 py-2.5 text-[14.5px] leading-[1.45] text-[var(--color-text-primary)]">{q.text}</div>
                      <span className="pl-2 text-[11.5px] tabular-nums text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</span>
                    </div>
                  ))}
                </div>
                <p className={para}>{ins.reveal}</p>
                <Link href={`/segment/${ins.slug}`} className="mt-7 flex items-center rounded-[14px] border border-[var(--color-border-subtle)] px-4 py-3.5 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]">
                  {ru ? `Полный разбор: ${ins.eyebrow}` : `Full breakdown: ${ins.eyebrow}`}
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* THE LAW */}
      <Reveal className="mt-24 sm:mt-32">
        <section className="border-t border-[var(--color-border-subtle)] pt-14">
          <div className={eyebrowCls}>{ru ? "Общий закон" : "The pattern"}</div>
          <h2 className={h2}>{ru ? "Две оси, по которым меряют рынок" : "The two axes the market is measured on"}</h2>
          <p className={para}>
            {ru
              ? <>Приложения конкурируют по оси «кто умнее»: больше ИИ, больше фич, больше геймификации. А пользователь выбирает по оси «кто честнее закрыл скучную работу»: быстро, надёжно, без трюков. Эти оси почти ортогональны — поэтому в каждой нише есть тихий лидер удержания, который проще «инновационных» соседей. «Рынок занят» — это правда про ось ума. На оси работы он почти всегда открыт.</>
              : <>Apps compete on the "who's smarter" axis: more AI, more features, more gamification. Users choose on the "who actually finished the boring job" axis: fast, reliable, no tricks. The two are nearly orthogonal — which is why every niche has a quiet retention leader that's simpler than its "innovative" neighbors. "The market is taken" is true on the intelligence axis. On the job axis, it's almost always open.</>}
          </p>
        </section>
      </Reveal>

      {/* OPPORTUNITIES */}
      <Reveal className="mt-20 sm:mt-24">
        <section>
          <div className={eyebrowCls}>{ru ? "Что из этого строить" : "What to build from this"}</div>
          <h2 className={h2}>{ru ? "Разрывы под измеримый спрос" : "Gaps with measurable demand"}</h2>
          <div className="mt-9 flex flex-col divide-y divide-[var(--color-border-subtle)]">
            {gaps.map((g, i) => (
              <Link key={g.slug} href={`/segment/${g.category}`} className="group block py-6 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-3 text-[12px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                  <span className="text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                  <span>{g.categoryName}</span>
                  <span className="tabular-nums">· {nf(g.stats?.observations ?? 0, ru)} {ru ? "за спрос" : "demand"}</span>
                </div>
                <p className="mt-2.5 text-[19px] font-bold leading-[1.25] tracking-[-0.01em] text-[var(--color-text-primary)] transition-colors group-hover:text-[var(--color-text-brand)] sm:text-[21px]">{tg(g.title)}</p>
                {g.gap && <p className="mt-2 max-w-[62ch] text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{tg(g.gap)}</p>}
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {/* CTA */}
      <section className="mt-24 text-center sm:mt-32">
        <p className="mx-auto max-w-[44ch] text-[22px] font-light leading-[1.4] text-[var(--color-text-primary)] sm:text-[26px]">
          {ru ? "Ниша не «занята», пока лидеры решают не ту задачу." : "A niche isn't 'taken' while the leaders solve the wrong job."}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cards" className="btn-shimmer inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[16px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
            🎴 {ru ? "Колода идей — тяни карту" : "Idea deck — draw a card"}
          </Link>
          <Link href="/catalog" className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-7 py-4 text-[16px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-tertiary)]">
            {ru ? "Все ниши" : "All niches"}
          </Link>
        </div>
        <p className="mx-auto mt-10 max-w-[46ch] text-[12px] leading-[1.5] text-[var(--color-text-tertiary)]">
          {ru ? "Отзывы проанализированы автоматически; цитаты — перевод реальных отзывов из App Store и Google Play. Цифры спроса — из извлечённых наблюдений." : "Reviews analyzed automatically; quotes are translations of real App Store / Google Play reviews. Demand numbers come from extracted observations."}
        </p>
      </section>
    </main>
  );
}
