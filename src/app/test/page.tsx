import type { Metadata } from "next";
import type { ReactNode } from "react";
import rating from "@/data/peoplesRating/astrology.json";
import thesisAll from "@/data/niche-thesis.json";
import cardsAll from "@/data/segment-cards.json";
import ideasAll from "@/data/ideas.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Разбор ниши — астрология (прототип)",
  robots: { index: false, follow: false },
};

// PROTOTYPE (/test): the full niche dossier as a dense, structured document.
// Everything we have, shown under native <details> disclosures, no decoration.
// All data real. Money (25/25 of the biggest apps free) sampled 2026-06-28.

const SLUG = "astrology";
const NF = (n: number) => n.toLocaleString("ru-RU");
const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};
const cut = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

const AUTH: Record<string, { w: string; c: string }> = {
  "Подлинный": { w: "честная", c: "#30d158" },
  "Сомнительный": { w: "сомнительна", c: "#e0b400" },
  "Накручен": { w: "накручена", c: "#ff6961" },
};

type RApp = (typeof rating.apps)[number];
type Finding = { title: string; plus?: string; minus?: string; count?: number; apps?: string[]; evidence?: { app: string; rating: number; quote: string }[] };
type Pillar = { title: string; dek: string };
type Idea = { slug: string; category: string; title: string; oneLiner: string; gap?: string; idea?: { pitch?: string; features?: string[]; antiFeatures?: string[]; monetization?: string }; reviewGrid?: { quote: string; rating: number; app: string }[] };

