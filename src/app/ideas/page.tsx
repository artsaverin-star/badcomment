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

// Niches with a full dossier (people's rating + breakdown), ordered by how
// realistically a solo vibe-coder can ship the idea: pure single-player software
// first, non-replicable marketplaces/infra (ride-hailing, streaming, crypto) last.
// Mirrors the homepage card order.
const CATEGORY_ORDER = [
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
  const tr = t(locale);
  const raw = (listIdeas() as unknown as FullIdea[]).filter((i) => DOSSIER.has(i.category));
  // Lead with the juiciest, most solo-buildable ideas: round-robin one idea per
  // category in buildability order, so the first cards a founder sees are the top
  // idea from each of the easiest-to-ship niches (a "this is exactly what I need"
  // hit), not eight variations of the same category before the next one.
  const byCat = new Map<string, FullIdea[]>();
  for (const i of raw) { const a = byCat.get(i.category); if (a) a.push(i); else byCat.set(i.category, [i]); }
  const cats = [...byCat.keys()].sort((a, b) => (CAT_RANK.get(a) ?? 999) - (CAT_RANK.get(b) ?? 999));
  const maxLen = cats.reduce((m, c) => Math.max(m, byCat.get(c)!.length), 0);
  const all: FullIdea[] = [];
  for (let r = 0; r < maxLen; r++) for (const c of cats) { const arr = byCat.get(c)!; if (r < arr.length) all.push(arr[r]); }
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
        <h1 className="glow-sweep text-display text-balance text-[var(--color-text-primary)]">{tr.ideas.title}</h1>
        <p className="mx-auto mt-6 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tr.ideas.desc}</p>
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
