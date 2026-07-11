import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getLocale } from "@/lib/i18n.server";
import { ogImage } from "@/lib/og";
import { findRatingApp, getNicheName } from "@/lib/ratingAppSlug";
import { tg } from "@/lib/typo";

export const dynamic = "force-dynamic";

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const items = (s?: string) => (s || "").split(/[,;]\s*|\s+и\s+/).map((x) => x.trim()).filter((x) => x.length > 2).slice(0, 8);

export async function generateMetadata({ params }: { params: Promise<{ slug: string; app: string }> }): Promise<Metadata> {
  const { slug, app } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const a = findRatingApp(slug, app, locale);
  const niche = getNicheName(slug, locale);
  if (!a || !niche) return {};
  const lp = ru ? "ru" : "en";
  const title = ru ? `${a.title} — честный разбор отзывов` : `${a.title} — honest review breakdown`;
  const description = ru
    ? `${a.title}: что хвалят и где слабо по реальным отзывам. Народный балл ${a.realScore ?? ""}, витринная звезда ${a.storeAvg ?? ""}. ${(a.verdict || "").slice(0, 120)}`
    : `${a.title}: what users love and where it falls short, from real reviews. Real score ${a.realScore ?? ""}, store star ${a.storeAvg ?? ""}. ${(a.verdict || "").slice(0, 120)}`;
  const url = `https://inapp.pro/${lp}/rating/${slug}/${app}`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: `https://inapp.pro/ru/rating/${slug}/${app}`, en: `https://inapp.pro/en/rating/${slug}/${app}`, "x-default": `https://inapp.pro/en/rating/${slug}/${app}` } },
    openGraph: { title, description, type: "article", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [ogImage(ru)] },
    twitter: { card: "summary_large_image", title, description, images: [ogImage(ru)] },
    robots: { index: true, follow: true },
  };
}

const AUTH_LABEL: Record<string, { ru: string; en: string; tone: string }> = {
  "Подлинный": { ru: "подлинный рейтинг", en: "authentic rating", tone: "#30d158" },
  "Сомнительный": { ru: "сомнительный рейтинг", en: "doubtful rating", tone: "#ff9f0a" },
  "Накручен": { ru: "накрученный рейтинг", en: "gamed rating", tone: "#ff453a" },
};

