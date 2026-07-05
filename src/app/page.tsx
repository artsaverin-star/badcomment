import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { ideaCard, ideaContentEn } from "@/lib/regenCards";
import { scoreFor, hotScore } from "@/lib/ideaScores";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { hueFromSlug } from "@/lib/categoryGradient";
import { byNicheMoney } from "@/lib/nicheMoney";
import ideaCovers from "@/data/ideaCovers.json";
import Link from "next/link";
import IdeasDeck from "@/components/IdeasDeck";
import { IdeaCards } from "@/components/TestCards";
import IdeaSortTabs, { type SortKey } from "@/components/IdeaSortTabs";
import CategoryChips from "@/components/CategoryChips";
import AtmosphereSetter from "@/components/AtmosphereSetter";
import FaqSection from "@/components/FaqSection";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const title = ru ? "Идеи приложений под реальный спрос из отзывов" : "App ideas backed by real demand from reviews";
  const description = ru
    ? "Готовые идеи приложений под подтверждённый спрос: выведены из реальных отзывов по десяткам ниш, с оценкой денег, простоты сборки и спроса."
    : "Ready app ideas backed by proven demand from real reviews across dozens of niches, each scored on money, buildability and demand.";
  const url = `https://inapp.pro/${lp}`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru", en: "https://inapp.pro/en", "x-default": "https://inapp.pro/en" }, types: { "application/rss+xml": "https://inapp.pro/feed.xml" } },
    openGraph: { title, description, type: "website", url, siteName: "inApp", locale: ru ? "ru_RU" : "en_US", images: [`https://inapp.pro/api/og?l=${ru ? "ru" : "en"}`] },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  };
}

type FullIdea = {
  slug: string; category: string; title: string; oneLiner: string; gap?: string;
  idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string };
  reviewGrid?: { quote: string; rating: number; app: string; quoteRu?: string }[];
};

// Buildability order, used only as a stable tie-breaker within a sort.
const CATEGORY_ORDER = [
  "meal-prep-grocery", "wardrobe-outfit", "car-maintenance", "ai-image-generation", "password-manager", "pet-care", "water-hydration", "wallpapers-widgets", "qr-scanner", "mind-mapping",
  "scanner-pdf", "ai-chatbot", "intermittent-fasting", "flashcards", "translator", "run-tracking", "voice-recorder", "resume-builder", "invoice-maker", "sobriety",
  "ai-writing", "journaling-mood", "focus-productivity", "habit-tracking", "notes-pkm", "sleep-tracking", "recipes-meal-planning", "plant-care", "baby-tracking", "workout-fitness", "calendars-tasks", "period-cycle", "nutrition-calories", "personal-finance", "meditation-mindfulness", "astrology", "photo-editing", "ai-avatars-headshots", "language-learning", "weather-apps", "travel-planning", "shopping-ecommerce", "food-delivery", "ride-hailing", "dating-apps", "messaging-apps", "music-streaming", "video-streaming", "crypto-investing",
];
const DOSSIER = new Set(CATEGORY_ORDER);
const CAT_RANK = new Map(CATEGORY_ORDER.map((s, i) => [s, i]));

const SORT_METRIC: Record<Exclude<SortKey, "hot">, "composite" | "money" | "simplicity" | "demand"> = {
  balance: "composite", money: "money", simplicity: "simplicity", demand: "demand",
};

// One honest line under the catalog title explaining what the current order
// means — the "hottest" default is a formula, not vibes, so say it out loud.
const SORT_HINT: Record<SortKey, { ru: string; en: string }> = {
  hot: { ru: "наверху самые горячие: громкий спрос и живые деньги разом", en: "hottest first: loud demand and real money at once" },
  money: { ru: "наверху те, где уже платят больше всего", en: "biggest money first" },
  demand: { ru: "наверху самый громкий спрос из отзывов", en: "loudest demand from reviews first" },
  simplicity: { ru: "наверху те, что проще всего собрать одному", en: "easiest for one person to build first" },
  balance: { ru: "наверху лучший баланс денег, простоты и спроса", en: "best balance of money, buildability and demand first" },
};

const ICONS = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
const cleanTitle = (s: string) => { const m = (s || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, ""); return m.charAt(0).toUpperCase() + m.slice(1); };

