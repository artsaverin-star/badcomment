import type { Metadata } from "next";
import rating from "@/data/peoplesRating/astrology.json";
import thesisAll from "@/data/niche-thesis.json";
import cardsAll from "@/data/segment-cards.json";
import ideasAll from "@/data/ideas.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Прототип единого спуска — астрология",
  robots: { index: false, follow: false },
};

// PROTOTYPE (/test): one niche shown as a full founder dossier — a decision band
// (demand / money / trust) on top of the review descent Рейтинг → Разбор →
// Идеи. All data is real. Market signals: ratings counts (demand) computed live
// from our store data; money (25/25 of the biggest apps are free → subscription
// market) fetched once from the App Store on 2026-06-28; trust split from our
// authenticity scoring. RU only.

const SLUG = "astrology";
const NF = (n: number) => n.toLocaleString("ru-RU");
const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

// money signal sampled from the App Store on 2026-06-28 (top 25 by ratings)
const MONEY = { sampled: 25, free: 25 };

type RApp = (typeof rating.apps)[number];
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string }[] };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string }[] };

export default function TestDescentPage() {
  const r = rating as typeof rating;
  const apps = r.apps as RApp[];
  const thesis = (thesisAll as Record<string, { governing: string }>)[SLUG];
  const findings = ((cardsAll as Record<string, { product?: Finding[] }>)[SLUG]?.product ?? []).slice(0, 6);
  const ideas = (ideasAll as Idea[]).filter((x) => x.category === SLUG);

  // demand signals computed live from real store data
  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const byRatings = [...apps].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const top5 = byRatings.slice(0, 5);
  const maxR = top5[0]?.ratings || 1;
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const greatCount = apps.filter((a) => (a.realScore || 0) > 80).length;

  const topApps = byRatings.slice(0, 8);
  const firstIdea = ideas[0];
  const lockedIdeas = ideas.slice(1);
  const firstProof = (firstIdea?.reviewGrid ?? []).slice(0, 2);

  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      {/* sticky progress: one document, three acts */}
      <div className="sticky top-0 z-30 -mx-4 mb-2 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <a href="#decision"><Step n={0} label="Рынок" active /></a>
          <Spacer /><a href="#rating"><Step n={1} label="Рейтинг" /></a>
          <Spacer /><a href="#breakdown"><Step n={2} label="Разбор" /></a>
          <Spacer /><a href="#ideas"><Step n={3} label="Идеи" /></a>
        </div>
      </div>

      {/* hero — one job, founder */}
      <header className="pt-10">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Разбор ниши · {r.name}</div>
        <h1 className="glow-sweep mt-5 text-[clamp(32px,8vw,58px)] font-black leading-[1.0] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">
          Стоит ли строить в этой нише и что именно
        </h1>
        <p className="mt-6 max-w-[54ch] text-[18px] font-light leading-[1.5] text-pretty text-[var(--color-text-secondary)] sm:text-[21px]">
          Размер рынка, модель денег и состояние доверия — а под ними честный рейтинг, разбор дыр и готовые идеи. Всё из реальных данных, ничего на глаз.
        </p>
      </header>

      {/* ACT 0 — DECISION BAND (is the prize worth it) */}
      <section id="decision" className="mt-12 scroll-mt-20">
        <div className="grid gap-3 sm:grid-cols-3">
          <Signal kicker="Спрос" big={NF(Math.round(totalRatings / 1000)) + "K"} unit="оценок в нише" note={`${r.count} приложений · крупнейшее ${NF(top5[0]?.ratings || 0)}`} />
          <Signal kicker="Деньги" big={`${Math.round((100 * MONEY.free) / MONEY.sampled)}%`} unit="топа бесплатны" note="монетизация через подписку, рынок платит за удержание" />
          <Signal kicker="Доверие" big={`${broken}/100`} unit="звёзд накручены или сомнительны" note={`реально хороши лишь ${greatCount} из 100 — вход для честного игрока`} accent />
        </div>
        <p className="mt-5 rounded-[14px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-5 py-4 text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">
          <span className="font-semibold text-[var(--color-text-primary)]">Вывод по рынку: </span>
          большой платящий рынок ({NF(totalRatings)} оценок), деньги в подписке, но доверие сломано — {broken} из 100 приложений накручивают звезду, а по-настоящему хороших всего {greatCount}. Это и есть щель: честный продукт с реальным голосом.
        </p>
        <Descend href="#rating" label="Кто в нише реально хорош" />
      </section>

      {/* ACT 1 — RATING (the proof) */}
      <section id="rating" className="mt-20 scroll-mt-20">
        <ActHead n={1} kicker="Доказательство" title="Честный рейтинг по отзывам" sub={`${NF(r.totalReviews)} отзывов прочитано. Балл — по реальному качеству продукта, а не по витринной звезде, которую накручивают.`} />

        {/* who owns the market — real rating-count bars */}
        <div className="mt-7 rounded-[16px] border border-[var(--color-border-subtle)] p-5">
          <div className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Кто держит рынок по числу оценок</div>
          <div className="mt-3 flex flex-col gap-2.5">
            {top5.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className="w-[38%] shrink-0 truncate text-[13px] text-[var(--color-text-secondary)]">{a.title}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-bg-muted)]">
                  <div className="h-full rounded-full bg-[var(--color-text-primary)]" style={{ width: `${Math.max(6, Math.round(100 * (a.ratings || 0) / maxR))}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{NF(a.ratings || 0)}</span>
              </div>
            ))}
          </div>
        </div>

        <ol className="mt-6 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
          {topApps.map((a, i) => (
            <li key={a.id} className="py-4">
              <div className="flex items-center gap-3">
                <span className="w-5 text-[13px] font-medium tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                {a.icon
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.icon} alt="" loading="lazy" className="size-10 shrink-0 rounded-[10px] object-cover" />
                  : <div className="size-10 shrink-0 rounded-[10px] bg-[var(--color-bg-muted)]" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold text-[var(--color-text-primary)]">{a.title}</div>
                  <div className="text-[12px] text-[var(--color-text-tertiary)]">в сторе {a.storeAvg?.toFixed(1)}★ · {NF(a.ratings || 0)} оценок</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">{a.realScore}<span className="text-[11px] font-medium text-[var(--color-text-tertiary)]">/100</span></div>
                  <AuthChip a={a.authenticity} />
                </div>
              </div>
              {a.verdict && <p className="mt-2 pl-8 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{a.verdict}</p>}
            </li>
          ))}
        </ol>
        <div className="mt-3 text-center text-[13px] text-[var(--color-text-tertiary)]">и ещё {r.count - topApps.length} приложений в полном рейтинге</div>
        <Descend href="#breakdown" label="Что вся категория делает не так" />
      </section>

      {/* ACT 2 — BREAKDOWN (the argument, with real review quotes) */}
      <section id="breakdown" className="mt-20 scroll-mt-20">
        <ActHead n={2} kicker="Аргумент" title="Где ниша сломана" sub="Структурные дыры, которые видны во всех приложениях сразу. Каждая — из реальных отзывов." />
        <p className="mt-7 max-w-[60ch] text-[17px] leading-[1.6] text-pretty text-[var(--color-text-secondary)]">{thesis.governing}</p>

        <div className="mt-8 flex flex-col gap-4">
          {findings.map((f, i) => {
            const ev = (f.evidence || [])[0];
            return (
              <div key={i} className="rounded-[18px] border border-[var(--color-border-subtle)] p-5">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-[12px] font-bold tabular-nums text-[var(--color-text-tertiary)]">0{i + 1}</span>
                  <div>
                    <h3 className="text-[17px] font-bold leading-[1.35] text-[var(--color-text-primary)]">{f.title}</h3>
                    {(f.plus || f.minus) && (
                      <p className="mt-1.5 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">{f.minus || f.plus}</p>
                    )}
                  </div>
                </div>
                {ev && (
                  <figure className="mt-3 border-l-2 border-[var(--color-border-subtle)] pl-3.5">
                    <blockquote className="text-[14px] italic leading-[1.5] text-[var(--color-text-secondary)]">“{ev.quote.length > 220 ? ev.quote.slice(0, 220) + "…" : ev.quote}”</blockquote>
                    <figcaption className="mt-1 text-[12px] text-[var(--color-text-tertiary)]">{ev.app} · {ev.rating}★{f.count ? ` · ${f.count} похожих отзывов` : ""}</figcaption>
                  </figure>
                )}
              </div>
            );
          })}
        </div>
        <Descend href="#ideas" label="Что из этого строить" />
      </section>

      {/* ACT 3 — IDEAS (the paid payload, first one with proof) */}
      <section id="ideas" className="mt-20 scroll-mt-20">
        <ActHead n={3} kicker="Что строить" title={`${ideas.length} идей под эту нишу`} sub="Каждая — реальный бизнес, под который прочитаны все отзывы категории. Не фича, не генерик." />

        {firstIdea && (
          <article className="mt-8 rounded-[20px] border border-[var(--color-border-subtle)] p-6">
            <div className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Идея 1 · открыта целиком</div>
            <h3 className="mt-2 text-[23px] font-black tracking-[-0.02em] text-[var(--color-text-primary)]">{cleanTitle(firstIdea.title)}</h3>
            <p className="mt-2 text-[16px] leading-[1.55] text-[var(--color-text-secondary)]">{firstIdea.oneLiner}</p>

            {firstIdea.gap && (
              <div className="mt-5">
                <div className="text-[12px] font-semibold tracking-[0.03em] text-[var(--color-text-tertiary)]">ДЫРА</div>
                <p className="mt-1 text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{firstIdea.gap}</p>
              </div>
            )}
            {firstIdea.idea?.pitch && (
              <div className="mt-4">
                <div className="text-[12px] font-semibold tracking-[0.03em] text-[var(--color-text-tertiary)]">ЧТО ЭТО</div>
                <p className="mt-1 text-[15px] leading-[1.55] text-[var(--color-text-secondary)]">{firstIdea.idea.pitch}</p>
              </div>
            )}
            {!!firstIdea.idea?.features?.length && (
              <ul className="mt-4 flex flex-col gap-1.5">
                {firstIdea.idea.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex gap-2 text-[14px] leading-[1.5] text-[var(--color-text-secondary)]"><span className="text-[var(--color-text-tertiary)]">·</span>{f}</li>
                ))}
              </ul>
            )}
            {!!firstProof.length && (
              <div className="mt-5 rounded-[14px] bg-[var(--color-bg-muted)] p-4">
                <div className="text-[12px] font-semibold tracking-[0.03em] text-[var(--color-text-tertiary)]">ПРУФ ИЗ ОТЗЫВОВ</div>
                <div className="mt-2 flex flex-col gap-2.5">
                  {firstProof.map((q, i) => (
                    <figure key={i}>
                      <blockquote className="text-[13.5px] italic leading-[1.5] text-[var(--color-text-secondary)]">“{q.quote.length > 180 ? q.quote.slice(0, 180) + "…" : q.quote}”</blockquote>
                      <figcaption className="mt-0.5 text-[11.5px] text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </article>
        )}

        {/* the rest: locked behind a contextual paywall at the end of the descent */}
        <div className="relative mt-4">
          <div className="flex flex-col gap-3" aria-hidden>
            {lockedIdeas.map((x, i) => (
              <div key={i} className="rounded-[16px] border border-[var(--color-border-subtle)] p-5 blur-[5px]">
                <h3 className="text-[19px] font-bold text-[var(--color-text-primary)]">{cleanTitle(x.title)}</h3>
                <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">{x.oneLiner}</p>
              </div>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 top-8 flex items-end justify-center bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--color-bg-page)_55%,transparent)] to-[var(--color-bg-page)]">
            <div className="w-full rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-6 text-center shadow-[0_-24px_70px_-24px_rgba(0,0,0,0.6)]">
              <div className="text-[13px] font-medium text-[var(--color-text-tertiary)]">Ещё {lockedIdeas.length} идей под {r.name.toLowerCase()}</div>
              <div className="mt-2 text-[21px] font-bold text-[var(--color-text-primary)]">Открыть все идеи ниши</div>
              <p className="mx-auto mt-2 max-w-[42ch] text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">
                Ты уже видел размер рынка, рейтинг и разбор. Идеи — вывод из них: что конкретно строить, с пруфами из отзывов.
              </p>
              <button className="mt-5 w-full rounded-full bg-[var(--color-text-primary)] px-6 py-3 text-[15px] font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">
                Открыть · Lifetime — весь каталог навсегда
              </button>
              <div className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">или открыть только эту нишу</div>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-16 text-center text-[12px] text-[var(--color-text-tertiary)]">Прототип единого оффера · /test · данные реальные (астрология, {NF(r.totalReviews)} отзывов)</p>
    </main>
  );
}

function Spacer() {
  return <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />;
}

function Step({ n, label, active }: { n: number; label: string; active?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${active ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]" : "border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"}`}>{n}</span>
      <span className={`text-[12.5px] ${active ? "font-medium text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{label}</span>
    </div>
  );
}

function Signal({ kicker, big, unit, note, accent }: { kicker: string; big: string; unit: string; note: string; accent?: boolean }) {
  return (
    <div className={`rounded-[16px] border p-4 ${accent ? "border-[#e0b400]/35 bg-[rgba(224,180,0,0.06)]" : "border-[var(--color-border-subtle)]"}`}>
      <div className="text-[12px] font-semibold tracking-[0.04em] text-[var(--color-text-tertiary)]">{kicker.toUpperCase()}</div>
      <div className="mt-1.5 text-[30px] font-black leading-none tracking-[-0.03em] tabular-nums text-[var(--color-text-primary)]">{big}</div>
      <div className="mt-1 text-[13px] font-medium text-[var(--color-text-secondary)]">{unit}</div>
      <div className="mt-2 text-[12px] leading-[1.45] text-[var(--color-text-tertiary)]">{note}</div>
    </div>
  );
}

function AuthChip({ a }: { a: string | null }) {
  const map: Record<string, { w: string; c: string }> = {
    "Накручен": { w: "накручена", c: "#ff6961" },
    "Подлинный": { w: "честная", c: "#30d158" },
    "Сомнительный": { w: "сомнительна", c: "#e0b400" },
  };
  const v = map[a || ""] || { w: "—", c: "var(--color-text-tertiary)" };
  return <div className="mt-0.5 text-[11px] font-medium" style={{ color: v.c }}>{v.w}</div>;
}

function ActHead({ n, kicker, title, sub }: { n: number; kicker: string; title: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-[var(--color-text-tertiary)]">
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-text-primary)] text-[11px] text-[var(--color-bg-page)]">{n}</span>
        {kicker.toUpperCase()}
      </div>
      <h2 className="mt-3 text-[clamp(26px,6vw,36px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-2 max-w-[58ch] text-[16px] leading-[1.5] text-pretty text-[var(--color-text-secondary)]">{sub}</p>
    </div>
  );
}

function Descend({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="group mt-8 flex items-center justify-between gap-3 rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] px-5 py-4 transition-colors hover:border-[var(--color-text-tertiary)]">
      <span className="text-[16px] font-semibold text-[var(--color-text-primary)]">{label}</span>
      <span className="text-[var(--color-text-tertiary)] transition-transform group-hover:translate-y-0.5">↓</span>
    </a>
  );
}
