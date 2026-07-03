import { listIdeas } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { ideaCard } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { hueFromSlug } from "@/lib/categoryGradient";
import ideaCovers from "@/data/ideaCovers.json";
import IdeasDeck from "@/components/IdeasDeck";
import { type SortKey } from "@/components/IdeaSortTabs";
import CategoryChips from "@/components/CategoryChips";
import AtmosphereSetter from "@/components/AtmosphereSetter";
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
  reviewGrid?: { quote: string; rating: number; app: string }[];
};

// Buildability order, used only as a stable tie-breaker within a sort.
const CATEGORY_ORDER = [
  "meal-prep-grocery", "wardrobe-outfit", "car-maintenance", "ai-image-generation", "password-manager", "pet-care", "water-hydration", "wallpapers-widgets", "qr-scanner", "mind-mapping",
  "scanner-pdf", "ai-chatbot", "intermittent-fasting", "flashcards", "translator", "run-tracking", "voice-recorder", "resume-builder", "invoice-maker", "sobriety",
  "ai-writing", "journaling-mood", "focus-productivity", "habit-tracking", "notes-pkm", "sleep-tracking", "recipes-meal-planning", "plant-care", "baby-tracking", "workout-fitness", "calendars-tasks", "period-cycle", "nutrition-calories", "personal-finance", "meditation-mindfulness", "astrology", "photo-editing", "ai-avatars-headshots", "language-learning", "weather-apps", "travel-planning", "shopping-ecommerce", "food-delivery", "ride-hailing", "dating-apps", "messaging-apps", "music-streaming", "video-streaming", "crypto-investing",
];
const DOSSIER = new Set(CATEGORY_ORDER);
const CAT_RANK = new Map(CATEGORY_ORDER.map((s, i) => [s, i]));

const SORT_METRIC: Record<SortKey, "composite" | "money" | "simplicity" | "demand"> = {
  balance: "composite", money: "money", simplicity: "simplicity", demand: "demand",
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
  const sort: SortKey = (["money", "simplicity", "demand", "balance"].includes(sp.sort || "") ? sp.sort : "balance") as SortKey;
  const metric = SORT_METRIC[sort];
  const cat = sp.cat && DOSSIER.has(sp.cat) ? sp.cat : undefined;

  const nameOf = (slug: string): string => {
    const r = (RATING_BY_SLUG as Record<string, { name?: string; nameEn?: string }>)[slug];
    return (ru ? r?.name : r?.nameEn) || r?.name || slug;
  };
  const totalReviews = Object.values(RATING_BY_SLUG as Record<string, { totalReviews?: number }>).reduce((s, r) => s + (r.totalReviews || 0), 0);

  const raw = (listIdeas() as unknown as FullIdea[]).filter((i) => DOSSIER.has(i.category));
  // Niche tile strip: every niche that has ideas, in buildability order, with
  // its biggest app's icon as the tile art.
  const chips = CATEGORY_ORDER.filter((s) => raw.some((i) => i.category === s)).map((s) => {
    const apps = ((RATING_BY_SLUG as Record<string, { apps?: { icon?: string | null; ratings?: number }[] }>)[s]?.apps ?? []);
    const top = [...apps].sort((a, b) => (b.ratings ?? 0) - (a.ratings ?? 0)).find((a) => a.icon);
    return { slug: s, name: nameOf(s), icon: top?.icon ?? null, hue: hueFromSlug(s) };
  });
  const all = raw
    .filter((i) => !cat || i.category === cat)
    .sort((a, b) => {
      const sa = scoreFor(a.slug)?.[metric] ?? 0, sb = scoreFor(b.slug)?.[metric] ?? 0;
      if (sb !== sa) return sb - sa;
      return (CAT_RANK.get(a.category) ?? 999) - (CAT_RANK.get(b.category) ?? 999);
    });

  const access = await getAccess();
  const owner = access.unlimited || (access.user ? await ownsDeck(access.user.id) : false);
  const loggedIn = access.loggedIn;
  const limit = owner ? all.length : loggedIn ? 12 : 6;
  const gate: "auth" | "paywall" | null = owner ? null : loggedIn ? "paywall" : "auth";

  const shown = all.slice(0, limit).map((i, idx) => {
    const ov = ideaCard(i.slug, locale);
    const base = {
      slug: i.slug,
      title: cleanTitle(ov?.title ?? i.title),
      oneLiner: ov?.oneLiner ?? i.oneLiner,
      icon: ICONS[idx % ICONS.length],
      hue: hueFromSlug(i.category),
      cover: (ideaCovers as Record<string, string>)[i.slug],
      score: scoreFor(i.slug, locale) ?? undefined,
      category: nameOf(i.category),
      categorySlug: i.category,
    };
    // Owners see the whole deck (400+ cards): embedding every idea's body made
    // the page weigh megabytes, so their modal fetches /api/idea-depth on open.
    // Non-owners get their handful of free cards inline, as before.
    if (owner) return base;
    return {
      ...base,
      gap: i.gap,
      pitch: i.idea?.pitch,
      features: i.idea?.features,
      antiFeatures: i.idea?.antiFeatures,
      monetization: i.idea?.monetization,
      reviewGrid: i.reviewGrid,
    };
  });

  // A blurred peek of what is behind the gate: the next few ideas, locked.
  const lockedPreview = gate
    ? all.slice(limit, limit + 3).map((i, idx) => ({
        title: cleanTitle(ideaCard(i.slug, locale)?.title ?? i.title),
        oneLiner: ideaCard(i.slug, locale)?.oneLiner ?? i.oneLiner,
        icon: ICONS[idx % ICONS.length],
        score: scoreFor(i.slug, locale) ?? undefined,
        category: nameOf(i.category),
      }))
    : [];

  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="mx-auto w-full max-w-[1080px] px-4 pb-24 pt-16 sm:pt-20">
      <AtmosphereSetter random />
      <header className="text-center">
        <h1 className="text-display text-balance text-[var(--color-text-primary)]">{ru ? "Идеи приложений" : "App ideas"}</h1>
        <p className="mx-auto mt-5 max-w-[52ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Каждая идея выросла из реальных отзывов на работающие приложения: видно, что строить, для кого и как на этом заработать."
            : "Every idea grew out of real reviews of working apps: what to build, for whom and how to make money."}
        </p>
        <p className="mx-auto mt-4 text-footnote text-[var(--color-text-tertiary)]">
          {ru
            ? <>Из <span className="tabular-nums">{totalReviews.toLocaleString("ru-RU")}</span> отзывов в App Store и Google Play</>
            : <>From <span className="tabular-nums">{totalReviews.toLocaleString("en-US")}</span> reviews across the App Store and Google Play</>}
        </p>

      </header>

      {/* The niche tiles are the only control; sorting stays fixed on the
          composite score (other orders still work via ?sort= links). */}
      <div className="mt-9">
        <CategoryChips chips={chips} current={cat} sort={sort} locale={locale} locked={!!gate} />
      </div>

      <div className="mt-7">
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
    </main>
  );
}
