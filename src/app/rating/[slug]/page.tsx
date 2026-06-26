import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import astrology from "@/data/peoplesRating/astrology.json";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer ranking built from real reviews, not the
// storefront star (which is inflated/gamed). Two unique layers the store lacks:
// (1) a real PRODUCT-quality score that ignores price/bug noise, and (2) an
// AUTHENTICITY read — is the high star backed by genuine users or manipulated.

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
  if (s >= 65) return "#34d399";
  if (s >= 45) return "#fbbf24";
  return "#fb7185";
}
function authStyle(a: string | null): { bg: string; fg: string; dot: string } {
  if (a === "Подлинный") return { bg: "rgba(52,211,153,0.12)", fg: "#34d399", dot: "🟢" };
  if (a === "Накручен") return { bg: "rgba(251,113,133,0.12)", fg: "#fb7185", dot: "🔴" };
  return { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24", dot: "🟡" };
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

  const medal = (i: number) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <main className="relative mx-auto w-full max-w-3xl overflow-x-clip px-2 sm:px-4 pb-12 pt-6">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mb-5 sm:mb-7">
        <p className="text-[12px] font-medium text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</p>
        <h1 className="mt-1 text-[clamp(26px,6.5vw,42px)] font-black leading-[1.04] tracking-[-0.035em] text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения: ${name}` : `Best ${name} apps`}
        </h1>
        <p className="mt-2.5 max-w-[60ch] text-[14px] leading-[1.5] text-[var(--color-text-secondary)] sm:text-[16px]">
          {ru
            ? <>Прочитали {nf(set.totalReviews)} реальных отзывов на {set.count} приложений. Оценка — за <span className="text-[var(--color-text-primary)]">реальное качество из отзывов</span> (цена и баги не в счёт, это шум), плюс проверка, <span className="text-[var(--color-text-primary)]">не накручена ли звезда</span>.</>
            : <>We read {nf(set.totalReviews)} real reviews of {set.count} apps. The score is the <span className="text-[var(--color-text-primary)]">real quality from the reviews</span> (price and bugs are noise), plus a check on <span className="text-[var(--color-text-primary)]">whether the star is gamed</span>.</>}
        </p>
        {set.inflated > 0 && (
          <p className="mt-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3 py-2 text-[13px] text-[var(--color-text-secondary)]">
            {ru ? <>🔴 У {set.inflated} приложений рейтинг похож на накрученный: высокая звезда, но отзывы это не подтверждают.</> : <>🔴 {set.inflated} apps look rating-gamed: a high star the reviews do not back up.</>}
          </p>
        )}
      </header>

      <ol className="flex flex-col gap-3">
        {set.apps.map((a, i) => {
          const au = authStyle(a.authenticity);
          return (
            <li key={a.id} className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-3.5 sm:p-4">
              <div className="flex items-start gap-3">
                <div className="flex w-7 shrink-0 justify-center pt-0.5 text-[18px] font-black tabular-nums text-[var(--color-text-tertiary)] sm:text-[20px]">{medal(i)}</div>
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" width={48} height={48} className="h-11 w-11 shrink-0 rounded-[12px] sm:h-12 sm:w-12" />
                  : <div className="h-11 w-11 shrink-0 rounded-[12px] bg-[var(--color-surface-card-subtle)] sm:h-12 sm:w-12" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-[16px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[18px]">{a.title}</h2>
                    <div className="shrink-0 text-right">
                      <div className="text-[19px] font-black leading-none tabular-nums sm:text-[22px]" style={{ color: scoreColor(a.realScore) }}>{a.realScore ?? "—"}<span className="text-[11px] font-semibold text-[var(--color-text-tertiary)]">/100</span></div>
                      <div className="mt-0.5 text-[10.5px] text-[var(--color-text-tertiary)]">{ru ? "магазин" : "store"} {a.storeAvg?.toFixed(1) ?? "—"}★ · {nf(a.ratings)}</div>
                    </div>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold" style={{ background: au.bg, color: au.fg }}>{au.dot} {a.authenticity}</span>
                    {a.authNote && <span className="text-[11px] text-[var(--color-text-tertiary)]">{tg(a.authNote)}</span>}
                  </div>
                  <p className="mt-1.5 text-[13.5px] font-medium leading-[1.4] text-[var(--color-text-primary)]">{tg(a.verdict)}</p>
                  <div className="mt-2 flex flex-col gap-1 text-[12.5px] leading-[1.4]">
                    <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-emerald-500">{ru ? "Сильное:" : "Strength:"}</span> {tg(a.loved)}</p>
                    <p className="text-[var(--color-text-secondary)]"><span className="font-semibold text-rose-500">{ru ? "Слабое:" : "Weak:"}</span> {tg(a.weak)}</p>
                    {a.whoFor && <p className="text-[var(--color-text-tertiary)]"><span className="font-semibold">{ru ? "Кому:" : "For:"}</span> {tg(a.whoFor)}</p>}
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-[11px] leading-[1.5] text-[var(--color-text-tertiary)]">
        {ru
          ? "Как считаем: читаем до 500 реальных отзывов на каждое приложение и оцениваем реальное качество продукта (точность, глубина, авторские тексты против общей ИИ-воды), игнорируя жалобы на цену и баги как шум. Подлинность рейтинга — сверка витринной звезды с тем, что люди пишут на деле."
          : "Method: we read up to 500 real reviews per app and score the real product quality (accuracy, depth, original writing vs generic AI filler), ignoring price and bug complaints as noise. Authenticity compares the storefront star with what people actually write."}
      </p>
    </main>
  );
}
