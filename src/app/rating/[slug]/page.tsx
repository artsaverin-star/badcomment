import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import astrology from "@/data/peoplesRating/astrology.json";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer ranking from real reviews, not the storefront
// star (inflated/gamed). Two layers the store lacks: a real PRODUCT-quality score
// that ignores price/bug noise, and an AUTHENTICITY read on the rating itself.

type App = {
  id: string; title: string; icon: string;
  storeAvg: number | null; ratings: number; pct5: number | null; textAvg: number | null; nrev: number;
  realScore: number | null; authenticity: string | null; authNote: string | null;
  verdict: string; loved: string; weak: string; whoFor: string | null;
};
type RatingSet = { slug: string; name: string; nameEn: string; apps: App[]; totalReviews: number; count: number; inflated: number };

const SETS: Record<string, RatingSet> = { astrology: astrology as RatingSet };

function scoreColor(s: number | null): string {
  if (s == null) return "var(--color-text-tertiary)";
  if (s >= 65) return "#30d158";
  if (s >= 45) return "#ffd60a";
  return "#ff6961";
}
function authStyle(a: string | null): { bg: string; fg: string } {
  if (a === "Подлинный") return { bg: "rgba(48,209,88,0.13)", fg: "#30d158" };
  if (a === "Накручен") return { bg: "rgba(255,105,97,0.13)", fg: "#ff6961" };
  return { bg: "rgba(255,214,10,0.13)", fg: "#ffd60a" };
}

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

  return (
    <main className="relative mx-auto w-full max-w-2xl overflow-x-clip px-2 sm:px-4 pb-16 pt-8 sm:pt-12">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-6 sm:mb-8">
        <p className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</p>
        <h1 className="mt-2 text-[34px] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance sm:text-[46px]">
          {ru ? `Лучшие приложения: ${name}` : `Best ${name} apps`}
        </h1>
        <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[18px]">
          {ru
            ? <>Прочитали {nf(set.totalReviews)} реальных отзывов на {set.count} приложений и оценили реальное качество продукта, а не витринную звезду.</>
            : <>We read {nf(set.totalReviews)} real reviews of {set.count} apps and scored the real product quality, not the storefront star.</>}
        </p>

        {/* Methodology — at the top, set the rules of the game before the list */}
        <div className="mt-5 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3.5 sm:px-5 sm:py-4">
          <p className="text-[13.5px] leading-[1.6] text-[var(--color-text-secondary)]">
            {ru
              ? <><span className="font-semibold text-[var(--color-text-primary)]">Как считаем.</span> Читаем до 500 реальных отзывов на каждое приложение и оцениваем реальное качество продукта — точность, глубину, авторские тексты против общей ИИ-воды, — игнорируя жалобы на цену и баги как шум. Подлинность рейтинга — сверка витринной звезды с тем, что люди пишут на деле.</>
              : <><span className="font-semibold text-[var(--color-text-primary)]">How we score.</span> We read up to 500 real reviews per app and rate the real product quality — accuracy, depth, original writing vs generic AI filler — ignoring price and bug complaints as noise. Authenticity compares the storefront star with what people actually write.</>}
          </p>
        </div>

        {set.inflated > 0 && (
          <div className="mt-3 flex items-start gap-2.5 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3">
            <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "#ff6961" }} />
            <p className="text-[13.5px] leading-[1.5] text-[var(--color-text-secondary)]">
              {ru ? <>У {set.inflated} приложений рейтинг похож на накрученный: высокая звезда, но отзывы это не подтверждают.</> : <>{set.inflated} apps look rating-gamed: a high star the reviews do not back up.</>}
            </p>
          </div>
        )}
      </header>

      <ol className="flex flex-col gap-2.5">
        {set.apps.map((a, i) => {
          const au = authStyle(a.authenticity);
          return (
            <li key={a.id} className="rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 sm:p-[18px]">
              <div className="flex items-start gap-3.5">
                <div className="w-6 shrink-0 pt-1 text-[15px] font-bold tabular-nums text-[var(--color-text-tertiary)] sm:w-7 sm:text-[16px]">{i + 1}</div>
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[13px] object-cover" />
                  : <div className="size-12 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-[17px] font-semibold leading-[1.25] tracking-[-0.01em] text-[var(--color-text-primary)]">{a.title}</h2>
                    <div className="shrink-0 text-right">
                      <div className="text-[22px] font-black leading-none tabular-nums" style={{ color: scoreColor(a.realScore) }}>{a.realScore ?? "—"}</div>
                      <div className="mt-1 text-[11px] tabular-nums text-[var(--color-text-tertiary)]">{ru ? "магазин" : "store"} {a.storeAvg?.toFixed(1) ?? "—"}★</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="rounded-full px-2 py-[3px] text-[11px] font-semibold tracking-[0.01em]" style={{ background: au.bg, color: au.fg }}>{a.authenticity}</span>
                    {a.authNote && <span className="text-[11.5px] text-[var(--color-text-tertiary)]">{tg(a.authNote)}</span>}
                  </div>
                  <p className="mt-2.5 text-[14px] font-medium leading-[1.45] text-[var(--color-text-primary)]">{tg(a.verdict)}</p>
                  <dl className="mt-2.5 flex flex-col gap-1.5 text-[13px] leading-[1.45]">
                    <div className="flex gap-2"><dt className="shrink-0 font-semibold text-[#30d158]">{ru ? "Сильное" : "Strength"}</dt><dd className="text-[var(--color-text-secondary)]">{tg(a.loved)}</dd></div>
                    <div className="flex gap-2"><dt className="shrink-0 font-semibold text-[#ff6961]">{ru ? "Слабое" : "Weak"}</dt><dd className="text-[var(--color-text-secondary)]">{tg(a.weak)}</dd></div>
                    {a.whoFor && <div className="flex gap-2"><dt className="shrink-0 font-semibold text-[var(--color-text-tertiary)]">{ru ? "Кому" : "For"}</dt><dd className="text-[var(--color-text-tertiary)]">{tg(a.whoFor)}</dd></div>}
                  </dl>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
