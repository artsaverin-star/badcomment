import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import astrology from "@/data/peoplesRating/astrology.json";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer ranking from real reviews, not the storefront
// star (inflated/gamed). Restrained Swiss-typographic layout: monochrome, the
// hierarchy carried by size/weight/space, no decorative colour.

type App = {
  id: string; title: string; icon: string;
  storeAvg: number | null; ratings: number; pct5: number | null; textAvg: number | null; nrev: number;
  realScore: number | null; authenticity: string | null; authNote: string | null;
  verdict: string; loved: string; weak: string; whoFor: string | null;
};
type RatingSet = { slug: string; name: string; nameEn: string; apps: App[]; totalReviews: number; count: number; inflated: number };

const SETS: Record<string, RatingSet> = { astrology: astrology as RatingSet };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/rating/${slug}`;
  const name = ru ? set.name : set.nameEn;
  const title = ru ? `Лучшие приложения: ${name} — народный рейтинг по отзывам` : `Best ${name} apps — people's rating from reviews`;
  const description = ru
    ? `${set.count} приложений «${name}» по ${set.totalReviews.toLocaleString("ru-RU")} реальным отзывам. Оценка качества по отзывам, а не по витринной звезде, плюс проверка на накрутку рейтинга.`
    : `${set.count} ${name} apps from ${set.totalReviews.toLocaleString("en-US")} real reviews. A quality score from the reviews, not the inflated store star, plus a rating-authenticity check.`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: `https://inapp.pro/ru/rating/${slug}`, en: `https://inapp.pro/en/rating/${slug}`, "x-default": `https://inapp.pro/en/rating/${slug}` } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function RatingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const name = ru ? set.name : set.nameEn;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: ru ? `Народный рейтинг: ${name}` : `People's rating: ${name}`,
    numberOfItems: set.apps.length,
    itemListElement: set.apps.map((a, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "SoftwareApplication", name: a.title, applicationCategory: "LifestyleApplication",
        aggregateRating: a.storeAvg ? { "@type": "AggregateRating", ratingValue: a.storeAvg.toFixed(2), bestRating: "5", ratingCount: a.ratings } : undefined },
    })),
  };

  const Line = ({ label, children }: { label: string; children: ReactNode }) => (
    <p className="text-[15px] leading-[1.65] text-pretty text-[var(--color-text-secondary)]">
      <span className="font-semibold text-[var(--color-text-primary)]">{label}.</span> {children}
    </p>
  );

  return (
    <main className="relative mx-auto w-full max-w-2xl overflow-x-clip px-2 sm:px-4 pb-16 pt-8 sm:pt-12">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-8 sm:mb-10">
        <p className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance sm:text-[46px]">
          {ru ? `Лучшие приложения: ${name}` : `Best ${name} apps`}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[18px]">
          {ru
            ? <>Прочитали {nf(set.totalReviews)} реальных отзывов на {set.count} приложений и оценили реальное качество продукта, а не витринную звезду.</>
            : <>We read {nf(set.totalReviews)} real reviews of {set.count} apps and scored the real product quality, not the storefront star.</>}
        </p>

        <div className="mt-7 border-t border-[var(--color-border-subtle)] pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--color-text-tertiary)]">{ru ? "Как считаем" : "How we score"}</p>
          <p className="mt-2 max-w-[68ch] text-[14px] leading-[1.6] text-[var(--color-text-secondary)]">
            {ru
              ? <>Читаем до 500 реальных отзывов на каждое приложение и оцениваем реальное качество продукта — точность, глубину, авторские тексты против общей ИИ-воды, — игнорируя жалобы на цену и баги как шум. Подлинность рейтинга — сверка витринной звезды с тем, что люди пишут на деле{set.inflated > 0 ? <>; у&nbsp;{set.inflated} приложений звезда ей не соответствует</> : null}.</>
              : <>We read up to 500 real reviews per app and rate the real product quality — accuracy, depth, original writing vs generic AI filler — ignoring price and bug complaints as noise. Authenticity compares the storefront star with what people actually write{set.inflated > 0 ? <>; for {set.inflated} apps the star does not match</> : null}.</>}
          </p>
        </div>
      </header>

      <ol className="flex flex-col border-t border-[var(--color-border-subtle)]">
        {set.apps.map((a, i) => (
          <li key={a.id} className="border-b border-[var(--color-border-subtle)] py-7 sm:py-8">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="w-5 shrink-0 pt-1.5 text-[14px] font-medium tabular-nums text-[var(--color-text-tertiary)] sm:w-7 sm:text-[15px]">{i + 1}</div>
              {a.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[13px] object-cover sm:size-14" />
                : <div className="size-12 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)] sm:size-14" />}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="min-w-0 text-[21px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[26px]">{a.title}</h2>
                  <div className="shrink-0 text-[17px] font-semibold tabular-nums text-[var(--color-text-primary)] sm:text-[19px]">{a.realScore ?? "—"}<span className="text-[12px] font-medium text-[var(--color-text-tertiary)]">/100</span></div>
                </div>
                <p className="mt-2 text-[12.5px] tabular-nums text-[var(--color-text-tertiary)]">
                  {ru ? "магазин" : "store"} {a.storeAvg?.toFixed(1) ?? "—"}★ · {nf(a.ratings)}
                  {a.authenticity ? <span className={a.authenticity === "Накручен" ? "font-semibold text-[var(--color-text-primary)]" : ""}> · {a.authenticity.toUpperCase()}</span> : null}
                </p>
                <p className="mt-4 max-w-[62ch] text-[17px] font-light leading-[1.55] text-pretty text-[var(--color-text-secondary)] sm:text-[18px]">{tg(a.verdict)}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <Line label={ru ? "Сильное" : "Strong"}>{tg(a.loved)}</Line>
                  <Line label={ru ? "Слабое" : "Weak"}>{tg(a.weak)}</Line>
                  {a.whoFor && <Line label={ru ? "Кому" : "For"}>{tg(a.whoFor)}</Line>}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
