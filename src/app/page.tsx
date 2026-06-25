import { getLocale } from "@/lib/i18n.server";
import { isPremium } from "@/lib/premium";
import { getSessionUser } from "@/lib/session";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { buildFeed } from "@/lib/ideaFeed";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import { getCatalogData } from "@/lib/catalogData";
import { listIdeas } from "@/lib/ideas";
import { PREMIUM_NICHES } from "@/lib/premiumNiches";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { getNicheThesis } from "@/lib/nicheThesis";
import { tg } from "@/lib/typo";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import Landing from "@/components/Landing";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const url = `https://inapp.pro/${lp}`;
  const title = ru
    ? "inApp — тысячи отзывов на приложения в готовые выводы"
    : "inApp — thousands of app reviews into clear conclusions";
  const description = ru
    ? "Читаем отзывы из App Store и Google Play по нишам и собираем в готовые разборы: что хвалят, на что злятся, каких приложений не хватает и какие идеи напрашиваются. Без регистрации."
    : "We read App Store and Google Play reviews by niche and turn them into clear breakdowns: what users love and hate, which apps are missing, and which ideas are worth building. No sign-up.";
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { ru: "https://inapp.pro/ru", en: "https://inapp.pro/en", "x-default": "https://inapp.pro/en" },
      types: { "application/rss+xml": "https://inapp.pro/feed.xml" },
    },
    openGraph: { title, description, type: "website" as const, url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image" as const, title, description, images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    robots: { index: true, follow: true, "max-image-preview": "large" as const, "max-snippet": -1 },
  };
}

// «Главная» — лендинг про продукт (для всех). Каталог живёт на /catalog.
export default async function Home() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const premium = await isPremium();
  const loggedIn = !!(await getSessionUser());
  const { domains, totalReviews } = getCatalogData(locale, premium);

  // Idea feed embedded on the landing — same gating as /cards.
  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);
  const { items: feedItems } = buildFeed(locale, owner);
  const bot = process.env.BOT_USERNAME || "inAppProBot";
  const feed = {
    items: feedItems,
    hasAccess: owner,
    loggedIn: access.loggedIn,
    deckPrice: DECK_PRICE_RUB,
    starsHref: access.user ? `https://t.me/${bot}?start=deck_${access.user.id}` : undefined,
    starsLabel: `${DECK_STARS} ⭐ Telegram`,
    lifetimeStarsHref: access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined,
    lifetimePrice: LIFETIME.rub,
  };

  // Beautiful per-category cover cards (salute + selling copy) for live cats.
  const catCards = domains
    .flatMap((d) => d.categories)
    .filter((c) => c.live)
    .map((c) => {
      const summary = getSegmentSummary(c.slug);
      if (!summary) return null;
      // Hook = the governing thought (the niche's core insight) — the "затравка"
      // pulled from the breakdown. Blurb = a short plain line about what the card
      // is. No store app-names (they're messy: "App: Subtitle, ...").
      const hook = getNicheThesis(c.slug, locale)?.governing || summary.lead || "";
      const reviews = summary.reviewsScanned;
      const blurb = ru
        ? `Прочитали ${reviews.toLocaleString("ru-RU")} отзывов на ${c.appsCount} приложений: что хвалят, на что злятся и каких не хватает — готовый разбор для тех, кто думает сделать своё.`
        : `We read ${reviews.toLocaleString("en-US")} reviews of ${c.appsCount} apps: what's loved, hated and missing — a ready breakdown for anyone thinking of building their own.`;
      return {
        slug: c.slug,
        name: c.name,
        icons: c.apps.map((a) => a.icon).filter((x): x is string => !!x),
        apps: c.appsCount,
        reviews,
        observations: summary.items.reduce((s, i) => s + i.observationCount, 0),
        ideas: listIdeas().filter((i) => i.category === c.slug).length,
        hook: tg(hook),
        blurb: tg(blurb),
      };
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  // Premium-10: the popular, vibe-coder-buildable niches we re-authored to
  // ultra quality (per-app v3 + niche synthesis). Pin them to the top of the
  // homepage list, in popularity order; everything else keeps its order below.
  const PREMIUM: string[] = [...PREMIUM_NICHES];
  // Drop slug duplicates (a few niches live in two domain blocks in the source).
  const seenSlugs = new Set<string>();
  for (let i = 0; i < catCards.length; ) {
    if (seenSlugs.has(catCards[i].slug)) catCards.splice(i, 1);
    else { seenSlugs.add(catCards[i].slug); i++; }
  }

  const premiumRank = (slug: string) => { const i = PREMIUM.indexOf(slug); return i === -1 ? PREMIUM.length : i; };
  catCards.sort((a, b) => premiumRank(a.slug) - premiumRank(b.slug));

  const lp = ru ? "ru" : "en";
  const homeJsonLd = {
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
    <main className="mx-auto w-full max-w-6xl overflow-x-clip px-4 py-10">
      <AtmosphereSetter random />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd) }} />
      <Landing catCards={catCards} locale={locale} totalReviews={totalReviews} loggedIn={loggedIn} feed={feed} />
    </main>
  );
}
