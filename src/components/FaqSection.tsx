import type { Locale } from "@/lib/i18n";

// FAQ block: visible accordion + FAQPage JSON-LD. Targets what an aspiring
// app-maker actually searches ("какое приложение сделать", "идеи приложений
// 2026", "на чём заработать") so the answers can win rich snippets and feed
// LLM answer engines. Server component — static, fully indexable text.

type QA = { q: string; a: string };

const RU: QA[] = [
  {
    q: "Какое приложение сделать в 2026 году?",
    a: "Проще всего то, на что уже есть спрос. Мы читаем реальные отзывы работающих приложений в App Store и Google Play по десяткам ниш и собираем идеи, у которых виден платящий пользователь: что людей бесит, чего им не хватает и за что они готовы платить. Каждая идея показывает, что строить, для кого и как на этом заработать.",
  },
  {
    q: "Откуда берутся эти идеи приложений?",
    a: "Не из головы. Каждая идея выведена из более чем миллиона реальных отзывов: мы находим повторяющиеся жалобы и невыполненные запросы, за которыми стоит реальная аудитория. У каждой идеи есть прямые цитаты из отзывов, оценка спроса и разбор ниши, поэтому число всегда прослеживается до живого пользователя.",
  },
  {
    q: "Как понять, что на приложении можно заработать?",
    a: "Мы оцениваем каждую идею по трём осям: деньги (есть ли платящий, который уже платит за похожее), простота сборки одиночкой и спрос. Плюс показываем реальные цены из отзывов и оценку рынка по скачиваниям Google Play, так что видно и потолок заработка, и кто конкретно платит.",
  },
  {
    q: "Чем это лучше обычных списков «идей для стартапа»?",
    a: "Обычные списки — это фантазии без спроса. У нас каждая идея опирается на реальные отзывы и жалобы, у неё есть подтверждённая платящая аудитория и разбор ниши: рейтинг приложений по реальному качеству, кто платит и на чём проваливаются нынешние лидеры. Это не «а вот бы сделать», а «вот дыра, за которую уже платят».",
  },
  {
    q: "Сколько стоит доступ к идеям?",
    a: "Просматривать идеи, ниши и рейтинги можно бесплатно. Один платёж навсегда открывает полный разбор всех идей: что строить пошагово, полные списки функций, монетизацию и все цитаты из отзывов по каждой нише.",
  },
];

const EN: QA[] = [
  {
    q: "What app should I build in 2026?",
    a: "The safe bet is something with proven demand. We read real reviews of working apps across dozens of niches on the App Store and Google Play and surface ideas with a clear paying user: what annoys people, what's missing, and what they'll pay for. Each idea shows what to build, for whom, and how to make money.",
  },
  {
    q: "Where do these app ideas come from?",
    a: "Not from thin air. Every idea is derived from over a million real reviews: we find the recurring complaints and unmet requests that a real audience stands behind. Each idea carries direct quotes, a demand score, and a niche breakdown, so every number traces back to a living user.",
  },
  {
    q: "How do I know an app can make money?",
    a: "We score every idea on three axes: money (is there someone already paying for something similar), how buildable it is solo, and demand. We also show real prices cited in reviews and a market estimate from Google Play installs, so you see both the earning ceiling and who exactly pays.",
  },
  {
    q: "How is this better than generic startup-idea lists?",
    a: "Generic lists are fantasies with no demand. Here every idea rests on real reviews and complaints, has a confirmed paying audience, and a niche breakdown: an honest app rating from real quality, who pays, and where today's leaders fail. It's not 'wouldn't it be nice', it's 'here's a gap people already pay for'.",
  },
  {
    q: "How much does access to the ideas cost?",
    a: "Browsing ideas, niches, and ratings is free. One payment unlocks the full breakdown of every idea forever: what to build step by step, complete feature lists, monetization, and all the review quotes per niche.",
  },
];

export default function FaqSection({ locale = "ru" }: { locale?: Locale }) {
  const ru = locale !== "en";
  const items = ru ? RU : EN;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({
      "@type": "Question",
      name: x.q,
      acceptedAnswer: { "@type": "Answer", text: x.a },
    })),
  };
  return (
    <section className="mx-auto mt-24 max-w-[720px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h2 className="text-title2 text-balance text-[var(--color-text-primary)]">{ru ? "Частые вопросы" : "Frequently asked"}</h2>
      <div className="mt-6 flex flex-col gap-2.5">
        {items.map((x, i) => (
          <details key={i} className="card-min group/q rounded-[18px] px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
              <span className="text-subhead text-[var(--color-text-primary)]">{x.q}</span>
              <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/q:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </summary>
            <p className="pb-5 text-callout text-[var(--color-text-secondary)]">{x.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