// Homepage: the idea deck, ranked by money x simplicity x demand from real
// reviews. A sort toggle re-ranks server-side; the gate (6 free -> sign in ->
// unlock) is preserved. Category breakdowns and the people's rating are in the menu.
export default async function Home({ searchParams }: { searchParams: Promise<{ sort?: string; cat?: string }> }) {
  const locale = await getLocale();
  const ru = locale !== "en";
  const sp = await searchParams;
  const sort: SortKey = (["hot", "money", "simplicity", "demand", "balance"].includes(sp.sort || "") ? sp.sort : "hot") as SortKey;
  const metricOf = (slug: string): number => {
    const s = scoreFor(slug);
    if (!s) return 0;
    return sort === "hot" ? hotScore(s) : s[SORT_METRIC[sort]];
  };
  const cat = sp.cat && DOSSIER.has(sp.cat) ? sp.cat : undefined;

  const nameOf = (slug: string): string => {
    const r = (RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string }>)[slug];
    return (ru ? r?.name : r?.nameEn) || r?.name || slug;
  };
  const totalReviews = Object.values(RATING_BY_SLUG as Record<string, { totalReviews?: number }>).reduce((s, r) => s + (r.totalReviews || 0), 0);

  const raw = (listIdeas() as unknown as FullIdea[]).filter((i) => DOSSIER.has(i.category));
  // Niche tile strip: every niche that has ideas, in buildability order, with
  // its biggest app's icon as the tile art.
  const chips = byNicheMoney(CATEGORY_ORDER.filter((s) => raw.some((i) => i.category === s)), (x) => x).map((s) => {
    const apps = ((RATING_BY_SLUG as Record<string, { apps?: { icon?: string | null; ratings?: number }[] }>)[s]?.apps ?? []);
    const top = [...apps].sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0)).find((a) => a.icon);
    return { slug: s, name: nameOf(s), icon: top?.icon ?? null, hue: hueFromSlug(s) };
  });
  const all = raw
    .filter((i) => !cat || i.category === cat)
    .sort((a, b) => {
      const sa = metricOf(a.slug), sb = metricOf(b.slug);
      if (sb !== sa) return sb - sa;
      return (CAT_RANK.get(a.category) ?? 999) - (CAT_RANK.get(b.category) ?? 999);
    });

  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);
  const loggedIn = access.loggedIn;
  const limit = owner ? all.length : loggedIn ? 12 : 6;
  const gate: "auth" | "paywall" | null = owner ? null : loggedIn ? "paywall" : "auth";

  const cardOf = (i: (typeof all)[number], idx: number) => {
    const ov = ideaCard(i.slug, locale);
    // idea-cards.en.json (share-card overlay) is sparse; ideas-content.en.json
    // covers every idea, so fall back to it for the localized title/oneLiner.
    const en = locale === "en" ? ideaContentEn(i.slug, locale) : null;
    return {
      slug: i.slug,
      title: cleanTitle(ov?.title ?? en?.title ?? i.title),
      oneLiner: ov?.oneLiner ?? en?.oneLiner ?? i.oneLiner,
      icon: ICONS[idx % ICONS.length],
      hue: hueFromSlug(i.category),
      cover: (ideaCovers as Record<string, string>)[i.slug],
      score: scoreFor(i.slug, locale) ?? undefined,
      category: nameOf(i.category),
      categorySlug: i.category,
    };
  };
  const depthOf = (i: (typeof all)[number]) => {
    const en = locale === "en" ? ideaContentEn(i.slug, locale) : null;
    return {
      gap: en?.gap ?? i.gap,
      pitch: en?.pitch ?? i.idea?.pitch,
      features: en?.features ?? i.idea?.features,
      antiFeatures: en?.antiFeatures ?? i.idea?.antiFeatures,
      monetization: en?.monetization ?? i.idea?.monetization,
      reviewGrid: i.reviewGrid?.map((q) => ({ ...q, quote: ru && q.quoteRu ? q.quoteRu : q.quote })),
    };
  };

  // The ranked top of the deck is a teaser for everyone but owners: titles,
  // one-liners and scores stay visible, the paid body stays server-side.
  // Owners get bare previews too — their modal fetches /api/idea-depth on open
  // (embedding 400+ full bodies made the page weigh megabytes).
  // The top 3 of the full catalog wear an animated flame crown; inside a niche
  // filter three of eight cards on fire would read as noise, so no crowns there.
  const shown = all.slice(0, limit).map((i, idx) => {
    const card = owner ? cardOf(i, idx) : { ...cardOf(i, idx), locked: true };
    return !cat && idx < 3 ? { ...card, rank: idx + 1 } : card;
  });

  // The free taste: a few fully open ideas that rotate daily, drawn from the
  // strong middle of the ranking so the crown of the leaderboard stays paid.
  // Signing in widens today's sample — the free step of the ladder stays real.
  const showcasePool = cat ? [] : all.slice(limit, limit + 120);
  const showcaseCount = Math.min(loggedIn ? 6 : 3, showcasePool.length);
  // Server component on a force-dynamic route: the day index picks today's
  // rotation and is stable within a render.
  // eslint-disable-next-line react-hooks/purity
  const day = Math.floor(Date.now() / 86400000);
  const showcaseStart = showcasePool.length > 0 ? (day * 3) % showcasePool.length : 0;
  const showcase = owner
    ? []
    : Array.from({ length: showcaseCount }, (_, k) => showcasePool[(showcaseStart + k) % showcasePool.length])
        .map((i, idx) => ({ ...cardOf(i, idx), ...depthOf(i) }));

  // A blurred peek of what is behind the gate: the next few ideas, locked.
  const lockedPreview = gate
    ? all.slice(limit, limit + 3).map((i, idx) => {
        const en = locale === "en" ? ideaContentEn(i.slug, locale) : null;
        return {
        title: cleanTitle(ideaCard(i.slug, locale)?.title ?? en?.title ?? i.title),
        oneLiner: ideaCard(i.slug, locale)?.oneLiner ?? en?.oneLiner ?? i.oneLiner,
        icon: ICONS[idx % ICONS.length],
        score: scoreFor(i.slug, locale) ?? undefined,
        category: nameOf(i.category),
      };
      })
    : [];

  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-16 sm:pt-20">
      <AtmosphereSetter random />
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">{ru ? "Хватит гадать, что строить" : "Stop guessing what to build"}</h1>
        <p className="mx-auto mt-5 max-w-[54ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? <>Мы прочитали <span className="tabular-nums">{totalReviews.toLocaleString("ru-RU")}</span> реальных отзыва App Store и Google Play и нашли места, где люди уже платят, но остаются недовольны. Каждая идея показывает, чего не хватает, кто и сколько платит, и что по силам собрать одному.</>
            : <>We read <span className="tabular-nums">{totalReviews.toLocaleString("en-US")}</span> real App Store and Google Play reviews and found the places where people already pay but stay unhappy. Every idea shows what is missing, who pays and how much, and what one person can build.</>}
        </p>
        {/* One quiet line tells the free/paid story — no pills, no badges. */}
        <p className="mx-auto mt-5 max-w-[52ch] text-footnote text-pretty text-[var(--color-text-tertiary)]">
          {ru ? (
            <>
              Честный <Link href={`/${ru ? "ru" : "en"}/rating`} className="underline decoration-[var(--color-border-strong)] underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]">рейтинг приложений</Link> и{" "}
              <Link href={`/${ru ? "ru" : "en"}/categories`} className="underline decoration-[var(--color-border-strong)] underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]">разборы ниш</Link> бесплатны. Полные идеи открывает один платёж.
            </>
          ) : (
            <>
              The honest <Link href="/en/rating" className="underline decoration-[var(--color-border-strong)] underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]">app rating</Link> and{" "}
              <Link href="/en/categories" className="underline decoration-[var(--color-border-strong)] underline-offset-2 transition-colors hover:text-[var(--color-text-secondary)]">niche breakdowns</Link> are free. One payment opens the full ideas.
            </>
          )}
        </p>
      </header>

      {/* Today's free sample: a few ideas fully open, rotating daily. The taste
          of the paid depth without giving away the top of the leaderboard. */}
      {showcase.length > 0 && (
        <section className="mt-9">
          <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Идеи дня" : "Ideas of the day"}</h2>
            <span className="text-footnote text-[var(--color-text-tertiary)]">{ru ? `${showcase.length} полных разбора бесплатно, завтра набор сменится` : `${showcase.length} full write-ups free, a new set tomorrow`}</span>
          </div>
          <div className="mt-4">
            <IdeaCards ideas={showcase} loggedIn={loggedIn} locale={locale} />
          </div>
        </section>
      )}

      {/* The niche tiles filter the catalog below; the sort control lives in
          the catalog header and re-ranks server-side via ?sort=. */}
      <div className="mt-12">
        <CategoryChips chips={chips} current={cat} sort={sort} locale={locale} />
      </div>

      <div className="mt-7">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-1">
          <div className="flex flex-col gap-1">
            <h2 className="text-title2 text-[var(--color-text-primary)]">{ru ? "Весь каталог" : "The full catalog"}</h2>
            <span className="text-footnote text-[var(--color-text-tertiary)]">{`${all.length} ${ru ? "идей" : "ideas"}, ${ru ? SORT_HINT[sort].ru : SORT_HINT[sort].en}`}</span>
          </div>
          <IdeaSortTabs current={sort} cat={cat} locale={locale} />
        </div>
        <IdeasDeck
          ideas={shown}
          lockedPreview={lockedPreview}
          total={all.length}
          gate={gate}
          loggedIn={loggedIn}
          locale={locale}
          deckPrice={DECK_PRICE_RUB}
          starsHref={access.user ? `https://t.me/${bot}?start=deck_${access.user.id}` : undefined}
          starsLabel={`${DECK_STARS} ⭐ Telegram`}
          lifetimeStarsHref={access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined}
          lifetimePrice={LIFETIME.rub}
        />
      </div>

      <FaqSection locale={locale} />
    </main>
  );
}
