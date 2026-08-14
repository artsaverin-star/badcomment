import type { Metadata } from "next";
import { ogImage } from "@/lib/og";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import RatingShots from "@/components/RatingShots";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { appSlugify } from "@/lib/ratingAppSlug";
import { hasReviewCorpus } from "@/lib/reviews";

export const dynamic = "force-dynamic";

// "Народный рейтинг" — a consumer ranking from real reviews, not the storefront
// star (inflated/gamed). Built to read as a continuation of the category page:
// same hero scale, same editorial typography, restrained colour.

type App = {
  id: string; title: string; icon: string;
  storeAvg: number | null; ratings: number; pct5: number | null; textAvg: number | null; nrev: number;
  realScore: number | null; authenticity: string | null; authNote: string | null;
  verdict: string; loved: string; weak: string; whoFor: string | null;
  shots?: string[];
  en?: { verdict?: string; loved?: string; weak?: string; whoFor?: string; authNote?: string };
};
type RatingSet = { slug: string; name: string; nameEn: string; seoName?: string; apps: App[]; totalReviews: number; count: number; inflated: number };

const SETS = RATING_BY_SLUG as unknown as Record<string, RatingSet>;

// Authenticity as a plain statement about the store star, plus a restrained tint.
function authVerdict(a: string | null, ru: boolean): { word: string; bg: string; fg: string } {
  if (a === "Накручен") return { word: ru ? "Сильное расхождение" : "Large mismatch", bg: "rgba(255,105,97,0.12)", fg: "#ff6961" };
  if (a === "Подлинный") return { word: ru ? "Оценка согласуется" : "Rating aligns", bg: "rgba(48,209,88,0.12)", fg: "#30d158" };
  return { word: ru ? "Есть расхождение" : "Some mismatch", bg: "rgba(255,214,10,0.12)", fg: "#e0b400" };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set || !hasReviewCorpus(slug)) return {};
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}/rating/${slug}`;
  const name = ru ? set.name : set.nameEn;
  const title = ru ? `Лучшие приложения для ${set.seoName ?? name.toLowerCase()}: топ-${set.count} по отзывам` : `Best ${name.toLowerCase()} apps: top ${set.count} by reviews`;
  const description = ru
    ? `${set.count} приложений «${name}» по ${set.totalReviews.toLocaleString("ru-RU")} реальным отзывам. Редакционная оценка опыта и сверка витринной звезды с содержанием отзывов.`
    : `${set.count} ${name} apps from ${set.totalReviews.toLocaleString("en-US")} real reviews. An editorial experience score and a comparison between the storefront star and review content.`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: `https://inapp.pro/ru/rating/${slug}`, en: `https://inapp.pro/en/rating/${slug}`, "x-default": `https://inapp.pro/en/rating/${slug}` } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [ogImage(ru, slug)] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(ru, slug)] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function RatingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const set = SETS[slug];
  if (!set || !hasReviewCorpus(slug)) notFound();
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

  const stats = [
    { n: nf(set.count), l: ru ? "приложений" : "apps" },
    { n: nf(set.totalReviews), l: ru ? "отзывов прочитано" : "reviews read" },
    { n: nf(set.inflated), l: ru ? "с сильным расхождением звезды" : "with a large star mismatch" },
  ];

  const Field = ({ label, children }: { label: string; children: ReactNode }) => (
    <div>
      <div className="text-footnote text-[var(--color-text-tertiary)]">{label}</div>
      <p className="mt-1 max-w-[60ch] text-callout text-pretty text-[var(--color-text-secondary)]">{children}</p>
    </div>
  );

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <BackLink fallback="/rating" className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Назад" : "Back"}
      </BackLink>

      <header className="mt-12">
        <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Народный рейтинг" : "People's rating"}</div>
        <h1 className="glow-sweep mt-6 text-display text-[var(--color-text-primary)] text-balance">
          {ru ? `Лучшие приложения для ${set.seoName ?? name.toLowerCase()}` : `Best ${name.toLowerCase()} apps`}
        </h1>
        <p className="mt-8 max-w-[58ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Топ-{set.count} по редакционной выборке из {nf(set.totalReviews)} отзывов. Балл описывает опыт людей в самих текстах; витринную звезду показываем отдельно.</>
            : <>Top {set.count} from an editorial sample of {nf(set.totalReviews)} reviews. The score describes people&apos;s experience in the text; the storefront star is shown separately.</>}
        </p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="glow-sweep text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-3 text-footnote text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>

        <div className="card-min mt-12 rounded-[22px] p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Как считаем" : "How we score"}</div>
          <p className="mt-2 max-w-[64ch] text-callout text-[var(--color-text-secondary)]">
            {ru
              ? "Читаем до 500 реальных отзывов на приложение и собираем повторяющиеся сигналы об основном продукте, цене, доступе, надёжности и поддержке. Цена или отдельный сбой сами по себе не определяют балл, но остаются частью пользовательского опыта. Метка у звезды показывает степень расхождения между витринной оценкой и текстами; это сигнал для проверки, а не доказательство накрутки."
              : "We read up to 500 real reviews per app and collect recurring signals about the core product, price, access, reliability, and support. Price or a single failure does not determine the score on its own, but remains part of the user experience. The star label shows the degree of mismatch between the storefront rating and review text; it is a review signal, not proof of manipulation."}
          </p>
        </div>
      </header>

      <ol className="mt-12 flex flex-col gap-4">
        {set.apps.map((a, i) => {
          const av = authVerdict(a.authenticity, ru);
          // On EN, prefer the translated overlay; fall back to RU if missing.
          // cap(): source texts occasionally start lowercase — headline-adjacent
          // prose must not. Brand casings (iPhone, iOS, macOS, eBay) stay intact.
          const capFirst = (s: string) => (!s || /^(mac|watch|tv|i|e)[A-Z]/.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1));
          const tx = (k: "verdict" | "loved" | "weak" | "whoFor" | "authNote") => capFirst(((ru ? a[k] : a.en?.[k] ?? a[k]) ?? "") as string);
          return (
            <li key={a.id} className="card-min rounded-[22px] p-6 sm:p-7">
              <div className="flex items-center gap-3.5">
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-[14px] object-cover" />
                  : <span className="size-14 shrink-0 rounded-[14px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0 flex-1">
                  <h2 className="text-headline text-[var(--color-text-primary)]">
                    <Link href={`/${ru ? "ru" : "en"}/rating/${slug}/${appSlugify(a.title)}`} className="transition-colors hover:text-[var(--color-text-brand)]">{a.title}</Link>
                  </h2>
                  <div className="mt-1 text-footnote text-[var(--color-text-tertiary)]">
                    <span className="tabular-nums">№{i + 1}</span>
                    {" · "}<span className="tabular-nums">{a.storeAvg?.toFixed(1) ?? "—"}★</span> {ru ? "в сторе" : "in store"}
                    {" · "}<span style={{ color: av.fg }}>{av.word.toLowerCase()}</span>
                    {" · "}<span className="tabular-nums">{nf(a.ratings)}</span> {ru ? "оценок" : "ratings"}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="block text-title3 font-bold tabular-nums text-[var(--color-text-primary)]">{a.realScore ?? "—"}</span>
                  <span className="block text-caption text-[var(--color-text-tertiary)]">{ru ? "наш балл" : "our score"}</span>
                </div>
              </div>

              <p className="mt-4 max-w-[62ch] text-callout text-pretty text-[var(--color-text-secondary)]">{tg(tx("verdict"))}</p>

              {a.shots && a.shots.length > 0 && <RatingShots shots={a.shots} title={a.title} />}

              <div className="mt-5 flex flex-col gap-3.5 border-t border-[var(--color-border-subtle)] pt-4">
                <Field label={ru ? "Сильное" : "Strong"}>{tg(tx("loved"))}</Field>
                <Field label={ru ? "Слабое" : "Weak"}>{tg(tx("weak"))}</Field>
                {tx("whoFor") && <Field label={ru ? "Кому" : "For"}>{tg(tx("whoFor"))}</Field>}
                <Link href={`/${ru ? "ru" : "en"}/reviews/${slug}/${a.id}`} className="text-footnote font-medium text-[var(--color-text-primary)] underline decoration-[var(--color-border-strong)] underline-offset-2 hover:decoration-[var(--color-text-primary)]">
                  {ru ? "Открыть исходные отзывы и темы →" : "Open source reviews and topics →"}
                </Link>
              </div>
            </li>
          );
        })}
      </ol>

      <Link href={`/${ru ? "ru" : "en"}/segment/${slug}`} className="card-min group mt-6 block rounded-[22px] p-6 sm:p-7">
        <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Чего не хватает всем по отзывам" : "What they all miss"}</div>
        <p className="mt-2 max-w-[40ch] text-title3 text-[var(--color-text-primary)]">
          {ru ? <>Разбор категории и идеи под подтверждённый спрос <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></> : <>The category breakdown and ideas backed by proven demand <span className="inline-block text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-1">→</span></>}
        </p>
      </Link>
    </main>
  );
}