export default function TestDossier() {
  const r = rating as typeof rating;
  const apps = [...(r.apps as RApp[])].sort((a, b) => (b.realScore || 0) - (a.realScore || 0));
  const thesis = (thesisAll as unknown as Record<string, { governing: string; competitorRead: string; pillars: Pillar[] }>)[SLUG];
  const findings = (cardsAll as unknown as Record<string, { product?: Finding[] }>)[SLUG]?.product ?? [];
  const ideas = (ideasAll as unknown as Idea[]).filter((x) => x.category === SLUG);

  const totalRatings = apps.reduce((s, a) => s + (a.ratings || 0), 0);
  const broken = apps.filter((a) => a.authenticity === "Накручен" || a.authenticity === "Сомнительный").length;
  const great = apps.filter((a) => (a.realScore || 0) > 80).length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pb-24 pt-6 text-[var(--color-text-primary)]">
      {/* plain section nav */}
      <nav className="sticky top-0 z-30 -mx-4 mb-8 flex gap-4 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_92%,transparent)] px-4 py-3 text-[13px] backdrop-blur-md">
        {[["#market", "Рынок"], ["#rating", "Рейтинг"], ["#gaps", "Дыры"], ["#ideas", "Идеи"]].map(([h, l]) => (
          <a key={h} href={h} className="text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-primary)]">{l}</a>
        ))}
      </nav>

      <header>
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Разбор ниши</div>
        <h1 className="mt-2 text-[40px] font-black leading-[1.0] tracking-[-0.03em]">{r.name}</h1>
        <p className="mt-3 text-[16px] leading-[1.5] text-[var(--color-text-secondary)]">
          {NF(r.count)} приложений, {NF(r.totalReviews)} отзывов прочитано. Что в нише происходит и что в ней строить.
        </p>
      </header>

      {/* MARKET — plain facts */}
      <Section id="market" title="Рынок">
        <dl className="flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
          <Fact k="Спрос" v={`${NF(totalRatings)} оценок на ${r.count} приложений (крупнейшее — Co-Star, ${NF(205320)})`} />
          <Fact k="Объём" v={`${NF(r.totalReviews)} отзывов прочитано и размечено`} />
          <Fact k="Деньги" v="25 из 25 крупнейших приложений бесплатны. Рынок монетизируется подпиской, платят за удержание" />
          <Fact k="Доверие" v={`${broken} из 100 приложений со звездой накрученной или сомнительной. Реально хороших (балл выше 80) — всего ${great}`} />
        </dl>
        <p className="mt-4 text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">
          Большой платящий рынок со сломанным доверием. Деньги в подписке, но почти никто не делает по-настоящему хороший продукт. Это и есть щель.
        </p>
      </Section>

      {/* THESIS */}
      <Section id="thesis" title="Тезис">
        <p className="text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">{thesis.governing}</p>
        <Disclosure summary="Как ошибаются конкуренты">
          <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{thesis.competitorRead}</p>
        </Disclosure>
        <div className="mt-4 flex flex-col gap-2">
          {thesis.pillars.map((p, i) => (
            <Disclosure key={i} summary={p.title}>
              <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{p.dek}</p>
            </Disclosure>
          ))}
        </div>
      </Section>

      {/* RATING — all 100 apps, collapsible */}
      <Section id="rating" title={`Рейтинг · ${r.count} приложений`}>
        <p className="mb-4 text-[14px] leading-[1.5] text-[var(--color-text-tertiary)]">
          Балл — по реальному качеству продукта из отзывов, не по витринной звезде. Раскрой приложение, чтобы увидеть разбор.
        </p>
        <div className="flex flex-col">
          {apps.map((a, i) => {
            const au = AUTH[a.authenticity || ""] || { w: "—", c: "var(--color-text-tertiary)" };
            return (
              <Disclosure
                key={a.id}
                summary={
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="w-6 shrink-0 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{a.title}</span>
                    <span className="shrink-0 text-[11px]" style={{ color: au.c }}>{au.w}</span>
                    <span className="w-12 shrink-0 text-right text-[15px] font-bold tabular-nums">{a.realScore}<span className="text-[10px] font-normal text-[var(--color-text-tertiary)]">/100</span></span>
                  </span>
                }
              >
                <div className="flex flex-col gap-2.5 text-[14px] leading-[1.55]">
                  <div className="text-[12px] text-[var(--color-text-tertiary)]">в сторе {a.storeAvg?.toFixed(1)}★ · {NF(a.ratings || 0)} оценок · {NF(a.nrev || 0)} отзывов прочитано</div>
                  {a.verdict && <p className="text-[var(--color-text-secondary)]">{a.verdict}</p>}
                  <Field k="Сильное" v={a.loved} />
                  <Field k="Слабое" v={a.weak} />
                  <Field k="Кому" v={a.whoFor} />
                  <Field k="Честность" v={a.authNote} />
                </div>
              </Disclosure>
            );
          })}
        </div>
      </Section>

      {/* GAPS — all findings with real quotes */}
      <Section id="gaps" title={`Дыры ниши · ${findings.length}`}>
        <p className="mb-4 text-[14px] leading-[1.5] text-[var(--color-text-tertiary)]">
          Структурные проблемы, видные во всех приложениях сразу. Каждая — из реальных отзывов.
        </p>
        <div className="flex flex-col">
          {findings.map((f, i) => (
            <Disclosure
              key={i}
              summary={
                <span className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="shrink-0 text-[12px] font-bold tabular-nums text-[var(--color-text-tertiary)]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[15px] font-medium leading-[1.4]">{f.title}</span>
                </span>
              }
            >
              <div className="flex flex-col gap-3 text-[14px] leading-[1.55]">
                {(f.minus || f.plus) && <p className="text-[var(--color-text-secondary)]">{f.minus || f.plus}</p>}
                {(f.evidence || []).slice(0, 4).map((e, j) => (
                  <figure key={j} className="border-l-2 border-[var(--color-border-subtle)] pl-3">
                    <blockquote className="italic text-[var(--color-text-secondary)]">“{cut(e.quote, 280)}”</blockquote>
                    <figcaption className="mt-0.5 text-[12px] text-[var(--color-text-tertiary)]">{e.app} · {e.rating}★</figcaption>
                  </figure>
                ))}
                {!!f.count && <div className="text-[12px] text-[var(--color-text-tertiary)]">{f.count} похожих отзывов{f.apps?.length ? ` · ${f.apps.length} приложений` : ""}</div>}
              </div>
            </Disclosure>
          ))}
        </div>
      </Section>

      {/* IDEAS — all, full detail */}
      <Section id="ideas" title={`Идеи · ${ideas.length}`}>
        <p className="mb-4 text-[14px] leading-[1.5] text-[var(--color-text-tertiary)]">
          Каждая — реальный бизнес, под который прочитаны все отзывы ниши. На проде сидят за платной стеной, здесь раскрыты целиком.
        </p>
        <div className="flex flex-col">
          {ideas.map((x, i) => (
            <Disclosure
              key={x.slug}
              defaultOpen={i === 0}
              summary={
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-semibold">{cleanTitle(x.title)}</span>
                  <span className="truncate text-[13px] text-[var(--color-text-tertiary)]">{x.oneLiner}</span>
                </span>
              }
            >
              <div className="flex flex-col gap-3.5 text-[14px] leading-[1.55]">
                {x.gap && <Block k="Дыра" v={x.gap} />}
                {x.idea?.pitch && <Block k="Что это" v={x.idea.pitch} />}
                {!!x.idea?.features?.length && (
                  <div>
                    <BlockK k="Как устроено" />
                    <ul className="mt-1 flex flex-col gap-1">{x.idea.features.map((f, j) => <li key={j} className="flex gap-2 text-[var(--color-text-secondary)]"><span className="text-[var(--color-text-tertiary)]">·</span>{f}</li>)}</ul>
                  </div>
                )}
                {!!x.idea?.antiFeatures?.length && (
                  <div>
                    <BlockK k="Чего не делаем" />
                    <ul className="mt-1 flex flex-col gap-1">{x.idea.antiFeatures.map((f, j) => <li key={j} className="flex gap-2 text-[var(--color-text-secondary)]"><span className="text-[var(--color-text-tertiary)]">×</span>{f}</li>)}</ul>
                  </div>
                )}
                {x.idea?.monetization && <Block k="Деньги" v={x.idea.monetization} />}
                {!!x.reviewGrid?.length && (
                  <div className="rounded-[12px] bg-[var(--color-bg-muted)] p-3.5">
                    <BlockK k="Пруф из отзывов" />
                    <div className="mt-2 flex flex-col gap-2.5">
                      {x.reviewGrid.slice(0, 7).map((q, j) => (
                        <figure key={j}>
                          <blockquote className="text-[13px] italic leading-[1.5] text-[var(--color-text-secondary)]">“{cut(q.quote, 200)}”</blockquote>
                          <figcaption className="mt-0.5 text-[11.5px] text-[var(--color-text-tertiary)]">{q.app} · {q.rating}★</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Disclosure>
          ))}
        </div>
      </Section>

      <p className="mt-16 text-center text-[12px] text-[var(--color-text-tertiary)]">Прототип · /test · данные реальные (астрология)</p>
    </main>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 scroll-mt-16">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)]">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-4 py-3">
      <dt className="w-20 shrink-0 text-[13px] font-medium text-[var(--color-text-tertiary)]">{k}</dt>
      <dd className="text-[15px] leading-[1.5] text-[var(--color-text-secondary)]">{v}</dd>
    </div>
  );
}

function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group border-b border-[var(--color-border-subtle)]">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
        {typeof summary === "string" ? <span className="flex-1 text-[15px] font-medium">{summary}</span> : summary}
        <span className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="pb-4 pl-9 pr-1">{children}</div>
    </details>
  );
}

function Field({ k, v }: { k: string; v?: string | null }) {
  if (!v) return null;
  return (
    <div>
      <span className="text-[12px] font-semibold text-[var(--color-text-tertiary)]">{k}. </span>
      <span className="text-[var(--color-text-secondary)]">{v}</span>
    </div>
  );
}

function BlockK({ k }: { k: string }) {
  return <div className="text-[12px] font-semibold tracking-[0.03em] text-[var(--color-text-tertiary)]">{k.toUpperCase()}</div>;
}

function Block({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <BlockK k={k} />
      <p className="mt-1 text-[var(--color-text-secondary)]">{v}</p>
    </div>
  );
}
