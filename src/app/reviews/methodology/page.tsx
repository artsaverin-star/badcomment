import type { Metadata } from "next";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { getLocale } from "@/lib/i18n.server";
import { progress, totals } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const title = ru ? "Методика разметки отзывов — inApp" : "Review labelling methodology — inApp";
  const description = ru
    ? "Как inApp превращает исходные отзывы в проверяемые паттерны ниш и темы приложений — с порогами, цитатами и честными ограничениями."
    : "How inApp turns source reviews into verifiable niche patterns and app themes, including thresholds, quotes, and honest limitations.";
  return {
    title,
    description,
    alternates: {
      canonical: "/reviews/methodology",
      languages: {
        ru: "https://inapp.pro/ru/reviews/methodology",
        en: "https://inapp.pro/en/reviews/methodology",
        "x-default": "https://inapp.pro/en/reviews/methodology",
      },
    },
    openGraph: { title, description, type: "article", siteName: "inApp" },
  };
}

function Definition({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-[var(--color-border-subtle)] py-4 first:border-t-0">
      <dt className="text-subhead text-[var(--color-text-primary)]">{term}</dt>
      <dd className="mt-1.5 max-w-[68ch] text-footnote leading-relaxed text-[var(--color-text-secondary)]">{children}</dd>
    </div>
  );
}

