import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { tg } from "@/lib/typo";
import rating from "@/data/peoplesRating/astrology.json";
import thesisAll from "@/data/niche-thesis.json";
import cardsAll from "@/data/segment-cards.json";
import ideasAll from "@/data/ideas.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Разбор ниши — астрология (прототип)",
  robots: { index: false, follow: false },
};

// PROTOTYPE (/test): the unified founder offer built on the /segment design —
// editorial, pillar-driven, quotes as chat bubbles. Adds the market read and an
// honest-rating act on top of the breakdown + ideas. All data real. RU only.

const SLUG = "astrology";
const NF = (n: number) => n.toLocaleString("ru-RU");
const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const AUTH: Record<string, { w: string; c: string }> = {
  "Подлинный": { w: "честная звезда", c: "#30d158" },
  "Сомнительный": { w: "сомнительная звезда", c: "#e0b400" },
  "Накручен": { w: "накрученная звезда", c: "#ff6961" },
};

type RApp = (typeof rating.apps)[number];
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string }[] };
type Pillar = { title: string; dek: string; match: string[] };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string }[] };

// route each finding under the best-matching pillar (title weighted 2×) — same
// logic as the live /segment page.
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

export default function TestDossier() {
  const r = rating as typeof rating;
  const apps = [...(r.apps as RApp[])].sort((a, b) => (b.realScore || 0) - (a.realScore || 0));
  const thesis = (thesisAll as unknown as Record<string, { governing: string; competitorRead: string; pillars: Pillar[] }>)[SLUG];
  const cards = ((cardsAll as unknown as Record<string, { product?: Finding[] }>)[SLUG]?.product ?? []).slice().sort((a, b) => (b.count || 0) - (a.count || 0));
  const ideas = (ideasAll as unknown as Idea[]).filter((x) => x.category === SLUG);
  const grouped = groupFindings(thesis.pillars, cards);

  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const totalObs = cards.reduce((s, c) => s + (c.count || 0), 0);
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const great = apps.filter((a) => (a.realScore || 0) > 80).length;
  const topApps = apps.slice(0, 8);
  const byRatings = [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const leaders = byRatings.slice(0, 3);
  const top3Share = Math.round((100 * leaders.reduce((s, a) => s + (a.ratings || 0), 0)) / (totalRatings || 1));

  const stats = [
    { n: NF(totalRatings), l: "оценок в нише" },
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

      {/* HERO */}
      <header className="mt-12">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Разбор ниши</div>
        <h1 className="glow-sweep mt-6 text-[clamp(30px,8vw,72px)] font-black leading-[0.98] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">{r.name}</h1>
        <p className="mt-8 max-w-[58ch] text-[21px] font-light leading-[1.45] text-pretty text-[var(--color-text-secondary)] sm:text-[27px]">{tg(thesis.governing)}</p>

        <div className="mt-14 flex flex-wrap gap-x-12 gap-y-8">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col">
              <span className="text-[40px] font-black leading-none tracking-[-0.04em] tabular-nums text-[var(--color-text-primary)] sm:text-[46px]">{s.n}</span>
              <span className="mt-2.5 text-[13px] text-[var(--color-text-tertiary)]">{s.l}</span>
            </div>
          ))}
        </div>

      </header>

      {/* ACT — MARKET OVERVIEW */}
      <Block num="01" title="Обзор рынка" lead="Большой платящий рынок со сломанным доверием. Деньги в подписке, но почти никто не делает по-настоящему хороший продукт.">
        <dl className="mt-2 border-t border-[var(--color-border-subtle)]">
          <MarketRow k="Размер" v={`${NF(totalRatings)} оценок на ${r.count} приложений, ${NF(r.totalReviews)} отзывов прочитано`} />
          <MarketRow k="Лидеры" v={leaders.map((a) => `${a.title} (${NF(a.ratings || 0)})`).join(", ")} />
          <MarketRow k="Концентрация" v={`топ-3 держат ${top3Share}% всех оценок, рынок не монополизирован, место есть`} />
          <MarketRow k="Деньги" v="25 из 25 крупнейших приложений бесплатны, монетизация подпиской, рынок платит за удержание" />
          <MarketRow k="Доверие" v={`${broken} из 100 приложений со звездой накрученной или сомнительной, по-настоящему хороших всего ${great}`} />
        </dl>
        <div className="mt-8">
          <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Что происходит</div>
          <p className="mt-3 max-w-[64ch] text-[17px] leading-[1.65] text-pretty text-[var(--color-text-secondary)]">{tg(thesis.competitorRead)}</p>
        </div>
      </Block>

      {/* ACT — HONEST RATING */}
      <Block num="02" title="Честный рейтинг" lead={`Балл по реальному качеству из отзывов, не по витринной звезде. ${great} приложений из 100 действительно хороши.`}>
        <div className="mt-2 border-t border-[var(--color-border-subtle)]">
          {topApps.map((a, i) => {
            const au = AUTH[a.authenticity || ""] || { w: "", c: "var(--color-text-tertiary)" };
            return (
              <Disclosure
                key={a.id}
                head={
                  <>
                    <span className="w-5 shrink-0 pt-2.5 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                    {a.icon
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[12px] object-cover" />
                      : <span className="size-11 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />}
                    <span className="min-w-0 flex-1">
                      <span className="block text-[16px] font-medium leading-[1.3] text-[var(--color-text-primary)]">{a.title}</span>
                      {a.verdict && <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.45] text-[var(--color-text-tertiary)]">{tg(a.verdict)}</span>}
                    </span>
                    <span className="shrink-0 pt-1 text-right">
                      <span className="block text-[17px] font-bold tabular-nums leading-none text-[var(--color-text-primary)]">{a.realScore}</span>
                      <span className="mt-1 block text-[11px]" style={{ color: au.c }}>{au.w}</span>
                    </span>
                  </>
                }
              >
                <div className="text-[12px] text-[var(--color-text-tertiary)]">в сторе {a.storeAvg?.toFixed(1)}★ · {NF(a.ratings || 0)} оценок</div>
                <FieldRow k="Сильное" v={a.loved} />
                <FieldRow k="Слабое" v={a.weak} />
                <FieldRow k="Кому" v={a.whoFor} />
              </Disclosure>
            );
          })}
        </div>
        <div className="mt-4 text-[14px]"><span className="text-[var(--color-text-tertiary)]">и ещё {r.count - topApps.length} приложений — </span><span className="font-medium text-[var(--color-text-primary)]">весь рейтинг</span></div>
      </Block>

      {/* ACT — BREAKDOWN by thesis pillars (no generic "holes" label) */}
      <Block num="03" title="Что показывают отзывы" lead={`Закономерности из ${NF(totalObs)} наблюдений, сгруппированные по опорам тезиса. Раскрой вывод, чтобы увидеть реальные отзывы.`}>
        <div className="mt-10 flex flex-col gap-16">
          {thesis.pillars.map((p, pi) => (
            <div key={pi}>
              <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Опора 0{pi + 1}</div>
              <h3 className="mt-3 text-[27px] font-semibold leading-[1.12] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-[32px]">{tg(p.title)}</h3>
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

      {/* ACT — IDEAS */}
      <Block num="04" title="Что строить" lead="Каждая идея — реальный бизнес, под который прочитаны все отзывы ниши. На проде сидят за платной стеной, здесь раскрыты целиком.">
        <div className="mt-4 border-t border-[var(--color-border-subtle)]">
          {ideas.map((x, i) => (
            <Disclosure
              key={x.slug}
              defaultOpen={i === 0}
              head={
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[18px] font-semibold leading-[1.25] text-[var(--color-text-primary)]">{cleanTitle(x.title)}</span>
                  <span className="text-[14px] leading-[1.4] text-[var(--color-text-tertiary)]">{x.oneLiner}</span>
                </span>
              }
            >
              <div className="flex flex-col gap-4 text-[15px] leading-[1.65]">
                {x.gap && <Para k="Дыра, которую закрывает" v={x.gap} />}
                {x.idea?.pitch && <Para k="Что это" v={x.idea.pitch} />}
                {!!x.idea?.features?.length && <ListBlock k="Как устроено" items={x.idea.features} mark="·" />}
                {!!x.idea?.antiFeatures?.length && <ListBlock k="Чего не делаем" items={x.idea.antiFeatures} mark="×" />}
                {x.idea?.monetization && <Para k="Деньги" v={x.idea.monetization} />}
                {!!x.reviewGrid?.length && (
                  <div>
                    <div className="text-[13px] font-medium text-[var(--color-text-tertiary)]">Пруф из отзывов</div>
                    <div className="mt-3 flex flex-col gap-2.5">
                      {x.reviewGrid.slice(0, 5).map((q, j) => <Bubble key={j} app={q.app} text={q.quote} />)}
                    </div>
                  </div>
                )}
              </div>
            </Disclosure>
          ))}
        </div>
      </Block>

      <p className="mt-20 text-center text-[12px] text-[var(--color-text-tertiary)]">Прототип · /test · данные реальные (астрология)</p>
    </main>
  );
}

function Block({ num, title, lead, children }: { num: string; title: string; lead?: string; children: ReactNode }) {
  return (
    <section className="mt-24">
      <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Шаг {num}</div>
      <h2 className="mt-3 text-[clamp(28px,7vw,44px)] font-black leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
      {lead && <p className="mt-5 max-w-[62ch] text-[17px] leading-[1.6] text-pretty text-[var(--color-text-secondary)]">{lead}</p>}
      {children}
    </section>
  );
}

function Disclosure({ head, children, defaultOpen }: { head: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group/f border-b border-[var(--color-border-subtle)]">
      <summary className="flex cursor-pointer list-none items-start gap-4 py-4 [&::-webkit-details-marker]:hidden">
        {head}
        <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </summary>
      <div className="pb-6 pr-1 sm:pr-8">{children}</div>
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

function FieldRow({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]"><span className="font-medium text-[var(--color-text-primary)]">{k}. </span>{tg(v)}</p>
  );
}

function Para({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-[13px] font-medium text-[var(--color-text-tertiary)]">{k}</div>
      <p className="mt-1 text-[var(--color-text-secondary)]">{tg(v)}</p>
    </div>
  );
}

function ListBlock({ k, items, mark }: { k: string; items: string[]; mark: string }) {
  return (
    <div>
      <div className="text-[13px] font-medium text-[var(--color-text-tertiary)]">{k}</div>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2.5 text-[var(--color-text-secondary)]"><span className="text-[var(--color-text-tertiary)]">{mark}</span>{tg(it)}</li>
        ))}
      </ul>
    </div>
  );
}
