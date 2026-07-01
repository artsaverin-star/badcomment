import { listIdeas } from "@/lib/ideas";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { ideaCard } from "@/lib/regenCards";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import IdeasDeck from "@/components/IdeasDeck";
import { scoreFor } from "@/lib/ideaScores";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "ru" : "en";
  const title = ru ? "Идеи приложений под реальный спрос из отзывов" : "App ideas backed by real demand from reviews";
  const description = ru
    ? "Готовые идеи приложений под подтверждённый спрос: выведены из реальных отзывов по десяткам ниш, с доказательной цепочкой и понятной моделью денег."
    : "Ready app ideas backed by proven demand, derived from real user reviews across dozens of niches, each with an evidence trail and a clear money model.";
  const url = `https://inapp.pro/${lp}/ideas`;
  return {
    title, description,
    alternates: { canonical: url, languages: { ru: "https://inapp.pro/ru/ideas", en: "https://inapp.pro/en/ideas", "x-default": "https://inapp.pro/en/ideas" } },
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

// Niches with a full dossier (people's rating + breakdown), ordered by how
// realistically a solo vibe-coder can ship the idea: pure single-player software
// first, non-replicable marketplaces/infra (ride-hailing, streaming, crypto) last.
// Mirrors the homepage card order.
const CATEGORY_ORDER = [
  "meal-prep-grocery", "wardrobe-outfit", "car-maintenance", "ai-image-generation", "password-manager", "pet-care", "water-hydration", "wallpapers-widgets", "qr-scanner", "mind-mapping",
  "scanner-pdf", "ai-chatbot", "intermittent-fasting", "flashcards", "translator", "run-tracking", "voice-recorder", "resume-builder", "invoice-maker", "sobriety",
  "ai-writing", "journaling-mood", "focus-productivity", "habit-tracking", "notes-pkm", "sleep-tracking", "recipes-meal-planning", "plant-care", "baby-tracking", "workout-fitness", "calendars-tasks", "period-cycle", "nutrition-calories", "personal-finance", "meditation-mindfulness", "astrology", "photo-editing", "ai-avatars-headshots", "language-learning", "weather-apps", "travel-planning", "shopping-ecommerce", "food-delivery", "ride-hailing", "dating-apps", "messaging-apps", "music-streaming", "video-streaming", "crypto-investing",
];
const DOSSIER = new Set(CATEGORY_ORDER);
const CAT_RANK = new Map(CATEGORY_ORDER.map((s, i) => [s, i]));

const ICONS = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
const cleanTitle = (s: string) => {
  const m = (s || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

// Ideas index — the same idea cards as the niche dossiers, with the progressive
// gate (first 6 free, sign in for more, then unlock the whole deck).
export default async function IdeasPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const tr = t(locale);
  const raw = (listIdeas() as unknown as FullIdea[]).filter((i) => DOSSIER.has(i.category));
  // Lead with the most profitable-and-simple ideas: rank by the composite score
  // (money x simplicity x demand, all from real signals). A founder sees the
  // "where the money is and I can actually build it" ideas first. Ties fall back
  // to buildability order so the ordering stays stable.
  const all = raw.slice().sort((a, b) => {
    const sa = scoreFor(a.slug)?.composite ?? 0, sb = scoreFor(b.slug)?.composite ?? 0;
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
    return {
      title: cleanTitle(ov?.title ?? i.title),
      oneLiner: ov?.oneLiner ?? i.oneLiner,
      gap: i.gap,
      pitch: i.idea?.pitch,
      features: i.idea?.features,
      antiFeatures: i.idea?.antiFeatures,
      monetization: i.idea?.monetization,
      reviewGrid: i.reviewGrid,
      icon: ICONS[idx % ICONS.length],
      score: scoreFor(i.slug, locale) ?? undefined,
    };
  });

  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-16 sm:pt-20">
      <header className="text-center">
        <h1 className="glow-sweep text-display text-balance text-[var(--color-text-primary)]">{tr.ideas.title}</h1>
        <p className="mx-auto mt-6 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tr.ideas.desc}</p>
        <div className="mx-auto mt-6 flex max-w-[560px] flex-wrap items-center justify-center gap-x-5 gap-y-2 text-footnote text-[var(--color-text-tertiary)]">
          <span>{ru ? "Отсортированы по деньгам, простоте и спросу." : "Ranked by money, simplicity and demand."}</span>
          <span className="inline-flex items-center gap-1.5"><span style={{ color: "#30d158" }}>●</span>{ru ? "Деньги" : "Money"}</span>
          <span className="inline-flex items-center gap-1.5"><span style={{ color: "#0a84ff" }}>●</span>{ru ? "Простота" : "Simplicity"}</span>
          <span className="inline-flex items-center gap-1.5"><span style={{ color: "#ff9f0a" }}>●</span>{ru ? "Спрос" : "Demand"}</span>
        </div>
        <a href={`/${ru ? "ru" : "en"}/ideas/top`} className="mt-4 inline-flex items-center gap-1.5 text-callout font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
          {ru ? "Топ идей по деньгам" : "Top ideas by money"}
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </header>

      <div className="mt-12">
        <IdeasDeck
          ideas={shown}
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