export default async function RatingAppPage({ params }: { params: Promise<{ slug: string; app: string }> }) {
  const { slug, app } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const a = findRatingApp(slug, app, locale);
  const niche = getNicheName(slug, locale);
  if (!a || !niche) notFound();

  const loved = items(a.loved);
  const weak = items(a.weak);
  const auth = a.authenticity ? AUTH_LABEL[a.authenticity] : null;
  const nf = (n?: number) => (n ?? 0).toLocaleString(ru ? "ru-RU" : "en-US");
  const stats = [
    ...(a.realScore != null ? [{ n: `${a.realScore}`, l: ru ? "народный балл" : "real score" }] : []),
    ...(a.storeAvg != null ? [{ n: `${a.storeAvg}`, l: ru ? "витринная звезда" : "store star" }] : []),
    ...(a.ratings ? [{ n: nf(a.ratings), l: ru ? "оценок" : "ratings" }] : []),
  ];

  const jsonLd = {
    "@context": "https://schema.org", "@type": "SoftwareApplication", name: a.title,
    applicationCategory: "MobileApplication", operatingSystem: "iOS, Android",
    ...(a.storeAvg && a.ratings ? { aggregateRating: { "@type": "AggregateRating", ratingValue: a.storeAvg, ratingCount: a.ratings, bestRating: 5, worstRating: 1 } } : {}),
  };

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Link href={`${lp}/rating/${slug}`} className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? `Рейтинг: ${niche}` : `Rating: ${niche}`}
      </Link>

      <header className="mt-12 flex items-start gap-4 sm:gap-5">
        {a.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.icon} alt="" className="size-16 shrink-0 rounded-[18px] object-cover ring-1 ring-[var(--color-border-subtle)] sm:size-20" />
        )}
        <div className="min-w-0">
          <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{a.title}</h1>
          {auth && (
            <span className="mt-3 inline-flex items-center gap-1.5 text-callout font-medium" style={{ color: auth.tone }}>
              <span className="inline-block size-2 rounded-full" style={{ background: auth.tone }} />
              {ru ? auth.ru : auth.en}
            </span>
          )}
        </div>
      </header>

      {a.verdict && <p className="mt-8 max-w-[60ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(a.verdict)}</p>}

      {stats.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-2.5 text-footnote text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      )}

      {a.authNote && (
        <div className="mt-8 card-min rounded-[22px] p-5 sm:p-6">
          <div className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Про рейтинг" : "About the rating"}</div>
          <p className="mt-1.5 text-callout text-[var(--color-text-secondary)]">{tg(a.authNote)}</p>
        </div>
      )}

      {loved.length > 0 && (
        <section className="mt-20 sm:mt-24">
          <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Сильные стороны" : "Strengths"}</div>
          <h2 className="mt-4 text-title2 text-[var(--color-text-primary)]">{ru ? "Что хвалят" : "What users love"}</h2>
          <ul className="mt-7 card-min flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[22px] px-5 sm:px-6">
            {loved.map((it, i) => (
              <li key={i} className="flex items-start gap-3 py-4">
                <span className="mt-[7px] inline-block size-2 shrink-0 rounded-full bg-[#30d158]" />
                <span className="text-body text-[var(--color-text-primary)]">{cap(tg(it))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {weak.length > 0 && (
        <section className="mt-20 sm:mt-24">
          <div className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Слабые места" : "Weak spots"}</div>
          <h2 className="mt-4 text-title2 text-[var(--color-text-primary)]">{ru ? "На что злятся" : "What users hate"}</h2>
          <ul className="mt-7 card-min flex flex-col divide-y divide-[var(--color-border-subtle)] rounded-[22px] px-5 sm:px-6">
            {weak.map((it, i) => (
              <li key={i} className="flex items-start gap-3 py-4">
                <span className="mt-[7px] inline-block size-2 shrink-0 rounded-full bg-[#ff453a]" />
                <span className="text-body text-[var(--color-text-primary)]">{cap(tg(it))}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.whoFor && (
        <div className="mt-8 rounded-[22px] bg-[var(--color-text-primary)] p-6 sm:p-7">
          <h3 className="text-caption text-[color-mix(in_srgb,var(--color-bg-page)_65%,transparent)]">{ru ? "Кому подходит" : "Who it is for"}</h3>
          <p className="mt-2.5 max-w-[58ch] text-body text-pretty text-[var(--color-bg-page)]">{cap(tg(a.whoFor))}</p>
        </div>
      )}

      {Array.isArray(a.shots) && a.shots.length > 0 && (
        <section className="mt-20 sm:mt-24">
          <h2 className="text-title3 text-[var(--color-text-primary)]">{ru ? "Скриншоты" : "Screenshots"}</h2>
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {a.shots.slice(0, 10).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" loading="lazy" decoding="async" className="h-[360px] w-auto shrink-0 rounded-[18px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
            ))}
          </div>
        </section>
      )}

      {/* Navigation into the two niche views. */}
      <div className="mt-20 grid grid-cols-1 gap-3 sm:mt-24 sm:grid-cols-2">
        <Link href={`${lp}/rating/${slug}`} className="card-min flex flex-col gap-1 rounded-[22px] p-6 transition-colors hover:border-[var(--color-border-strong)]">
          <span className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Весь рейтинг" : "Full rating"}</span>
          <span className="text-subhead text-[var(--color-text-primary)]">{ru ? `100 приложений ниши «${niche}»` : `The niche's 100 apps: ${niche}`}</span>
        </Link>
        <Link href={`${lp}/segment/${slug}`} className="card-min flex flex-col gap-1 rounded-[22px] p-6 transition-colors hover:border-[var(--color-border-strong)]">
          <span className="text-caption text-[var(--color-text-tertiary)]">{ru ? "Разбор ниши" : "Niche breakdown"}</span>
          <span className="text-subhead text-[var(--color-text-primary)]">{ru ? `Что строить в нише «${niche}»` : `What to build in ${niche}`}</span>
        </Link>
      </div>
    </main>
  );
}
