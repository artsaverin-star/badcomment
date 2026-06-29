import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tg } from "@/lib/typo";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { CATEGORY_PRICE_RUB, DECK_CREDIT_RUB, CATEGORY_STARS, LIFETIME } from "@/lib/tokenConfig";
import BuyButton from "@/components/BuyButton";
import DossierGate from "@/components/DossierGate";
import RatingToggleList, { type RatingApp } from "@/components/RatingToggleList";
import { PersonaCards, IdeaCards } from "@/components/TestCards";
import { getNicheThesis } from "@/lib/nicheThesis";
import { categoryCards } from "@/lib/regenCards";
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
type RApp = { id: string; title: string; icon: string | null; storeAvg: number | null; ratings: number; nrev: number; realScore: number | null; authenticity: string | null; verdict: string; loved: string; weak: string; whoFor: string | null; en?: AppEn };
type RatingFile = { name: string; nameEn?: string; count: number; totalReviews: number; apps: RApp[] };
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string }[] };
type Pillar = { title: string; dek: string; match: string[] };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string }[] };
type Segment = { name: string; job: string; payLevel: string; payNote: string; servedBy: string[]; gap: string };
type Dossier = { audience: { segments: Segment[]; takeaway: string }; market: { money: string; marketLead: string } };

const RATING = RATING_BY_SLUG as Record<string, RatingFile>;
const DOSSIER = DOSSIER_BY_SLUG as Record<string, Dossier>;

const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function groupFindings(pillars: Pillar[], cards: Finding[]) {
  return pillars.map((_, pi) =>
    cards.filter((c) => {
      const title = (c.title ?? "").toLowerCase();
      const body = `${c.plus ?? ""} ${c.minus ?? ""}`.toLowerCase();
      const score = (kws: string[]) => kws.reduce((s, kw) => s + (title.includes(kw) ? 2 : 0) + (body.includes(kw) ? 1 : 0), 0);
      let best = 0, bs = -1;
      pillars.forEach((q, qi) => { const sc = score(q.match); if (sc > bs) { bs = sc; best = qi; } });
      return best === pi;
    }).slice(0, 6),
  );
}

