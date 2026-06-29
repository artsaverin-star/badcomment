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
import thesisAll from "@/data/niche-thesis.json";
import cardsAll from "@/data/segment-cards.json";
import ideasAll from "@/data/ideas.json";

import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { DOSSIER_BY_SLUG } from "@/data/dossier";

// The unified niche dossier: market overview, audience, honest rating (sentiment
// vs store), breakdown by thesis pillars, and idea cards. Server component,
// fully parameterized by slug. People's-rating + dossier (audience/market) data
// is keyed per niche; thesis/findings/ideas come from the shared keyed files.

type RApp = { id: string; title: string; icon: string | null; storeAvg: number | null; ratings: number; nrev: number; realScore: number | null; authenticity: string | null; verdict: string; loved: string; weak: string; whoFor: string | null };
type RatingFile = { name: string; nameEn?: string; count: number; totalReviews: number; apps: RApp[] };
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string }[] };
type Pillar = { title: string; dek: string; match: string[] };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string }[] };
type Segment = { name: string; job: string; payLevel: string; payNote: string; servedBy: string[]; gap: string };
type Dossier = { audience: { segments: Segment[]; takeaway: string }; market: { money: string; marketLead: string } };

const RATING = RATING_BY_SLUG as Record<string, RatingFile>;
const DOSSIER = DOSSIER_BY_SLUG as Record<string, Dossier>;

const NF = (n: number) => n.toLocaleString("ru-RU");
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

