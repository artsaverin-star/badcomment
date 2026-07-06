import type { ReactNode } from "react";
import Link from "next/link";
import BackLink from "@/components/BackLink";
import { notFound } from "next/navigation";
import { tg } from "@/lib/typo";
import { getAccess } from "@/lib/access";
import { promoScore } from "@/lib/promoScore";
import channelsData from "@/data/channels.json";
import channelsEn from "@/data/channels.en.json";
import LeaderRows from "@/components/LeaderRows";
import { ownsDeck } from "@/lib/unlocks";
import { CATEGORY_PRICE_RUB, DECK_CREDIT_RUB, CATEGORY_STARS, LIFETIME } from "@/lib/tokenConfig";
import BuyButton from "@/components/BuyButton";
import DossierGate from "@/components/DossierGate";
import RatingToggleList, { type RatingApp } from "@/components/RatingToggleList";
import AppLinkedText from "@/components/AppLinkedText";
import { PersonaCards, IdeaCards } from "@/components/TestCards";
import { getNicheThesis } from "@/lib/nicheThesis";
import { categoryCards } from "@/lib/regenCards";
import { marketFor, scoreFor, localizePrice } from "@/lib/ideaScores";
import { hueFromSlug } from "@/lib/categoryGradient";
import ideaCovers from "@/data/ideaCovers.json";
import personaCovers from "@/data/personaCovers.json";
import ideasAll from "@/data/ideas.json";
import ideasContentEn from "@/data/ideas-content.en.json";
import dossierEn from "@/data/dossier.en.json";
import type { Locale } from "@/lib/i18n";

import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { DOSSIER_BY_SLUG } from "@/data/dossier";

// The unified niche dossier: market overview, audience, honest rating (sentiment
// vs store), breakdown by thesis pillars, and idea cards. Server component,
// fully parameterized by slug. People's-rating + dossier (audience/market) data
// is keyed per niche; thesis/findings/ideas come from the shared keyed files.

type AppEn = { verdict?: string; loved?: string; weak?: string; whoFor?: string };
type RApp = { id: string; title: string; icon: string | null; storeAvg: number | null; ratings: number; nrev: number; realScore: number | null; authenticity: string | null; verdict: string; loved: string; weak: string; whoFor: string | null; shots?: string[]; en?: AppEn };
type RatingFile = { name: string; nameEn?: string; count: number; totalReviews: number; apps: RApp[] };
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string; quoteRu?: string }[] };
type Pillar = { title: string; dek: string; match: string[] };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string; quoteRu?: string }[] };
type Segment = { name: string; job: string; payLevel: string; payNote: string; servedBy: string[]; gap: string };
type Dossier = { audience: { segments: Segment[]; takeaway: string }; market: { money: string; marketLead: string } };

const RATING = RATING_BY_SLUG as Record<string, RatingFile>;
const DOSSIER = DOSSIER_BY_SLUG as Record<string, Dossier>;

const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};
// Capitalize the first letter, keeping brand casings (iPhone, iOS, macOS, eBay).
const cap = (s: string) => (!s || /^(mac|watch|tv|i|e)[A-Z]/.test(s) ? s : s.charAt(0).toUpperCase() + s.slice(1));

function firstSentence(t?: string): string {
  if (!t) return "";
  const m = t.match(/^.*?[.!?…](\s|$)/);
  return (m ? m[0] : t).trim();
}

function ratingsWord(n: number): string {
  const dd = n % 100, d = n % 10;
  if (dd >= 11 && dd <= 14) return "оценок";
  if (d === 1) return "оценка";
  if (d >= 2 && d <= 4) return "оценки";
  return "оценок";
}

// Route every finding under its best-matching pillar. Findings that match no
// pillar keyword used to all dump into pillar 0 and then get sliced off (lost) —
// now they go to whichever pillar is currently lightest, so EVERY finding is
// shown and the pillars stay balanced. No cap: nothing disappears.
function groupFindings(pillars: Pillar[], cards: Finding[]) {
  const groups: Finding[][] = pillars.map(() => []);
  const orphans: Finding[] = [];
  for (const c of cards) {
    const title = (c.title ?? "").toLowerCase();
    const body = `${c.plus ?? ""} ${c.minus ?? ""}`.toLowerCase();
    const score = (kws: string[]) => kws.reduce((s, kw) => s + (title.includes(kw) ? 2 : 0) + (body.includes(kw) ? 1 : 0), 0);
    let best = -1, bs = 0;
    pillars.forEach((q, qi) => { const sc = score(q.match); if (sc > bs) { bs = sc; best = qi; } });
    if (best >= 0) groups[best].push(c);
    else orphans.push(c);
  }
  for (const c of orphans) {
    let min = 0;
    groups.forEach((g, i) => { if (g.length < groups[min].length) min = i; });
    groups[min].push(c);
  }
  return groups;
}

