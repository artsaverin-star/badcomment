/* eslint-disable react/no-unescaped-entities, @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { listIdeas } from "@/lib/ideas";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { hasInsight } from "@/lib/readyApps";
import { getLocale } from "@/lib/i18n.server";
import insightsData from "@/data/insights.json";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Reveal from "@/components/Reveal";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

// A standalone, human-voiced essay — the grail, not an ad for other sections.
// Built on real praise quotes (they reveal the actual job people hire the app
// for), real app icons + real demand numbers. Honest: the pipeline analyzed the
// reviews; quotes are faithful translations. No funnel CTAs.

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
    ? "Все приложения соревнуются, кто умнее. А люди остаются у тех, кто сделал простые скучные вещи безупречно. Разбор по нишам — на реальных отзывах."
    : "Every app competes on who's smarter. People stay with whoever nailed the boring simple things. A niche-by-niche read, from real reviews.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted`;
  return {
    title,
    description,
    keywords: ru ? ["идеи приложений", "какое приложение сделать", "анализ рынка приложений", "идея для стартапа"] : ["app ideas", "what app to build", "app market analysis"],
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
  const demandOf = (slug: string) => ideasAll.find((i) => i.category === slug)?.stats?.observations ?? 0;

  type Insight = { slug: string; eyebrow: string; title: string; setup: React.ReactNode; quotes: Q[]; reveal: React.ReactNode; build: React.ReactNode };
  const insights: Insight[] = [
    {
      slug: "plant-care",
      eyebrow: ru ? "Уход за растениями" : "Plant care",
      title: ru ? "Людям не нужен ботаник. Им нужно не угробить цветок" : "People don't want a botanist. They want to not kill the plant",
      setup: ru
        ? <>Со стороны кажется, что приложение для растений — это про камеру: навёл, узнал вид, получил умный диагноз. Туда уходит весь маркетинг и почти вся разработка. А теперь почитайте, за что их реально благодарят на пять звёзд:</>
        : <>From the outside, a plant app looks like it's about the camera: point it, learn the species, get a smart diagnosis. That's where the marketing and most of the work go. Now read what the 5-star reviews actually thank them for:</>,
      quotes: ru
        ? [{ text: "Напоминания об уходе — единственное, что помогло сохранить 41 комнатное растение живым.", app: "Planta", rating: 5 }, { text: "Я вечно забываю их поливать, но это так помогает — все растения живы и цветут.", app: "Plant Parent", rating: 5 }]
        : [{ text: "The care reminders are the only way I've kept 41 houseplants alive!", app: "Planta", rating: 5 }, { text: "I always forget to water them, but this helps so much — they're all alive and thriving.", app: "Plant Parent", rating: 5 }],
      reveal: ru
        ? <>Ни слова про определение вида. Люди остаются не потому, что приложение знает, как называется их фикус, а потому что оно не даёт забыть полить — и не чувствовать себя виноватым, когда цветок засох. Это приложение про забывчивость и спокойствие, а не про ботанику. Камера — повод скачать. Напоминание — повод остаться. Почти все вылизывают первое и забивают на второе.</>
        : <>Not a word about identifying the species. People stay not because the app knows their ficus by name, but because it keeps them from forgetting to water — and from feeling guilty when something dies. This is an app about forgetfulness and peace of mind, not botany. The camera is the reason to download. The reminder is the reason to stay. Almost everyone polishes the first and ignores the second.</>,
      build: ru
        ? <>Я бы сделал не ещё один определитель, а спокойного помощника, который напоминает полить с поправкой на реальность: прошёл дождь — задача отменилась, на улице холодно — сдвинулась, у тебя суккулент, а не папоротник — свой ритм. Об этом в отзывах просили {nf(demandOf("plant-care"), ru)} раз. Так и не сделали.</>
        : <>I'd build not another identifier, but a calm helper that reminds you to water with reality factored in: it rained, so the task is gone; it's cold, so it shifts; you have a succulent, not a fern, so its own rhythm. People asked for this {nf(demandOf("plant-care"), ru)} times in the reviews. Still no one built it.</>,
    },
    {
      slug: "notes-pkm",
      eyebrow: ru ? "Заметки" : "Notes",
      title: ru ? "В заметках побеждают самые простые. Звучит странно — но вот почему" : "In notes, the simplest apps win. Strange — but here's why",
      setup: ru
        ? <>Категория продаёт «второй мозг»: связи, базы данных, ИИ, бесконечные вложенные папки. А вот как люди описывают, зачем оно им на самом деле:</>
        : <>The category sells a "second brain": links, databases, AI, infinitely nested folders. Here's how people describe what they actually use it for:</>,
      quotes: ru
        ? [{ text: "Веду в нём всё: списки продуктов, лекарства, встречи — не знаю, что бы без него делал.", app: "WeNote", rating: 5 }, { text: "Всё, что нужно запомнить, попадает в заметку — просто, удобно и всегда под рукой.", app: "ColorNote", rating: 5 }]
        : [{ text: "I use it for everything: grocery lists, medications, appointments — don't know what I'd do without it.", app: "WeNote", rating: 5 }, { text: "Anything I need to remember goes into a note — simple, handy and always within reach.", app: "ColorNote", rating: 5 }],
      reveal: ru
        ? <>Продукты. Лекарства. Встречи. Не «второй мозг», а записать мысль за секунду и не сомневаться, что завтра она будет на месте. И вот где засада: чем больше функций, тем медленнее записывать и тем больше мест, где заметка может потеряться. Поэтому вдолгую тихо побеждают «тупые» Keep и Заметки. Чем громче приложение кричит про «второй мозг», тем хуже оно делает то, ради чего его открывают по пятьдесят раз в день.</>
        : <>Groceries. Medications. Appointments. Not a "second brain" — jotting a thought in a second and never doubting it'll be there tomorrow. Here's the trap: the more features, the slower the capture and the more places a note can vanish. So over the long run the "dumb" Keep and Notes quietly win. The louder an app shouts "second brain," the worse it does the thing people open it for fifty times a day.</>,
      build: ru
        ? <>Я бы сделал самое быстрое и надёжное в мире место для мысли: открыл — записал — закрыл, и ни одна заметка никогда не пропала, ни при каком обновлении. Скучно? Да. Именно это и просят.</>
        : <>I'd build the fastest, safest place in the world for a thought: open, jot, close — and no note ever disappears, through any update. Boring? Yes. That's exactly what people ask for.</>,
    },
    {
      slug: "habit-tracking",
      eyebrow: ru ? "Трекеры привычек" : "Habit trackers",
      title: ru ? "Серия дней — гордость индустрии. И она же выгоняет людей" : "The streak is the industry's pride. It's also why people quit",
      setup: ru
        ? <>Вся категория молится на серию дней и геймификацию. А теперь — за что ставят пять звёзд:</>
        : <>The whole category worships the day streak and gamification. Now — what earns five stars:</>,
      quotes: ru
        ? [{ text: "Маленькие виджеты-плитки — отмечаешь сделанным быстро, без суеты и ерунды.", app: "Loop Habit Tracker", rating: 5 }, { text: "Та самая визуальная отдача, и тепловая карта так радует. Никаких трюков — просто отличный дизайн.", app: "HabitKit", rating: 5 }]
        : [{ text: "The little tile widgets are great for marking it done quickly, no fuss or nonsense.", app: "Loop Habit Tracker", rating: 5 }, { text: "Exactly the visual feedback I want, and the heat map is so satisfying. No gimmicks, just great design.", app: "HabitKit", rating: 5 }],
      reveal: ru
        ? <>«Никаких трюков» — это пятизвёздочная похвала, вдумайтесь. Людям надо отметить галочку в одно касание прямо с виджета и спокойно глянуть, как идут дела. А серия устроена наоборот: она подбадривает ровно до первого пропуска — а потом обнуляется, человеку становится стыдно, и он бросает. В самый неподходящий момент. Главная фича всей категории на деле — причина, по которой люди уходят.</>
        : <>"No gimmicks" is a five-star compliment — sit with that. People want to tap a checkbox from a widget and calmly see how it's going. The streak does the opposite: it cheers you up to the first miss, then resets to zero, you feel ashamed, and you quit. At the worst possible moment. The category's flagship feature is, in fact, the reason people leave.</>,
      build: ru
        ? <>Я бы сделал трекер, который прощает. Пропустил — не «начинай с нуля», а «ничего, продолжаем». Та же галочка, тот же виджет, та же красивая карта — но без наказания за то, что ты живой человек.</>
        : <>I'd build a tracker that forgives. Missed a day — not "start over" but "no problem, carry on." Same checkbox, same widget, same pretty grid — minus the punishment for being a human being.</>,
    },
  ];

  const para = "mt-5 max-w-[64ch] text-[17px] leading-[1.75] text-[var(--color-text-secondary)] sm:text-[18px]";
  const buildCls = "mt-5 max-w-[64ch] text-[17px] leading-[1.75] text-[var(--color-text-primary)] sm:text-[18px]";
  const eyebrowCls = "text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-brand)]";
  const h2 = "mt-3 text-[26px] font-black leading-[1.14] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[33px]";

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
        <p className="mt-7 max-w-[62ch] text-[18px] leading-[1.65] text-[var(--color-text-secondary)] sm:text-[20px]">
          {ru ? (
            <>Мы прогнали через анализ <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> отзывов на <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> приложений. И почти везде — одно и то же. Приложения соревнуются, кто умнее: больше ИИ, больше функций, больше геймификации. А люди скачивают их ради скучных, простых вещей — и остаются не у самых умных, а у тех, кто эти простые вещи сделал так, что не подкопаешься. Вот три ниши, где это видно лучше всего.</>
          ) : (
            <>We ran <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> reviews across <span className="font-semibold text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> apps through analysis. And it's almost always the same. Apps compete on who's smarter: more AI, more features, more gamification. People download them for boring, simple things — and stay not with the smartest, but with whoever made those simple things flawless. Here are three niches where you can see it best.</>
          )}
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
                  <div className="mb-6 flex flex-wrap items-center gap-2">
                    {icons.map((src, k) => (
                      <img key={k} src={src} alt="" loading="lazy" decoding="async" className="size-10 rounded-[11px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                    ))}
                  </div>
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
                <p className={buildCls}><span className="font-bold">{ru ? "Что бы я сделал. " : "What I'd build. "}</span>{ins.build}</p>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* THE LAW */}
      <Reveal className="mt-24 sm:mt-32">
        <section className="border-t border-[var(--color-border-subtle)] pt-14">
          <div className={eyebrowCls}>{ru ? "Общий закон" : "The pattern"}</div>
          <h2 className={h2}>{ru ? "«Рынок занят» — смотря чем мерить" : "\"The market is taken\" — depends what you measure"}</h2>
          <p className={para}>
            {ru
              ? <>Сложите три ниши — и виден общий закон. Все воюют за то, кто умнее: ИИ, функции, геймификация. А люди голосуют за того, кто честнее сделал скучную работу: быстро, надёжно, без выпендрёжа. Эти два почти не пересекаются — поэтому в каждой нише есть тихий лидер, который проще своих «инновационных» соседей и держит людей годами. Если мерить умом — рынок занят. Если мерить работой — он почти везде пустой.</>
              : <>Stack the three niches and a single law appears. Everyone fights over who's smarter: AI, features, gamification. People vote for whoever did the boring work more honestly: fast, reliable, no showing off. The two barely overlap — which is why every niche has a quiet leader, simpler than its "innovative" neighbors, that holds people for years. Measured by intelligence, the market is taken. Measured by the job, it's almost everywhere empty.</>}
          </p>
          <p className="mt-8 max-w-[44ch] text-[22px] font-light leading-[1.4] text-[var(--color-text-primary)] sm:text-[26px]">
            {ru ? "Чтобы выиграть, не нужно изобретать. Нужно взять то, что уже любят, и убрать всё, что мешает любить." : "To win, you don't need to invent. Take what's already loved, and remove everything that gets in the way of loving it."}
          </p>
        </section>
      </Reveal>

      <p className="mx-auto mt-16 max-w-[48ch] text-center text-[12px] leading-[1.5] text-[var(--color-text-tertiary)]">
        {ru ? "Отзывы проанализированы автоматически по App Store и Google Play; цитаты — перевод реальных отзывов; цифры спроса — из извлечённых наблюдений." : "Reviews analyzed automatically across App Store and Google Play; quotes are translations of real reviews; demand numbers come from extracted observations."}
        {" · "}
        <Link href="/" className="underline-offset-2 hover:text-[var(--color-text-secondary)] hover:underline">inApp</Link>
      </p>
    </main>
  );
}
