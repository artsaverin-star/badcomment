import type { Metadata } from "next";
import Link from "next/link";
import { listIdeas, type Idea } from "@/lib/ideas";
import { PREMIUM_NICHE_SET } from "@/lib/premiumNiches";
import { ideaContentEn } from "@/lib/regenCards";
import { getLocale } from "@/lib/i18n.server";
import { tg } from "@/lib/typo";
import insightsData from "@/data/insights.json";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";

// Cornerstone editorial landing: the biggest unmet demands across niches — apps
// people literally beg for in reviews but nobody built well. Proof-first (real
// quotes + demand counts), Apple-store-style. Free magnet → CTA into the deck.

const nf = (n: number, ru: boolean) => n.toLocaleString(ru ? "ru-RU" : "en-US");

// One strong gap per premium niche (best-first), with quotes — breadth + proof.
function pickGaps(): Idea[] {
  const byNiche = new Map<string, Idea>();
  for (const i of listIdeas()) {
    if (!PREMIUM_NICHE_SET.has(i.category)) continue;
    if (!i.reviewGrid?.length) continue;
    if (!byNiche.has(i.category)) byNiche.set(i.category, i);
  }
  return [...byNiche.values()].slice(0, 9);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const title = ru
    ? "Приложения, которые люди умоляют сделать — а их до сих пор нет"
    : "Apps people beg for — that still don't exist";
  const description = ru
    ? "Мы прочитали сотни тысяч отзывов. В каждой нише — одни и те же мольбы, которые никто не закрыл. Готовые идеи приложений под подтверждённый спрос, с реальными цитатами."
    : "We read hundreds of thousands of reviews. Every niche has the same unmet pleas. Ready app ideas backed by proven demand, with real quotes.";
  const url = `https://inapp.pro/${ru ? "ru" : "en"}/most-wanted`;
  return {
    title,
    description,
    keywords: ru
      ? ["идеи приложений", "какое приложение сделать", "идея для стартапа", "спрос на приложения", "ниши приложений 2026"]
      : ["app ideas", "what app to build", "startup idea", "app demand", "app niches 2026"],
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru/most-wanted", en: "https://inapp.pro/en/most-wanted", "x-default": "https://inapp.pro/en/most-wanted" } },
    openGraph: { title, description, type: "article", url, siteName: "inApp", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description, images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

export default async function MostWantedPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const gaps = pickGaps();

  const totalReviews = (insightsData as { reviewsScanned?: number }[]).reduce((s, a) => s + (a.reviewsScanned || 0), 0);
  const totalApps = (insightsData as unknown[]).length;
  const totalIdeas = listIdeas().length;

  // Pick the punchiest evidence: complaints first (low rating reads as "this is missing"), shortest first.
  const quotesOf = (g: Idea) =>
    [...g.reviewGrid]
      .sort((a, b) => a.rating - b.rating || a.quote.length - b.quote.length)
      .slice(0, 3);

  const localized = gaps.map((g) => {
    const en = ru ? null : ideaContentEn(g.slug, locale);
    return {
      slug: g.slug,
      category: g.category,
      categoryName: g.categoryName,
      title: en?.title || g.title,
      oneLiner: en?.oneLiner || g.oneLiner,
      gap: en?.gap || g.gap,
      demand: g.stats?.observations ?? 0,
      quotes: quotesOf(g),
    };
  });

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: ru ? "Приложения, которые люди умоляют сделать — а их до сих пор нет" : "Apps people beg for — that still don't exist",
        inLanguage: ru ? "ru" : "en",
        author: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
        publisher: { "@type": "Organization", name: "inApp", url: "https://inapp.pro" },
      },
      {
        "@type": "ItemList",
        numberOfItems: localized.length,
        itemListElement: localized.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title })),
      },
    ],
  };

  return (
    <main className="relative mx-auto w-full max-w-[760px] overflow-x-clip px-6 pb-28 pt-16 sm:pt-24">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }} />

      {/* HERO */}
      <header className="text-center">
        <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{ru ? "Спрос есть — приложения нет" : "Demand exists — the app doesn't"}</div>
        <h1 className="glow-sweep mx-auto mt-6 max-w-[16ch] text-[clamp(32px,8.5vw,64px)] font-black leading-[0.98] tracking-[-0.04em] text-[var(--color-text-primary)] text-balance">
          {ru ? "Приложения, которые люди умоляют сделать" : "Apps people beg for"}
        </h1>
        <p className="mx-auto mt-7 max-w-[54ch] text-[18px] leading-[1.55] text-[var(--color-text-secondary)] sm:text-[21px]">
          {ru ? (
            <>
              Я месяц читал отзывы — <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> штук на <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> приложений — чтобы найти, чего людям не хватает. В каждой нише одни и те же мольбы, которые так никто и не закрыл. Вот они — с реальными цитатами и цифрами спроса.
            </>
          ) : (
            <>
              I spent a month reading <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalReviews, ru)}</span> reviews across <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{nf(totalApps, ru)}</span> apps to find what people are missing. Every niche has the same unmet pleas nobody closed. Here they are — with real quotes and demand counts.
            </>
          )}
        </p>
      </header>

      {/* THE GAPS */}
      <div className="mt-20 flex flex-col gap-20 sm:mt-28 sm:gap-28">
        {localized.map((g, i) => (
          <Reveal key={g.slug}>
            <article>
              <div className="flex items-baseline gap-3 text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                <span className="text-[var(--color-text-brand)]">{`0${i + 1}`.slice(-2)}</span>
                <span>{g.categoryName}</span>
              </div>
              <h2 className="mt-4 text-[28px] font-black leading-[1.06] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[36px]">{tg(g.title)}</h2>
              <p className="mt-4 max-w-[58ch] text-[18px] font-light leading-[1.5] text-[var(--color-text-secondary)] sm:text-[20px]">{tg(g.oneLiner)}</p>

              {g.gap && (
                <div className="mt-7 border-l border-[var(--color-border-strong)] pl-5">
                  <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Чего не хватает" : "What's missing"}</div>
                  <p className="mt-2.5 text-[16px] leading-[1.65] text-[var(--color-text-primary)]">{tg(g.gap)}</p>
                </div>
              )}

              {g.quotes.length > 0 && (
                <div className="mt-7">
                  <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                    {ru ? `Так об этом просят · ${nf(g.demand, ru)} наблюдений` : `How they ask for it · ${nf(g.demand, ru)} observations`}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {g.quotes.map((q, j) => (
                      <figure key={j} className="msg-bubble max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
                        <p className="text-[14px] italic leading-[1.55] text-[var(--color-text-secondary)]">{tg(q.quote)}</p>
                        <figcaption className="mt-1.5 text-[12px] not-italic tabular-nums text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/segment/${g.category}`}
                className="mt-7 flex items-center rounded-[14px] border border-[var(--color-border-subtle)] px-4 py-3.5 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-border-strong)]"
              >
                {ru ? `Разбор ниши «${g.categoryName}»` : `Niche breakdown: ${g.categoryName}`}
              </Link>
            </article>
          </Reveal>
        ))}
      </div>

      {/* CLOSING + CTA */}
      <section className="mt-24 border-t border-[var(--color-border-subtle)] pt-14 text-center sm:mt-32">
        <p className="mx-auto max-w-[40ch] text-[22px] font-light leading-[1.4] text-[var(--color-text-primary)] sm:text-[26px]">
          {ru ? "Во всех нишах побеждает не больше функций, а одно дело, сделанное идеально." : "Across every niche, the winner isn't more features — it's one thing done perfectly."}
        </p>
        <p className="mx-auto mt-6 max-w-[48ch] text-[16px] leading-[1.6] text-[var(--color-text-secondary)]">
          {ru
            ? `Это ${localized.length} разрывов из ${nf(totalIdeas, ru)} идей под подтверждённый спрос. По каждой нише — что строить, для кого, как заработать и кого обойти.`
            : `These are ${localized.length} of ${nf(totalIdeas, ru)} ideas backed by proven demand. For each niche — what to build, for whom, how to monetize and whom to beat.`}
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/cards" className="btn-shimmer inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-[16px] font-semibold text-white shadow-[0_14px_36px_-12px_color-mix(in_srgb,var(--color-accent-brand)_70%,transparent)] transition-transform hover:scale-[1.02] active:scale-[0.99]">
            🎴 {ru ? "Колода идей — тяни карту" : "Idea deck — draw a card"}
          </Link>
          <Link href="/catalog" className="inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-7 py-4 text-[16px] font-semibold text-[var(--color-text-primary)] transition-colors hover:border-[var(--color-text-tertiary)]">
            {ru ? "Все ниши" : "All niches"}
          </Link>
        </div>
      </section>
    </main>
  );
}