export default async function NicheDossier({ slug, locale = "ru" }: { slug: string; locale?: Locale }) {
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const NF = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const r = RATING[slug];
  // Dossier (market + audience) and thesis are localized; rating verdicts overlay
  // per-app EN when present, else fall back to RU. Findings + ideas pull their EN
  // text from the shared overlay loaders.
  const dossier = (!ru && (dossierEn as Record<string, Dossier>)[slug]) || DOSSIER[slug];
  const thesisLoc = getNicheThesis(slug, locale) as { governing: string; competitorRead?: string; pillars: Pillar[] } | null;
  if (!r || !dossier || !thesisLoc) notFound();
  const thesis = thesisLoc;
  const enIdeas = ideasContentEn as Record<string, { title?: string; oneLiner?: string; gap?: string; pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }>;

  const apps = [...r.apps].sort((a, b) => (b.realScore || 0) - (a.realScore || 0));
  const cards = ((categoryCards(slug, locale)?.product as Finding[] | undefined) ?? []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  const ideas = (ideasAll as unknown as Idea[]).filter((x) => x.category === slug);

  // Gating ladder: market, audience shapes and the honest rating are free
  // (SEO proof). Review findings open for a free sign-in (lead capture).
  // Ideas and the money conclusions (revenue estimate, "where the money is",
  // per-segment pay notes) open for the one payment (the payload).
  const access = await getAccess();
  const loggedIn = access.loggedIn;
  const unlocked = access.has("category", slug) || access.has("chapter", slug) || ideas.some((i) => access.has("idea", i.slug));
  const hasDeck = access.user ? await ownsDeck(access.user.id) : false;
  const catPrice = hasDeck ? CATEGORY_PRICE_RUB - DECK_CREDIT_RUB : CATEGORY_PRICE_RUB;
  const bot = process.env.BOT_USERNAME || "inAppProBot";
  const catStarsHref = access.user ? `https://t.me/${bot}?start=cat_${access.user.id}_${slug}` : undefined;
  const lifeStarsHref = access.user ? `https://t.me/${bot}?start=life_${access.user.id}` : undefined;
  const aud = dossier.audience;
  const audSegments = aud.segments.map((s) => ({ ...s, name: cap(s.name), job: tg(cap(s.job)), payNote: tg(s.payNote), gap: tg(s.gap) }));
  // payNote is a paid conclusion: for locked users it must not reach the
  // client payload at all, the persona modal shows the offer in its place.
  const audSegmentsClient = unlocked ? audSegments : audSegments.map((s) => ({ ...s, payNote: "" }));
  const ideaIcons = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
  const ideaCards = ideas.map((x, i) => {
    const e = ru ? undefined : enIdeas[x.slug];
    const pitch = e?.pitch ?? x.idea?.pitch;
    const features = e?.features ?? x.idea?.features;
    const antiFeatures = e?.antiFeatures ?? x.idea?.antiFeatures;
    const monetization = e?.monetization ?? x.idea?.monetization;
    const gap = e?.gap ?? x.gap;
    return {
      slug: x.slug,
      title: cleanTitle(e?.title ?? x.title), oneLiner: tg(e?.oneLiner ?? x.oneLiner), gap: gap ? tg(gap) : undefined,
      pitch: pitch ? tg(pitch) : undefined, features: features?.map((f) => tg(f)),
      antiFeatures: antiFeatures?.map((f) => tg(f)), monetization: monetization ? tg(monetization) : undefined,
      reviewGrid: x.reviewGrid?.map((q) => ({ ...q, quote: ru && q.quoteRu ? q.quoteRu : q.quote })), icon: ideaIcons[i % ideaIcons.length],
      hue: hueFromSlug(slug),
      cover: (ideaCovers as Record<string, string>)[x.slug],
      score: scoreFor(x.slug, locale) ?? undefined,
      // The kicker ties the idea back to its paying persona from the audience
      // section (on the homepage this slot shows the niche name instead).
      category: scoreFor(x.slug, locale)?.targetSegment,
    };
  });
  // Locked teasers: only the three strongest ideas, title + score + segment.
  // The one-liner IS the pitch, so it stays server-side along with the body —
  // otherwise a sign-in hands out the whole shortlist for free.
  const ideaCardsLocked = [...ideaCards]
    .sort((a, b) => (b.score?.composite ?? 0) - (a.score?.composite ?? 0))
    .slice(0, 3)
    .map(({ slug: s, title, icon, hue, cover, score, category }) => ({ slug: s, title, oneLiner: "", icon, hue, cover, score, category, categorySlug: slug, locked: true }));
  const grouped = groupFindings(thesis.pillars, cards);

  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const totalObs = cards.reduce((s, c) => s + (c.count || 0), 0);
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const great = apps.filter((a) => (a.realScore || 0) > 80).length;
  const ratingApps: RatingApp[] = apps.map((a) => {
    const e = ru ? undefined : a.en;
    return {
      id: a.id, title: a.title, icon: a.icon, realScore: a.realScore, storeAvg: a.storeAvg, ratings: a.ratings,
      authenticity: a.authenticity, verdict: cap(tg((e?.verdict ?? a.verdict) || "")), loved: cap(tg((e?.loved ?? a.loved) || "")), weak: cap(tg((e?.weak ?? a.weak) || "")), whoFor: (e?.whoFor ?? a.whoFor) ? cap(tg((e?.whoFor ?? a.whoFor) as string)) : null,
      shots: a.shots ?? [],
    };
  });
  const byRatings = [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const leaders = byRatings.slice(0, 3);
  const top3Share = Math.round((100 * leaders.reduce((s, a) => s + (a.ratings || 0), 0)) / (totalRatings || 1));

  // Real market money layer: Google Play install scale + a transparent revenue estimate.
  const mkt = marketFor(slug);
  const promo = promoScore(slug);
  type Channel = { name: string; note: string; count: number; quotes: { app: string; quote: string; quoteRu?: string }[] };
  const channelsRu: Channel[] = ((channelsData as Record<string, { channels?: Channel[] }>)[slug]?.channels ?? []).slice(0, 4);
  // EN overlay is positional: same niches, same channel order, name+note only.
  const channelsEnList = ((channelsEn as Record<string, { channels?: { name: string; note: string }[] }>)[slug]?.channels ?? []);
  const channels = ru ? channelsRu : channelsRu.map((c, i) => ({ ...c, name: channelsEnList[i]?.name ?? c.name, note: channelsEnList[i]?.note ?? c.note }));
  const compactM = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} ${ru ? "млрд" : "B"}` : `${Math.round(n / 1e6)} ${ru ? "млн" : "M"}`);
  // Revenue low/high are baked RU strings ("$149 млн"); swap the unit tokens on EN.
  const revLoc = (s: string) => (ru ? s : s.replace(/\s*млрд/g, "B").replace(/\s*млн/g, "M").replace(/\s*тыс/g, "K"));
  const topInstall = mkt?.installs?.top?.[0];

  const name = ru ? r.name : r.nameEn ?? r.name;
  const stats = [
    { n: NF(r.count), l: ru ? "приложений" : "apps" },
    { n: NF(r.totalReviews), l: ru ? "отзывов прочитано" : "reviews read" },
    { n: NF(totalObs), l: ru ? "наблюдений" : "observations" },
    { n: `${ideas.length}`, l: ru ? "идей" : "ideas" },
  ];

  // Freshness: the newest asOf among the niche's ideas — research without a
  // date reads as stale.
  const asOf = ideas.map((x) => (x as { asOf?: string }).asOf).filter(Boolean).sort().pop();
  const updated = asOf
    ? new Date(asOf).toLocaleDateString(ru ? "ru-RU" : "en-US", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Personas who habitually don't pay — the honest "don't build for them" list.
  const weakSegs = audSegments.filter((s) => s.payLevel.includes("слабо"));

  // Hand-grouped neighbouring niches (same shopping intent), for the footer.
  const GROUPS: string[][] = [
    ["workout-fitness", "run-tracking", "nutrition-calories", "intermittent-fasting", "water-hydration", "sleep-tracking"],
    ["meditation-mindfulness", "journaling-mood", "habit-tracking", "sobriety", "focus-productivity", "astrology"],
    ["baby-tracking", "period-cycle", "pet-care", "plant-care"],
    ["notes-pkm", "calendars-tasks", "mind-mapping", "flashcards", "language-learning", "ai-writing"],
    ["ai-image-generation", "ai-avatars-headshots", "ai-chatbot", "photo-editing", "wallpapers-widgets"],
    ["scanner-pdf", "qr-scanner", "voice-recorder", "translator", "password-manager", "weather-apps"],
    ["personal-finance", "crypto-investing", "invoice-maker", "resume-builder", "car-maintenance"],
    ["meal-prep-grocery", "recipes-meal-planning", "wardrobe-outfit", "shopping-ecommerce", "food-delivery"],
    ["music-streaming", "video-streaming", "messaging-apps", "dating-apps", "travel-planning", "ride-hailing"],
  ];
  const related = (GROUPS.find((g) => g.includes(slug)) ?? [])
    .filter((s) => s !== slug && RATING[s])
    .slice(0, 5)
    .map((s) => {
      const rr = RATING[s];
      const top = [...rr.apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).find((a) => a.icon);
      return { slug: s, name: ru ? rr.name : rr.nameEn ?? rr.name, icon: top?.icon ?? null };
    });

  // Niche banner art = the cover of its highest-scored idea, if generated yet.
  const nicheArt = ideaCards.find((c) => c.cover)?.cover;

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <BackLink fallback="/categories" className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Назад" : "Back"}
      </BackLink>

      <header className="mt-12">
        <h1 className="glow-sweep text-display text-balance text-[var(--color-text-primary)]">{name}</h1>
        <div className="mt-6 max-w-[60ch] space-y-4">
          {tg(thesis.governing).split(/\n{2,}/).map((para, i) => (
            <AppLinkedText key={i} as="p" className={`${i === 0 ? "text-lead" : "text-body"} text-pretty text-[var(--color-text-secondary)]`} text={para.trim()} apps={ratingApps} locale={locale} />
          ))}
        </div>
        {updated && <div className="mt-5 text-caption text-[var(--color-text-tertiary)]">{ru ? `Обновлено ${updated}` : `Updated ${updated}`}</div>}

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-2.5 text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      </header>

      {/* A wide pencil-sketch banner for the niche — the cover of its strongest
          idea doubles as the section's illustration. Shows only once art exists. */}
      {nicheArt && (
        <div className="mt-12 overflow-hidden rounded-[22px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={nicheArt} alt="" loading="lazy" decoding="async" className="aspect-[16/7] w-full object-cover" />
        </div>
      )}

      <Block title={ru ? "Обзор рынка" : "Market overview"} lead={<AppLinkedText text={tg(dossier.market.marketLead)} apps={ratingApps} locale={locale} />}>
        <dl className="mt-8 grid gap-3 sm:grid-cols-2">
          <Tile k={ru ? "Размер" : "Size"}>
            <BigStat value={NF(totalRatings)} sub={ru ? `оценок на ${r.count} приложений · ${NF(r.totalReviews)} отзывов прочитано` : `ratings across ${r.count} apps · ${NF(r.totalReviews)} reviews read`} />
          </Tile>
          <Tile k={ru ? "Концентрация" : "Concentration"}>
            <BigStat value={`${top3Share}%`} sub={ru ? "всех оценок у трёх лидеров" : "of all ratings held by the top three"} />
          </Tile>
          {mkt?.installs && (
            <Tile k={ru ? "Скачивания" : "Downloads"}>
              <BigStat value={`${compactM(mkt.installs.totalMin)}+`} sub={ru
                ? `установок у топ-${mkt.installs.matched} на Google Play${topInstall ? `, лидер ${topInstall.title}` : ""}`
                : `installs across the top ${mkt.installs.matched} on Google Play${topInstall ? `, led by ${topInstall.title}` : ""}`} />
            </Tile>
          )}
          {mkt && mkt.pricesTop.length > 0 && (
            <Tile k={ru ? "Сколько платят" : "What people pay"}>
              <span className="flex flex-wrap gap-1.5">
                {mkt.pricesTop.slice(0, 4).map((p, i) => (
                  <span key={i} className="inline-flex items-center rounded-full bg-[var(--color-bg-muted)] px-3 py-1.5 text-footnote font-semibold tabular-nums text-[var(--color-text-primary)]">{localizePrice(p.label, locale)}</span>
                ))}
              </span>
              <span className="mt-3 block text-footnote text-[var(--color-text-secondary)]">{ru ? "цены из реальных отзывов" : "prices cited in real reviews"}</span>
            </Tile>
          )}
          <Tile wide k={ru ? "Лидеры" : "Leaders"}>
            <LeaderRows
              locale={locale}
              rows={leaders.flatMap((a) => {
                const app = ratingApps.find((x) => x.id === a.id);
                return app ? [{ app, meta: `${NF(a.ratings || 0)} ${ru ? ratingsWord(a.ratings || 0) : "ratings"}` }] : [];
              })}
            />
          </Tile>
          {mkt?.revenue && (
            <Tile wide k={ru ? "Оценка выручки" : "Revenue estimate"}>
              {unlocked ? (
                <>
                  <span className="block text-title2 tabular-nums text-[var(--color-text-primary)]">{revLoc(mkt.revenue.low)}-{revLoc(mkt.revenue.high)}</span>
                  <span className="mt-1.5 block text-footnote text-[var(--color-text-secondary)]">{ru ? "в год у топ-приложений ниши" : "a year for the niche's top apps"}</span>
                  <span className="mt-2 block text-caption text-[var(--color-text-tertiary)]">{ru ? "Оценка: установки Google Play × 0.5-2% платящих × медианная цена из отзывов. Грубо, для порядка величины." : "Estimate: Google Play installs × 0.5-2% payers × median price from reviews. Rough, order of magnitude."}</span>
                </>
              ) : (
                <GateNote ru={ru} text={ru ? "Сколько топы ниши зарабатывают в год. Число открывается вместе с идеями." : "What the niche's top apps make a year. The number opens together with the ideas."} />
              )}
            </Tile>
          )}
          <Tile wide k={ru ? "Доверие" : "Trust"}>
            <BigStat value={ru ? `${broken} из 100` : `${broken} of 100`} sub={ru ? `приложений со звездой накрученной или сомнительной, по-настоящему хороших всего ${great}` : `apps have an inflated or doubtful star, only ${great} are genuinely good`} />
          </Tile>
          {promo && (
            <Tile wide k={ru ? "Продвижение" : "Discoverability"}>
              <BigStat value={ru ? `${promo.score} из 100` : `${promo.score} of 100`} sub={ru
                ? `шанс нового приложения пробиться: у трёх лидеров ${promo.top3Share}% всех оценок, накручено ${promo.inflatedShare}% выдачи, по-настоящему сильных всего ${promo.strongCount}`
                : `a new app's chance to break in: the top three hold ${promo.top3Share}% of ratings, ${promo.inflatedShare}% of the shelf is gamed, only ${promo.strongCount} apps are genuinely strong`} />
              <span className="mt-2 block text-caption text-[var(--color-text-tertiary)]">{ru
                ? "Считаем из концентрации лидеров, доли накрутки, числа сильных приложений и размера спроса. Грубо, для порядка величины."
                : "Computed from leader concentration, gamed share, count of strong apps and demand size. Rough, order of magnitude."}</span>
            </Tile>
          )}
          <Tile wide k={ru ? "Деньги" : "Money"}>
            {unlocked ? (
              <span className="text-callout text-[var(--color-text-secondary)]"><AppLinkedText text={tg(dossier.market.money)} apps={ratingApps} locale={locale} /></span>
            ) : (
              <GateNote ru={ru} text={ru ? "Кто в нише платит, за что и почему большинство игроков теряет деньги. Открывается вместе с идеями." : "Who pays in this niche, for what, and why most players lose money. It opens together with the ideas."} />
            )}
          </Tile>
        </dl>
        <AppLinkedText as="p" className="mt-8 max-w-[64ch] text-body text-pretty text-[var(--color-text-secondary)]" text={tg(thesis.competitorRead ?? "")} apps={ratingApps} locale={locale} />
      </Block>

      <Block title={ru ? "Аудитория" : "Audience"} lead={ru ? `«${name}» это не один клиент. Внутри сидят разные люди с разными работами, и платят они очень по-разному. Сначала выбираешь, для кого строишь.` : `"${name}" is not one customer. Inside are different people with different jobs, and they pay very differently. First you choose who you build for.`}>
        <div className="mt-6"><PersonaCards segments={audSegmentsClient} covers={audSegments.map((_, i) => (personaCovers as Record<string, string>)[`${slug}-${i}`])} hue={hueFromSlug(slug)} locale={locale} payLocked={!unlocked} loggedIn={loggedIn} categorySlug={slug} categoryName={name} /></div>
        {weakSegs.length > 0 && (
          <div className="card-min mt-4 rounded-[22px] p-6">
            <h3 className="text-subhead text-[var(--color-text-primary)]">{ru ? "Кто не заплатит" : "Who won't pay"}</h3>
            <p className="mt-1.5 text-footnote text-[var(--color-text-tertiary)]">{ru ? "Эти аудитории пользуются, но платят слабо. Строить на них бизнес не стоит." : "These audiences use the apps but rarely pay. Don't build a business on them."}</p>
            <ul className="mt-3 divide-y divide-[var(--color-border-subtle)]">
              {weakSegs.map((s, i) => (
                <li key={i} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="mt-px shrink-0 text-[15px] leading-[1.4] text-[var(--color-text-tertiary)]">×</span>
                  <span className="text-callout text-[var(--color-text-secondary)]"><span className="font-medium text-[var(--color-text-primary)]">{s.name}.</span> {firstSentence(s.payNote)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* The money takeaway is THE conclusion of the audience section — an
            inverted tile, the page's single strong accent. */}
        <div className="mt-6 rounded-[22px] bg-[var(--color-text-primary)] p-6 sm:p-7">
          <h3 className="text-caption text-[color-mix(in_srgb,var(--color-bg-page)_65%,transparent)]">{ru ? "Где деньги" : "Where the money is"}</h3>
          {unlocked ? (
            <p className="mt-2.5 max-w-[58ch] text-body text-pretty text-[var(--color-bg-page)]">{tg(aud.takeaway)}</p>
          ) : (
            <div className="mt-2.5">
              <GateNote ru={ru} invert text={ru ? "Главный вывод о деньгах ниши. Открывается вместе с идеями." : "The niche's main money takeaway. It opens together with the ideas."} />
            </div>
          )}
        </div>
      </Block>

      {/* The honest rating is free proof for everyone — it is already public
          at /rating/[slug], so hiding it behind sign-in here only broke the
          descent. The ladder: rating free -> findings for a free sign-in ->
          ideas for the one payment. */}
      {channels.length > 0 && (
        <Block title={ru ? "Откуда приходят пользователи" : "Where users come from"} lead={ru ? "Каналы, которые видны прямо в отзывах: люди сами пишут, как нашли приложение и почему поставили. Это и есть дистрибуция ниши." : "Channels visible right in the reviews: people say themselves how they found the app and why they installed it. This is the niche's distribution."}>
          <div className="card-min mt-7 rounded-[22px] px-5 sm:px-6">
            {channels.map((ch, i) => (
              <Disclosure
                key={i}
                defaultOpen={i === 0}
                head={
                  <>
                    <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-primary)]">{cap(tg(ch.name))}</span>
                    <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{ch.count}</span>
                  </>
                }
              >
                <p className="text-callout text-[var(--color-text-secondary)]">{tg(ch.note)}</p>
                <div className="mt-4 flex flex-col gap-2.5">
                  {ch.quotes.slice(0, 2).map((q, j) => <Bubble key={j} app={q.app} text={ru && q.quoteRu ? q.quoteRu : q.quote} />)}
                </div>
              </Disclosure>
            ))}
          </div>
        </Block>
      )}

      <Block title={ru ? "Честный рейтинг" : "Honest rating"} lead={ru ? "Одна и та же сотня приложений в двух системах оценки. Переключи и смотри, как витринная звезда расходится с тем, что люди реально пишут в отзывах." : "The same hundred apps in two scoring systems. Switch and watch the storefront star diverge from what people actually write in reviews."}>
        <RatingToggleList apps={ratingApps} limit={8} more={ru ? `и ещё ${r.count - 8} приложений` : `and ${r.count - 8} more apps`} moreHref={`/${ru ? "ru" : "en"}/rating/${slug}`} locale={locale} />
      </Block>

      {/* The ladder, honest at every rung: rating free, the FIRST finding for a
          free sign-in (exactly what DossierGate promises), the rest of the
          findings and the ideas for the payment. Locked pillars keep only the
          observation titles + counts as a teaser — dek, bodies and quotes stay
          server-side. */}
      {loggedIn ? (
      <Block title={ru ? "Что показывают отзывы" : "What the reviews show"} lead={ru ? `Закономерности из ${NF(totalObs)} наблюдений, сгруппированные по опорам тезиса.` : `Patterns from ${NF(totalObs)} observations, grouped by the pillars of the thesis.`}>
        <div className="mt-10 flex flex-col gap-16">
          {thesis.pillars.map((p, pi) => (
            <div key={pi}>
              <h3 className="text-title3 text-[var(--color-text-primary)]">{cap(tg(p.title))}</h3>
              {unlocked || pi === 0 ? (
                <>
                  <AppLinkedText as="p" className="mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]" text={tg(p.dek)} apps={ratingApps} locale={locale} />
                  {grouped[pi].length > 0 && (
                    <div className="card-min mt-7 rounded-[22px] px-5 sm:px-6">
                      {grouped[pi].map((f, k) => (
                        <Disclosure
                          key={k}
                          head={
                            <>
                              <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-primary)]">{cap(tg(f.title))}</span>
                              <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                            </>
                          }
                        >
                          {(f.plus || f.minus) && <AppLinkedText as="p" className="text-callout text-[var(--color-text-secondary)]" text={tg([f.plus, f.minus].filter(Boolean).join(" "))} apps={ratingApps} locale={locale} />}
                          <div className="mt-5 flex flex-col gap-2.5">
                            {(f.evidence || []).slice(0, 3).map((q, j) => <Bubble key={j} app={q.app} text={ru && q.quoteRu ? q.quoteRu : q.quote} />)}
                          </div>
                        </Disclosure>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="card-min mt-7 rounded-[22px] px-5 sm:px-6">
                  {grouped[pi].map((f, k) => (
                    <div key={k} className="flex items-start gap-4 border-b border-[var(--color-border-subtle)] py-4">
                      <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-tertiary)]">{cap(tg(f.title))}</span>
                      <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-1 shrink-0 text-[var(--color-text-tertiary)]"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
                    </div>
                  ))}
                  <div className="py-4">
                    <GateNote ru={ru} text={ru ? "Сам вывод и наблюдения с цитатами под замком." : "The finding itself and its observations with quotes are locked."} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Block>
      ) : (
        <div id="unlock"><DossierGate ideasCount={ideas.length} locale={locale} /></div>
      )}

      {/* Ideas are the paid payload. Locked users see teaser cards (title,
          one-liner, score) and the single offer right at the lock. */}
      {loggedIn && (unlocked ? (
      <Block title={ru ? "Что строить" : "What to build"} lead={ru ? "Каждая идея это реальный бизнес, под который прочитаны все отзывы ниши." : "Every idea is a real business, built on reading all the reviews in the niche."}>
        <div className="mt-6"><IdeaCards ideas={ideaCards} locale={locale} columns={2} /></div>
        <div className="card-min mt-6 rounded-[22px] p-6 sm:p-7">
          <h3 className="text-subhead text-[var(--color-text-primary)]">{ru ? "С чего начать" : "Where to start"}</h3>
          <ol className="mt-3 divide-y divide-[var(--color-border-subtle)]">
            {(ru
              ? [
                  "Выбери идею с самым высоким итогом и прочитай, кто и сколько за это уже платит.",
                  "Проверь спрос сам: открой цитаты идеи и посмотри в рейтинге, как с этой работой справляются нынешние лидеры.",
                  "Собери минимальную версию вокруг одного механизма из идеи и покажи её людям из раздела «Аудитория».",
                ]
              : [
                  "Pick the idea with the highest score and read who already pays for this and how much.",
                  "Verify the demand yourself: open the idea's quotes and check in the rating how today's leaders handle this job.",
                  "Build a minimal version around one mechanism from the idea and show it to the people from the Audience section.",
                ]
            ).map((step, i) => (
              <li key={i} className="flex gap-3.5 py-3 first:pt-0 last:pb-0">
                <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-caption font-semibold tabular-nums text-[var(--color-text-primary)]">{i + 1}</span>
                <span className="text-callout text-[var(--color-text-secondary)]">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </Block>
      ) : (
      <Block title={ru ? "Что строить" : "What to build"} lead={ru ? `Три сильнейшие идеи ниши как витрина, всего их ${ideas.length}. Внутри каждой механика, деньги и пруф цитатами.` : `The three strongest ideas of the niche as a showcase, ${ideas.length} in total. Inside each: mechanics, money and quoted proof.`}>
        <div className="mt-6"><IdeaCards ideas={ideaCardsLocked} loggedIn={loggedIn} locale={locale} columns={2} /></div>
        <section id="unlock" className="card-min mt-8 rounded-[24px] px-6 py-12 text-center sm:px-10 sm:py-14">
          <h3 className="text-title2 text-[var(--color-text-primary)]">{ru ? `${ideas.length} идей под спрос этой ниши` : `${ideas.length} demand-backed ideas for this niche`}</h3>
          <p className="mx-auto mt-4 max-w-[48ch] text-body text-pretty text-[var(--color-text-secondary)]">
            {ru
              ? `Внутри каждой: чего не хватает в нише, механика продукта, кто уже платит и сколько, пруф цитатами из ${NF(totalObs)} наблюдений. Плюс закрытые выводы, оценка выручки и вывод о деньгах. Эта ниша целиком или сразу весь сайт навсегда.`
              : `Inside each one: what the niche is missing, the product mechanics, who already pays and how much, proof quoted from ${NF(totalObs)} observations. Plus the locked findings, the revenue estimate and the money takeaway. This niche in full, or the whole site forever.`}
          </p>
          <div className="mt-8 flex justify-center">
            <BuyButton
              loggedIn={loggedIn}
              locale={locale}
              categorySlug={slug}
              categoryPrice={catPrice}
              categoryName={name}
              starsHref={catStarsHref}
              starsLabel={`${CATEGORY_STARS} ⭐ Telegram`}
              lifetimePrice={LIFETIME.rub}
              lifetimeStarsHref={lifeStarsHref}
            />
          </div>
        </section>
      </Block>
      ))}

      {related.length > 0 && (
        <Block title={ru ? "Соседние ниши" : "Nearby niches"} lead={ru ? "Разборы рядом: та же аудитория, соседние работы." : "Breakdowns next door: same audience, adjacent jobs."}>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {related.map((n) => (
              <Link key={n.slug} href={`${lp}/segment/${n.slug}`} className="card-min inline-flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
                {n.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={n.icon} alt="" loading="lazy" decoding="async" className="size-7 rounded-[8px] object-cover ring-1 ring-[var(--color-border-subtle)]" />
                  : <span className="size-7 rounded-[8px] bg-[var(--color-bg-muted)]" />}
                {n.name}
              </Link>
            ))}
          </div>
        </Block>
      )}
    </main>
  );
}

function Block({ title, lead, children }: { title: string; lead?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-24">
      <h2 className="text-title2 text-[var(--color-text-primary)]">{title}</h2>
      {lead && <p className="mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">{lead}</p>}
      {children}
    </section>
  );
}

function Disclosure({ head, children, defaultOpen, card }: { head: ReactNode; children: ReactNode; defaultOpen?: boolean; card?: boolean }) {
  return (
    <details open={defaultOpen} className={card ? "group/f rounded-[16px] border border-[var(--color-border-subtle)] px-5" : "group/f border-b border-[var(--color-border-subtle)] last:border-b-0"}>
      <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
        {head}
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div className={card ? "pb-5 pr-1" : "pb-6 pr-1 sm:pr-8"}>{children}</div>
    </details>
  );
}

// Bento tile for the market overview: quiet caption label on top, content below
// (a big stat, chip row, icon rows or prose) — Apple-widget-style density mix.
function Tile({ k, wide, children }: { k: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={`card-min flex flex-col rounded-[22px] p-5 sm:p-6 ${wide ? "sm:col-span-2" : ""}`}>
      <dt className="text-caption text-[var(--color-text-tertiary)]">{k}</dt>
      <dd className="mt-2.5 flex-1">{children}</dd>
    </div>
  );
}

function BigStat({ value, sub }: { value: string; sub: string }) {
  return (
    <>
      <span className="block text-stat tabular-nums text-[var(--color-text-primary)]">{value}</span>
      <span className="mt-2 block text-footnote text-[var(--color-text-secondary)]">{sub}</span>
    </>
  );
}

// Locked slot for a money conclusion: the value itself never reaches the
// client, the note funnels into the single offer at #unlock.
function GateNote({ ru, text, invert }: { ru: boolean; text: string; invert?: boolean }) {
  const base = invert ? "text-[color-mix(in_srgb,var(--color-bg-page)_80%,transparent)]" : "text-[var(--color-text-secondary)]";
  const strong = invert ? "text-[var(--color-bg-page)]" : "text-[var(--color-text-primary)]";
  return (
    <span className="flex items-start gap-2.5">
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true" className={`mt-[3px] shrink-0 ${base}`}><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3" /></svg>
      <span className={`text-callout ${base}`}>
        {text}{" "}
        <a href="#unlock" className={`font-semibold underline underline-offset-2 ${strong}`}>{ru ? "Открыть" : "Unlock"}</a>
      </span>
    </span>
  );
}

function Bubble({ app, text }: { app: string; text: string }) {
  return (
    <figure className="max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
      <p className="text-callout italic text-[var(--color-text-secondary)]">{tg(text.length > 320 ? text.slice(0, 320) + "…" : text)}</p>
      <figcaption className="mt-1.5 text-caption not-italic text-[var(--color-text-tertiary)]">{app}</figcaption>
    </figure>
  );
}