export default async function ReviewMethodology() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const t = totals();
  const detailedCorpusPct = t.sourceReviews ? (t.reviews / t.sourceReviews) * 100 : 0;
  const updated = new Intl.DateTimeFormat(lc, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${progress.updatedAt}T00:00:00Z`));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: ru ? "Методика разметки отзывов inApp" : "inApp review labelling methodology",
    description: ru ? "Правила, пороги и ограничения тематической разметки отзывов." : "Rules, thresholds, and limitations of thematic review labelling.",
    dateModified: progress.updatedAt,
    author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
    mainEntityOfPage: `https://inapp.pro${lp}/reviews/methodology`,
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <BackLink fallback={`${lp}/reviews`}>{ru ? "Отзывы" : "Reviews"}</BackLink>

      <header className="mt-4 max-w-[66ch]">
        <p className="text-caption font-semibold uppercase tracking-[0.12em] text-[var(--color-text-brand)]">{ru ? "Методика" : "Methodology"}</p>
        <h1 className="mt-2 text-title1 text-balance text-[var(--color-text-primary)]">{ru ? "Как мы превращаем отзывы в выводы" : "How reviews become findings"}</h1>
        <p className="mt-4 text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Главный принцип — трассируемость. От паттерна можно спуститься к приложениям, цитатам и исходным оценкам; слабый или неоднозначный текст не получает искусственно точную тему."
            : "The governing principle is traceability. A pattern can be followed down to apps, quotes, and source ratings; weak or ambiguous text is not assigned an artificially precise theme."}
        </p>
        <p className="mt-3 text-caption text-[var(--color-text-tertiary)]">{ru ? `Версия данных от ${updated}` : `Data version dated ${updated}`}</p>
      </header>

      <section className="mt-10" aria-labelledby="method-corpus">
        <h2 id="method-corpus" className="text-title2 text-[var(--color-text-primary)]">{ru ? "1. Корпус" : "1. Corpus"}</h2>
        <p className="mt-3 text-body leading-relaxed text-[var(--color-text-secondary)]">
          {ru
            ? `В текущем снимке ${t.sourceReviews.toLocaleString(lc)} публичных отзывов о ${t.sourceApps.toLocaleString(lc)} мобильных приложениях в ${t.sourceNiches} тематической нише. Полный текст, звёздная оценка и принадлежность к приложению доступны для каждого отзыва прямо в каталоге.`
            : `The current snapshot contains ${t.sourceReviews.toLocaleString(lc)} public reviews across ${t.sourceApps.toLocaleString(lc)} mobile apps in ${t.sourceNiches} niches. Complete text, star rating, and app attribution are available for every review directly in the catalogue.`}
        </p>
        <p className="mt-3 text-body leading-relaxed text-[var(--color-text-secondary)]">
          {ru
            ? `Поштучная разметка полная: ${t.labelledReviews.toLocaleString(lc)} из ${t.sourceReviews.toLocaleString(lc)} текстов имеют ровно одну метку.`
            : `Per-review labelling is complete: ${t.labelledReviews.toLocaleString(lc)} of ${t.sourceReviews.toLocaleString(lc)} texts carry exactly one label.`}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="method-layers">
        <h2 id="method-layers" className="text-title2 text-[var(--color-text-primary)]">{ru ? "2. Три уровня разметки" : "2. Three labelling layers"}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <article className="card-min rounded-[20px] p-5">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--color-text-brand)]">{ru ? "Уровень текста" : "Text layer"}</p>
            <h3 className="mt-2 text-title3 text-[var(--color-text-primary)]">{ru ? "Одна метка на отзыв" : "One label per review"}</h3>
            <p className="mt-2 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? "Сначала ищем явный продуктовый сюжет или сквозную механику: списание, рекламу, вылет, вход, синхронизацию и другие узкие сигналы. Если текста недостаточно, сохраняем только тональность — без выдуманной причины."
                : "We first look for an explicit product story or cross-product mechanism: charges, ads, crashes, login, sync, and other narrow signals. If the text is insufficient, only sentiment is retained, without inventing a reason."}
            </p>
          </article>
          <article className="card-min rounded-[20px] p-5">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--color-text-brand)]">{ru ? "Уровень рынка" : "Market layer"}</p>
            <h3 className="mt-2 text-title3 text-[var(--color-text-primary)]">{ru ? "Паттерны ниши" : "Niche patterns"}</h3>
            <p className="mt-2 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? "Один сюжет должен встретиться минимум в 8 сигналах и минимум у 3 разных приложений. Для каждого паттерна сохраняются приложения, направление и проверяемые цитаты."
                : "A story must appear in at least 8 signals and across at least 3 different apps. Apps, direction, and verifiable quotes are retained for every pattern."}
            </p>
          </article>
          <article className="card-min rounded-[20px] p-5">
            <p className="text-caption font-semibold uppercase tracking-[0.1em] text-[var(--color-text-brand)]">{ru ? "Уровень продукта" : "Product layer"}</p>
            <h3 className="mt-2 text-title3 text-[var(--color-text-primary)]">{ru ? "Темы приложения" : "App themes"}</h3>
            <p className="mt-2 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
              {ru
                ? "Повторяющиеся сюжеты формируются отдельно внутри каждого приложения. Поэтому одинаковая проблема у двух конкурентов может называться по-разному и сохранять продуктовый контекст."
                : "Recurring stories are formed separately within each app. The same issue can therefore be named differently for two competitors while preserving product context."}
            </p>
          </article>
        </div>
      </section>

      <section className="mt-10" aria-labelledby="method-reading">
        <h2 id="method-reading" className="text-title2 text-[var(--color-text-primary)]">{ru ? "3. Как читать показатели" : "3. How to read the metrics"}</h2>
        <dl className="mt-4 border-y border-[var(--color-border-subtle)]">
          <Definition term={ru ? "Сигнал" : "Signal"}>
            {ru
              ? "Отзыв, поддерживающий конкретный паттерн. Один содержательный отзыв может затрагивать несколько сюжетов, поэтому суммы сигналов не равны числу уникальных отзывов и не являются долей рынка."
              : "A review supporting a specific pattern. One substantive review may touch several stories, so signal totals do not equal unique review counts and are not market share."}
          </Definition>
          <Definition term={ru ? "Направление темы" : "Theme direction"}>
            {ru
              ? "«В основном хвалят», «в основном критикуют» или «мнения расходятся» — это направление темы в совокупности, а не ярлык каждого отдельного текста. Пятизвёздочный отзыв может упомянуть недостаток, а однозвёздочный — полезную функцию."
              : "“Mostly praised,” “mostly criticised,” or “opinions differ” describes the theme in aggregate, not every individual text. A five-star review may mention a drawback, while a one-star review may mention a useful feature."}
          </Definition>
          <Definition term={ru ? "Конкретная тема" : "Specific theme"}>
            {ru
              ? `Содержательный сюжет, который можно назвать без домыслов. Такие темы получили ${t.sourceSpecificReviews.toLocaleString(lc)} отзывов — ${t.sourceSpecificCoveragePct.toFixed(1)}% полного корпуса; остальное остаётся в явных тональных корзинах «без конкретной причины».`
              : `A substantive story that can be named without speculation. ${t.sourceSpecificReviews.toLocaleString(lc)} reviews, or ${t.sourceSpecificCoveragePct.toFixed(1)}% of the complete corpus, have one; the remainder stays in explicit “without a specific reason” sentiment buckets.`}
          </Definition>
          <Definition term={ru ? "Охват" : "Coverage"}>
            {ru
              ? `Тексты и поштучные метки доступны для всех ${t.sourceReviews.toLocaleString(lc)} отзывов. Паттерны рынка готовы в каждой из ${t.sourceNiches} ниш. Дополнительная глубокая продуктовая разметка готова для ${progress.appsDone.toLocaleString(lc)} из ${progress.appsPlanned.toLocaleString(lc)} приложений — это ${detailedCorpusPct.toFixed(1)}% полного корпуса. Эти показатели намеренно публикуются раздельно.`
              : `Texts and per-review labels are available for all ${t.sourceReviews.toLocaleString(lc)} reviews. Market patterns are ready for all ${t.sourceNiches} niches. The additional deep product layer is ready for ${progress.appsDone.toLocaleString(lc)} of ${progress.appsPlanned.toLocaleString(lc)} apps, or ${detailedCorpusPct.toFixed(1)}% of the complete corpus. These figures are deliberately reported separately.`}
          </Definition>
        </dl>
      </section>

      <section className="mt-10" aria-labelledby="method-guardrails">
        <h2 id="method-guardrails" className="text-title2 text-[var(--color-text-primary)]">{ru ? "4. Ограничения" : "4. Limitations"}</h2>
        <ul className="mt-4 space-y-3 text-body leading-relaxed text-[var(--color-text-secondary)]">
          <li className="flex gap-3"><span aria-hidden="true" className="text-[var(--color-text-tertiary)]">01</span><span>{ru ? "Отзывы пишут неслучайные пользователи: чаще те, у кого был особенно хороший или плохой опыт. Это голос аудитории, но не репрезентативный опрос." : "Reviewers are self-selected and often had an especially good or bad experience. This is the audience voice, not a representative survey."}</span></li>
          <li className="flex gap-3"><span aria-hidden="true" className="text-[var(--color-text-tertiary)]">02</span><span>{ru ? "Корпус — снимок во времени. Версия продукта, страна, язык и политика магазина могут влиять на видимую картину." : "The corpus is a snapshot. Product version, country, language, and store policy can affect what is visible."}</span></li>
          <li className="flex gap-3"><span aria-hidden="true" className="text-[var(--color-text-tertiary)]">03</span><span>{ru ? "Мы не подтверждаем факт покупки и личность автора. Подозрительная активность не должна интерпретироваться как доказанный реальный опыт." : "We do not verify purchase status or reviewer identity. Suspicious activity should not be treated as proven real-world experience."}</span></li>
          <li className="flex gap-3"><span aria-hidden="true" className="text-[var(--color-text-tertiary)]">04</span><span>{ru ? "Частота упоминаний показывает силу сигнала внутри корпуса, но не измеряет распространённость проблемы среди всех пользователей приложения." : "Mention frequency shows signal strength within the corpus, but does not measure prevalence among all users of an app."}</span></li>
        </ul>
      </section>

      <aside className="card-min mt-10 rounded-[22px] p-5 sm:p-6">
        <h2 className="text-title3 text-[var(--color-text-primary)]">{ru ? "Лучший способ проверить вывод" : "The best way to verify a finding"}</h2>
        <p className="mt-2 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
          {ru ? "Открой категорию и конкретное приложение, выбери тему и прочитай все исходные тексты под ней. Любую метку можно проверить по звёздам и точным словам — разметка не прячет корпус за пересказом." : "Open a category and app, choose a topic, and read every source text assigned to it. Any label can be checked against ratings and exact wording; the labelling never hides the corpus behind a summary."}
        </p>
        <Link href={`${lp}/reviews`} className="mt-4 inline-flex items-center gap-1.5 text-footnote font-semibold text-[var(--color-text-brand)] transition-opacity hover:opacity-60">
          {ru ? "Перейти к корпусу →" : "Explore the corpus →"}
        </Link>
      </aside>
    </main>
  );
}
