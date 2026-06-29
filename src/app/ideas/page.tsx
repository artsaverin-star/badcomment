import { listIdeas } from "@/lib/ideas";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { ideaCard } from "@/lib/regenCards";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { DECK_PRICE_RUB, DECK_STARS, LIFETIME } from "@/lib/tokenConfig";
import IdeasDeck from "@/components/IdeasDeck";

export const dynamic = "force-dynamic";

type FullIdea = {
  slug: string; category: string; title: string; oneLiner: string; gap?: string;
  idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string };
  reviewGrid?: { quote: string; rating: number; app: string }[];
};

// Only the niches that have a full dossier (people's rating + breakdown) on the
// homepage. The ideas deck mirrors those sections, not every category.
const DOSSIER = new Set([
  "astrology", "dating-apps", "ai-avatars-headshots", "meditation-mindfulness", "photo-editing",
  "notes-pkm", "language-learning", "period-cycle", "habit-tracking", "personal-finance", "calendars-tasks", "nutrition-calories", "crypto-investing", "music-streaming", "video-streaming", "food-delivery", "messaging-apps", "shopping-ecommerce", "ride-hailing", "weather-apps", "travel-planning", "sleep-tracking",
]);

const ICONS = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
const cleanTitle = (s: string) => {
  const m = (s || "").replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

// Ideas index — the same idea cards as the niche dossiers, with the progressive
// gate (first 6 free, sign in for more, then unlock the whole deck).
export default async function IdeasPage() {
  const locale = await getLocale();
  const tr = t(locale);
  const all = (listIdeas() as unknown as FullIdea[]).filter((i) => DOSSIER.has(i.category));
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
    };
  });

  const bot = process.env.BOT_USERNAME || "inAppProBot";

  return (
    <main className="mx-auto w-full max-w-[860px] px-4 pb-24 pt-16 sm:pt-20">
      <header className="text-center">
        <h1 className="glow-sweep text-[clamp(32px,8vw,56px)] font-black leading-[1.0] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">{tr.ideas.title}</h1>
        <p className="mx-auto mt-6 max-w-[62ch] text-[17px] leading-[1.55] text-pretty text-[var(--color-text-secondary)] sm:text-[19px]">{tr.ideas.desc}</p>
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
