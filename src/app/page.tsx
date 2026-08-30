import { getLocale } from "@/lib/i18n.server";
import { ogImage } from "@/lib/og";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getCatalogData } from "@/lib/catalogData";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { categoryCards } from "@/lib/regenCards";
import ideasData from "@/data/ideas.json";
import { getNicheThesis } from "@/lib/nicheThesis";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import { byNicheMoney } from "@/lib/nicheMoney";
import Landing from "@/components/Landing";
import { reviewCorpusSlugs, reviewNicheTotals } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}`;
  const title = ru
    ? "Разборы ниш приложений: за что люди платят и чего им не хватает"
    : "App niche breakdowns: what people pay for and what they're missing";
  const description = ru
    ? "Читаем отзывы из App Store и Google Play по нишам и собираем в готовые разборы: что хвалят, на что злятся, каких приложений не хватает и какие идеи напрашиваются."
    : "We read App Store and Google Play reviews by niche and turn them into clear breakdowns: what users love and hate, which apps are missing, and which ideas are worth building.";
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ru: "https://inapp.pro/ru", en: "https://inapp.pro/en", "x-default": "https://inapp.pro/en" },
    },
    openGraph: { title, description, type: "website" as const, url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [ogImage(ru)] },
    twitter: { card: "summary_large_image" as const, title, description, images: [ogImage(ru)] },
    robots: { index: true, follow: true, "max-image-preview": "large" as const, "max-snippet": -1 },
  };
}

// «Разборы» снова главная: и у залогиненных (первый клик с корня — категории,
// самая глубокая секция, там же сидели платящие), и в сыром трафике nginx
// категории — самая посещаемая контентная страница. «Создание» живёт на /build.
export default async function Home() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const premium = await isPremium();
  const user = await getSessionUser();
  const loggedIn = !!user;
  const { totalReviews } = getCatalogData(locale, premium);

  type RApp = { icon?: string | null; ratings?: number };
  type RFile = { name: string; nameEn?: string; count: number; totalReviews: number; apps: RApp[] };
  const ideasAll = ideasData as { category: string }[];
  const reviewSlugs = new Set(reviewCorpusSlugs());
  const catCardsRaw = Object.entries(RATING_BY_SLUG as Record<string, RFile>).filter(([slug]) => reviewSlugs.has(slug)).map(([slug, r]) => {
    const cards = categoryCards(slug, locale)?.product ?? [];
    const corpus = reviewNicheTotals(slug);
    // Only the four icons the tile actually renders — shipping all ~100 per
    // niche bloated the flight payload to megabytes.
    const icons = [...r.apps]
      .sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0))
      .map((a) => a.icon)
      .filter((x): x is string => !!x)
      .slice(0, 4);
    return {
      slug,
      name: ru ? r.name : r.nameEn || r.name,
      icons,
      apps: corpus?.apps ?? r.count,
      reviews: corpus?.reviews ?? r.totalReviews,
      observations: cards.reduce((s, c) => s + (c.count || 0), 0),
      ideas: ideasAll.filter((i) => i.category === slug).length,
      hook: tg(getNicheThesis(slug, locale)?.governing || ""),
      blurb: "",
    };
  });

  const lp = ru ? "ru" : "en";
  const catCards = byNicheMoney(catCardsRaw, (c) => c.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: ru ? "inApp — разборы ниш приложений и идеи" : "inApp — app-niche research and ideas",
    description: ru
      ? "Разборы приложений по нишам из реальных отзывов: что хвалят, на что злятся, каких приложений не хватает и какие идеи напрашиваются."
      : "App-niche research from real reviews: what users love and hate, which apps are missing, and which ideas are worth building.",
    inLanguage: lp,
    url: `https://inapp.pro/${lp}`,
    isPartOf: { "@id": "https://inapp.pro/#website" },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: catCards.length,
      itemListElement: catCards.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, url: `https://inapp.pro/${lp}/segment/${c.slug}` })),
    },
  };

  return (
    <main className="mx-auto w-full max-w-[1080px] overflow-x-clip px-4 pb-24 pt-16 sm:pt-20">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Landing catCards={catCards} locale={locale} totalReviews={totalReviews} loggedIn={loggedIn} />
    </main>
  );
}