export default async function NicheDossier({ slug, locale = "ru" }: { slug: string; locale?: Locale }) {
  const ru = locale !== "en";
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

  // Gating: market + rating + breakdown are free (SEO proof). Audience opens for
  // a free login (lead capture). Ideas open for payment (the payload).
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
  const ideaIcons = ["sparkles", "compass", "cards", "moon", "chart", "book", "bolt", "calendar", "person"];
  const ideaCards = ideas.map((x, i) => {
    const e = ru ? undefined : enIdeas[x.slug];
    const pitch = e?.pitch ?? x.idea?.pitch;
    const features = e?.features ?? x.idea?.features;
    const antiFeatures = e?.antiFeatures ?? x.idea?.antiFeatures;
    const monetization = e?.monetization ?? x.idea?.monetization;
    const gap = e?.gap ?? x.gap;
    return {
      title: cleanTitle(e?.title ?? x.title), oneLiner: tg(e?.oneLiner ?? x.oneLiner), gap: gap ? tg(gap) : undefined,
      pitch: pitch ? tg(pitch) : undefined, features: features?.map((f) => tg(f)),
      antiFeatures: antiFeatures?.map((f) => tg(f)), monetization: monetization ? tg(monetization) : undefined,
      reviewGrid: x.reviewGrid, icon: ideaIcons[i % ideaIcons.length],
    };
  });
  const grouped = groupFindings(thesis.pillars, cards);

  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const totalObs = cards.reduce((s, c) => s + (c.count || 0), 0);
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const great = apps.filter((a) => (a.realScore || 0) > 80).length;
  const ratingApps: RatingApp[] = apps.map((a) => {
    const e = ru ? undefined : a.en;
    return {
      id: a.id, title: a.title, icon: a.icon, realScore: a.realScore, storeAvg: a.storeAvg, ratings: a.ratings,
      authenticity: a.authenticity, verdict: tg((e?.verdict ?? a.verdict) || ""), loved: tg((e?.loved ?? a.loved) || ""), weak: tg((e?.weak ?? a.weak) || ""), whoFor: (e?.whoFor ?? a.whoFor) ? tg((e?.whoFor ?? a.whoFor) as string) : null,
    };
  });
  const byRatings = [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const leaders = byRatings.slice(0, 3);
  const top3Share = Math.round((100 * leaders.reduce((s, a) => s + (a.ratings || 0), 0)) / (totalRatings || 1));

  const name = ru ? r.name : r.nameEn ?? r.name;
  const stats = [
    { n: NF(r.count), l: ru ? "приложений" : "apps" },
    { n: NF(r.totalReviews), l: ru ? "отзывов прочитано" : "reviews read" },
    { n: NF(totalObs), l: ru ? "наблюдений" : "observations" },
    { n: `${ideas.length}`, l: ru ? "идей" : "ideas" },
  ];

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {ru ? "Все ниши" : "All niches"}
      </Link>

      <header className="mt-12">
        <h1 className="glow-sweep text-display text-balance text-[var(--color-text-primary)]">{name}</h1>
        <p className="mt-6 max-w-[60ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(thesis.governing)}</p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-stat tabular-nums text-[var(--color-text-primary)]">{s.n}</span>
              <span className="mt-2.5 text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      </header>

      <Block title={ru ? "Обзор рынка" : "Market overview"} lead={tg(dossier.market.marketLead)}>
        <dl className="mt-2 border-t border-[var(--color-border-subtle)]">
          <MarketRow k={ru ? "Размер" : "Size"} v={ru ? `${NF(totalRatings)} оценок на ${r.count} приложений, ${NF(r.totalReviews)} отзывов прочитано` : `${NF(totalRatings)} ratings across ${r.count} apps, ${NF(r.totalReviews)} reviews read`} />
          <MarketRow k={ru ? "Лидеры" : "Leaders"} v={leaders.map((a) => `${a.title} (${NF(a.ratings || 0)})`).join(", ")} />
          <MarketRow k={ru ? "Концентрация" : "Concentration"} v={ru ? `топ-3 держат ${top3Share}% всех оценок` : `the top 3 hold ${top3Share}% of all ratings`} />
          <MarketRow k={ru ? "Деньги" : "Money"} v={tg(dossier.market.money)} />
          <MarketRow k={ru ? "Доверие" : "Trust"} v={ru ? `${broken} из 100 приложений со звездой накрученной или сомнительной, по-настоящему хороших всего ${great}` : `${broken} of 100 apps have an inflated or doubtful star, only ${great} are genuinely good`} />
        </dl>
        <p className="mt-8 max-w-[64ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(thesis.competitorRead ?? "")}</p>
      </Block>

      <Block title={ru ? "Аудитория" : "Audience"} lead={ru ? `«${name}» это не один клиент. Внутри сидят разные люди с разными работами, и платят они очень по-разному. Сначала выбираешь, для кого строишь.` : `"${name}" is not one customer. Inside are different people with different jobs, and they pay very differently. First you choose who you build for.`}>
        <div className="mt-6"><PersonaCards segments={audSegments} locale={locale} /></div>
        <h3 className="mt-12 text-headline text-[var(--color-text-primary)]">{ru ? "Где деньги" : "Where the money is"}</h3>
        <p className="mt-3 max-w-[64ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(aud.takeaway)}</p>
      </Block>

      {loggedIn ? (
        <>
      <Block title={ru ? "Честный рейтинг" : "Honest rating"} lead={ru ? "Одна и та же сотня приложений в двух системах оценки. Переключи и смотри, как витринная звезда расходится с тем, что люди реально пишут в отзывах." : "The same hundred apps in two scoring systems. Switch and watch the storefront star diverge from what people actually write in reviews."}>
        <RatingToggleList apps={ratingApps} limit={8} more={ru ? `и ещё ${r.count - 8} приложений` : `and ${r.count - 8} more apps`} moreHref={`/${ru ? "ru" : "en"}/rating/${slug}`} locale={locale} />
      </Block>

      {unlocked ? (
        <>
      <Block title={ru ? "Что показывают отзывы" : "What the reviews show"} lead={ru ? `Закономерности из ${NF(totalObs)} наблюдений, сгруппированные по опорам тезиса.` : `Patterns from ${NF(totalObs)} observations, grouped by the pillars of the thesis.`}>
        <div className="mt-10 flex flex-col gap-16">
          {thesis.pillars.map((p, pi) => (
            <div key={pi}>
              <h3 className="text-title3 text-[var(--color-text-primary)]">{tg(p.title)}</h3>
              <p className="mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">{tg(p.dek)}</p>
              {grouped[pi].length > 0 && (
                <div className="mt-7 border-t border-[var(--color-border-subtle)]">
                  {grouped[pi].map((f, k) => (
                    <Disclosure
                      key={k}
                      head={
                        <>
                          <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-primary)]">{tg(f.title)}</span>
                          <span className="shrink-0 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                        </>
                      }
                    >
                      {(f.plus || f.minus) && <p className="text-callout text-[var(--color-text-secondary)]">{tg([f.plus, f.minus].filter(Boolean).join(" "))}</p>}
                      <div className="mt-5 flex flex-col gap-2.5">
                        {(f.evidence || []).slice(0, 3).map((q, j) => <Bubble key={j} app={q.app} text={q.quote} />)}
                      </div>
                    </Disclosure>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Block>

      <Block title={ru ? "Что строить" : "What to build"} lead={ru ? "Каждая идея это реальный бизнес, под который прочитаны все отзывы ниши." : "Every idea is a real business, built on reading all the reviews in the niche."}>
        <div className="mt-6"><IdeaCards ideas={ideaCards} locale={locale} /></div>
      </Block>
        </>
      ) : (
        <section className="mt-24">
          <div className="rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-14 text-center sm:px-10 sm:py-16">
            <h3 className="text-title2 text-[var(--color-text-primary)]">{ru ? `Выводы по отзывам и ${ideas.length} идей` : `Conclusions from reviews and ${ideas.length} ideas`}</h3>
            <p className="mx-auto mt-4 max-w-[48ch] text-body text-pretty text-[var(--color-text-secondary)]">
              {ru
                ? `Структурные выводы по ${NF(totalObs)} наблюдениям с прямыми цитатами и ${ideas.length} идей под спрос: что строить, для кого и как заработать. Один платёж открывает весь сайт навсегда: все категории, все идеи и народный рейтинг.`
                : `Structural conclusions from ${NF(totalObs)} observations with direct quotes and ${ideas.length} demand-backed ideas: what to build, for whom and how to make money. One payment unlocks the whole site forever: every category, every idea and the people's rating.`}
            </p>
            <div className="mt-8 flex justify-center">
              <BuyButton
                kind="category"
                slug={slug}
                price={catPrice}
                loggedIn={loggedIn}
                locale={locale}
                starsHref={catStarsHref}
                starsLabel={`${CATEGORY_STARS} ⭐ Telegram`}
                lifetimePrice={LIFETIME.rub}
                lifetimeStarsHref={lifeStarsHref}
              />
            </div>
          </div>
        </section>
      )}
        </>
      ) : (
        <DossierGate ideasCount={ideas.length} locale={locale} />
      )}
    </main>
  );
}

function Block({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
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
    <details open={defaultOpen} className={card ? "group/f rounded-[16px] border border-[var(--color-border-subtle)] px-5" : "group/f border-b border-[var(--color-border-subtle)]"}>
      <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
        {head}
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div className={card ? "pb-5 pr-1" : "pb-6 pr-1 sm:pr-8"}>{children}</div>
    </details>
  );
}

function MarketRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-[var(--color-border-subtle)] py-3.5 sm:flex-row sm:gap-6">
      <dt className="w-32 shrink-0 text-callout font-medium text-[var(--color-text-tertiary)]">{k}</dt>
      <dd className="text-callout text-[var(--color-text-secondary)]">{v}</dd>
    </div>
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