export default async function NicheDossier({ slug }: { slug: string }) {
  const r = RATING[slug];
  const dossier = DOSSIER[slug];
  const thesis = (thesisAll as unknown as Record<string, { governing: string; competitorRead: string; pillars: Pillar[] }>)[slug];
  if (!r || !dossier || !thesis) notFound();

  const apps = [...r.apps].sort((a, b) => (b.realScore || 0) - (a.realScore || 0));
  const cards = ((cardsAll as unknown as Record<string, { product?: Finding[] }>)[slug]?.product ?? []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
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
  const ideaCards = ideas.map((x, i) => ({
    title: cleanTitle(x.title), oneLiner: tg(x.oneLiner), gap: x.gap ? tg(x.gap) : undefined,
    pitch: x.idea?.pitch ? tg(x.idea.pitch) : undefined, features: x.idea?.features?.map((f) => tg(f)),
    antiFeatures: x.idea?.antiFeatures?.map((f) => tg(f)), monetization: x.idea?.monetization ? tg(x.idea.monetization) : undefined,
    reviewGrid: x.reviewGrid, icon: ideaIcons[i % ideaIcons.length],
  }));
  const grouped = groupFindings(thesis.pillars, cards);

  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const totalObs = cards.reduce((s, c) => s + (c.count || 0), 0);
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const great = apps.filter((a) => (a.realScore || 0) > 80).length;
  const ratingApps: RatingApp[] = apps.map((a) => ({
    id: a.id, title: a.title, icon: a.icon, realScore: a.realScore, storeAvg: a.storeAvg, ratings: a.ratings,
    authenticity: a.authenticity, verdict: tg(a.verdict || ""), loved: tg(a.loved || ""), weak: tg(a.weak || ""), whoFor: a.whoFor ? tg(a.whoFor) : null,
  }));
  const byRatings = [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const leaders = byRatings.slice(0, 3);
  const top3Share = Math.round((100 * leaders.reduce((s, a) => s + (a.ratings || 0), 0)) / (totalRatings || 1));

  const stats = [
    { n: NF(r.count), l: "приложений" },
    { n: NF(r.totalReviews), l: "отзывов прочитано" },
    { n: NF(totalObs), l: "наблюдений" },
    { n: `${ideas.length}`, l: "идей" },
  ];

  return (
    <main className="relative mx-auto w-full max-w-[720px] overflow-x-clip px-4 pb-28 pt-16 sm:px-6 sm:pt-24">
      <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Все ниши
      </Link>

      <header className="mt-12">
        <h1 className="glow-sweep text-[clamp(30px,8vw,72px)] font-black leading-[0.98] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">{r.name}</h1>
        <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.6] text-pretty text-[var(--color-text-secondary)] sm:text-[18px]">{tg(thesis.governing)}</p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[40px] font-black leading-none tracking-[-0.04em] tabular-nums text-[var(--color-text-primary)] sm:text-[46px]">{s.n}</span>
              <span className="mt-2.5 text-[13px] text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>
      </header>

      <Block title="Обзор рынка" lead={tg(dossier.market.marketLead)}>
        <dl className="mt-2 border-t border-[var(--color-border-subtle)]">
          <MarketRow k="Размер" v={`${NF(totalRatings)} оценок на ${r.count} приложений, ${NF(r.totalReviews)} отзывов прочитано`} />
          <MarketRow k="Лидеры" v={leaders.map((a) => `${a.title} (${NF(a.ratings || 0)})`).join(", ")} />
          <MarketRow k="Концентрация" v={`топ-3 держат ${top3Share}% всех оценок`} />
          <MarketRow k="Деньги" v={tg(dossier.market.money)} />
          <MarketRow k="Доверие" v={`${broken} из 100 приложений со звездой накрученной или сомнительной, по-настоящему хороших всего ${great}`} />
        </dl>
        <p className="mt-8 max-w-[64ch] text-[17px] leading-[1.65] text-pretty text-[var(--color-text-secondary)]">{tg(thesis.competitorRead)}</p>
      </Block>

      <Block title="Аудитория" lead={`«${r.name}» это не один клиент. Внутри сидят разные люди с разными работами, и платят они очень по-разному. Сначала выбираешь, для кого строишь.`}>
        <div className="mt-6"><PersonaCards segments={audSegments} locale="ru" /></div>
        <div className="mt-5 rounded-[16px] bg-[var(--color-bg-muted)] p-5">
          <h3 className="text-[17px] font-bold text-[var(--color-text-primary)]">Где деньги</h3>
          <p className="mt-2 text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">{tg(aud.takeaway)}</p>
        </div>
      </Block>

      {loggedIn ? (
        <>
      <Block title="Честный рейтинг" lead="Одна и та же сотня приложений в двух системах оценки. Переключи и смотри, как витринная звезда расходится с тем, что люди реально пишут в отзывах.">
        <RatingToggleList apps={ratingApps} limit={8} more={`и ещё ${r.count - 8} приложений`} moreHref={`/ru/rating/${slug}`} />
      </Block>

      {unlocked ? (
        <>
      <Block title="Что показывают отзывы" lead={`Закономерности из ${NF(totalObs)} наблюдений, сгруппированные по опорам тезиса.`}>
        <div className="mt-10 flex flex-col gap-16">
          {thesis.pillars.map((p, pi) => (
            <div key={pi}>
              <h3 className="text-[27px] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[32px]">{tg(p.title)}</h3>
              <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.65] text-pretty text-[var(--color-text-secondary)] sm:text-[18px]">{tg(p.dek)}</p>
              {grouped[pi].length > 0 && (
                <div className="mt-7 border-t border-[var(--color-border-subtle)]">
                  {grouped[pi].map((f, k) => (
                    <Disclosure
                      key={k}
                      head={
                        <>
                          <span className="min-w-0 flex-1 text-[16px] font-medium leading-[1.45] text-[var(--color-text-primary)]">{tg(f.title)}</span>
                          <span className="shrink-0 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                        </>
                      }
                    >
                      {(f.plus || f.minus) && <p className="text-[15px] leading-[1.65] text-[var(--color-text-secondary)]">{tg([f.plus, f.minus].filter(Boolean).join(" "))}</p>}
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

      <Block title="Что строить" lead="Каждая идея это реальный бизнес, под который прочитаны все отзывы ниши.">
        <div className="mt-6"><IdeaCards ideas={ideaCards} /></div>
      </Block>
        </>
      ) : (
        <section className="mt-24">
          <div className="rounded-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-6 py-14 text-center sm:px-10 sm:py-16">
            <h3 className="text-[clamp(26px,6vw,36px)] font-black leading-[1.08] tracking-[-0.03em] text-[var(--color-text-primary)]">Выводы по отзывам и {ideas.length} идей</h3>
            <p className="mx-auto mt-4 max-w-[48ch] text-[16px] leading-[1.55] text-pretty text-[var(--color-text-secondary)]">
              Структурные выводы по {NF(totalObs)} наблюдениям с прямыми цитатами и {ideas.length} идей под спрос: что строить, для кого и как заработать. Один платёж открывает весь сайт навсегда: все категории, все идеи и народный рейтинг.
            </p>
            <div className="mt-8 flex justify-center">
              <BuyButton
                kind="category"
                slug={slug}
                price={catPrice}
                loggedIn={loggedIn}
                locale="ru"
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
        <DossierGate ideasCount={ideas.length} locale="ru" />
      )}
    </main>
  );
}

function Block({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-24">
      <h2 className="text-[clamp(28px,7vw,44px)] font-black leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
      {lead && <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.6] text-pretty text-[var(--color-text-secondary)]">{lead}</p>}
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
      <dt className="w-32 shrink-0 text-[14px] font-medium text-[var(--color-text-tertiary)]">{k}</dt>
      <dd className="text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{v}</dd>
    </div>
  );
}

function Bubble({ app, text }: { app: string; text: string }) {
  return (
    <figure className="max-w-[92%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
      <p className="text-[14px] italic leading-[1.55] text-[var(--color-text-secondary)]">{tg(text.length > 320 ? text.slice(0, 320) + "…" : text)}</p>
      <figcaption className="mt-1.5 text-[12px] not-italic text-[var(--color-text-tertiary)]">{app}</figcaption>
    </figure>
  );
}
