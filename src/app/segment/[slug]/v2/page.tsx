import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getSlugByProductId } from "@/lib/appSlugs";
import { hasInsight } from "@/lib/readyApps";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getLocale } from "@/lib/i18n.server";
import { appCardsFor, categoryCards, ideaContentEn, type RegenCard } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getNicheOpportunities } from "@/lib/nicheOpportunities";
import { listIdeas } from "@/lib/ideas";
import { getAccess } from "@/lib/access";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import EnergyUnlockButton from "@/components/EnergyUnlockButton";

export const dynamic = "force-dynamic";

// Experiment v2 — the category as a premium market-research report: governing
// thought, three findings, opportunities, competitors. Typography-led, restrained
// accent. Not indexed (canonical lives at /segment/<slug>).
export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: false } };
}

type Quote = { app: string; rating: number; text: string };
function tone(c: RegenCard): "up" | "down" | "mixed" {
  const p = !!c.plus?.trim();
  const m = !!c.minus?.trim();
  return p && m ? "mixed" : m ? "down" : "up";
}
const TONE_DOT: Record<string, string> = { up: "#4ade80", down: "#ff8585", mixed: "#f5b301" };

function Sec({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{children}</div>;
}

export default async function SegmentV2({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const ru = locale !== "en";

  if (!isActiveCategory(slug)) notFound();
  const cat = getCategoryBySlug(slug, locale);
  if (!cat) notFound();
  const summary = getSegmentSummary(slug);
  if (!summary) notFound();
  const thesis = getNicheThesis(slug);

  const access = await getAccess();
  const { loggedIn, balance } = access;
  const catLocked = !access.has("category", slug);

  const readyCount = cat.apps.filter((a) => hasInsight(a.productId)).length;
  const ideas = listIdeas().filter((i) => i.category === slug);
  const catProduct = (categoryCards(slug, locale)?.product ?? []).slice().sort((a, b) => b.count - a.count);
  const totalObs = catProduct.reduce((s, c) => s + c.count, 0);

  const evOf = (c: RegenCard): Quote[] =>
    (c.evidence ?? []).slice(0, 5).map((e) => ({ app: e.app ?? "", rating: e.rating, text: ru ? e.quoteRu ?? e.quote : e.quote }));

  // Route breakdown cards under the thesis pillars (title weighted 2×).
  const findingPillars = thesis
    ? thesis.pillars.map((p, pi) => ({
        title: p.title,
        dek: p.dek,
        findings: catProduct
          .filter((c) => {
            const title = (c.title ?? "").toLowerCase();
            const body = `${c.plus ?? ""} ${c.minus ?? ""}`.toLowerCase();
            const score = (kws: string[]) => kws.reduce((s, kw) => s + (title.includes(kw) ? 2 : 0) + (body.includes(kw) ? 1 : 0), 0);
            let best = 0;
            let bs = -1;
            thesis.pillars.forEach((q, qi) => {
              const sc = score(q.match);
              if (sc > bs) {
                bs = sc;
                best = qi;
              }
            });
            return best === pi;
          })
          .slice(0, 6)
          .map((c) => ({ title: c.title, plus: c.plus, minus: c.minus, count: c.count, tone: tone(c), quotes: evOf(c) })),
      }))
    : [];

  const regenList = ru ? getNicheOpportunities(slug) : [];
  const opps = ideas.map((idea) => {
    const en = ideaContentEn(idea.slug, locale);
    return {
      slug: idea.slug,
      title: en?.title || idea.title,
      oneLiner: en?.oneLiner || idea.oneLiner,
      gap: en?.gap || idea.gap,
      pitch: en?.pitch || idea.idea.pitch,
      features: en?.features?.length ? en.features : idea.idea.features,
      monetization: en?.monetization || idea.idea.monetization,
      gapApps: [...new Set(idea.mechanisms.flatMap((m) => m.apps))].slice(0, 8),
      quotes: idea.reviewGrid.slice(0, 6).map((q) => ({ app: q.app, rating: q.rating, text: q.quote })),
      observations: idea.stats.observations,
      unlocked: !catLocked || access.has("idea", idea.slug),
      // Regenerated, sharper thesis (RU only) joined by original idea title.
      regen: regenList.find((o) => o.src === idea.title) ?? null,
    };
  });

  const apps = cat.apps
    .filter((a) => hasInsight(a.productId))
    .map((a) => {
      const pid = a.productId as string;
      const cards = appCardsFor(pid, locale)?.product ?? [];
      const flaw = cards.filter((c) => c.minus?.trim()).sort((x, y) => y.count - x.count)[0];
      const ins = getProductInsights(pid);
      const hist = ins?.ratingBreakdown ?? {};
      const t = [1, 2, 3, 4, 5].reduce((s, n) => s + (hist[String(n)] ?? 0), 0);
      const avg = t > 0 ? [1, 2, 3, 4, 5].reduce((s, n) => s + n * (hist[String(n)] ?? 0), 0) / t : null;
      return {
        name: a.name,
        icon: a.icon,
        slug: getSlugByProductId(pid),
        avg,
        hook: flaw?.minus?.trim() || flaw?.title || "",
        total: cards.length,
        unlocked: !catLocked || (getSlugByProductId(pid) ? access.has("app", getSlugByProductId(pid) as string) : false),
      };
    })
    .filter((a) => a.total > 0);

  const nf = (n: number) => n.toLocaleString(ru ? "ru-RU" : "en-US");
  const stats = [
    { n: readyCount, l: ru ? "приложений" : "apps" },
    { n: nf(summary.reviewsScanned), l: ru ? "отзывов" : "reviews" },
    { n: nf(totalObs), l: ru ? "наблюдений" : "observations" },
    { n: opps.length, l: ru ? "возможностей" : "opportunities" },
  ];

  return (
    <main className="mx-auto w-full max-w-[760px] px-5 py-12 sm:py-16">
      <Link href="/" className="text-footnote text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]">
        ← {ru ? "Все ниши" : "All niches"}
      </Link>

      {/* HERO */}
      <header className="mt-10">
        <Sec>{ru ? "Исследование ниши · 2026" : "Niche research · 2026"}</Sec>
        <h1 className="mt-3 text-[44px] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[64px]">{cat.name}</h1>
        {thesis ? (
          <p className="mt-6 max-w-[60ch] text-[20px] font-medium leading-[1.45] text-[var(--color-text-primary)] sm:text-[24px]">{thesis.governing}</p>
        ) : (
          summary.lead && <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.55] text-[var(--color-text-secondary)]">{summary.lead}</p>
        )}
      </header>

      {/* STATS */}
      <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] sm:grid-cols-4">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1 bg-[var(--color-bg-page)] px-5 py-5">
            <span className="text-[26px] font-bold leading-none tabular-nums tracking-tight text-[var(--color-text-primary)]">{s.n}</span>
            <span className="text-caption text-[var(--color-text-tertiary)]">{s.l}</span>
          </div>
        ))}
      </div>

      {/* THREE FINDINGS */}
      {findingPillars.length > 0 && (
        <section className="mt-20">
          <Sec>{ru ? "Главное · три вывода" : "Key findings · three"}</Sec>
          <div className="mt-8 flex flex-col">
            {findingPillars.map((p, i) => (
              <div key={i} className="border-t border-[var(--color-border-subtle)] py-10 first:border-t-0 first:pt-0">
                <div className="flex gap-5 sm:gap-7">
                  <span className="shrink-0 text-[40px] font-bold leading-none tabular-nums text-[color-mix(in_srgb,var(--color-text-brand)_70%,transparent)] sm:text-[52px]">{`0${i + 1}`}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[24px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{p.title}</h3>
                    <p className="mt-3 text-[16px] leading-[1.6] text-[var(--color-text-secondary)]">{p.dek}</p>
                    <div className="mt-6 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                      {p.findings.map((f, k) => (
                        <details key={k} className="group/f">
                          <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                            <span className="size-2 shrink-0 rounded-full" style={{ background: TONE_DOT[f.tone] }} />
                            <span className="min-w-0 flex-1 text-footnote font-medium leading-snug text-[var(--color-text-primary)]">{f.title}</span>
                            <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open/f:rotate-180">
                              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </summary>
                          <div className="pb-4 pl-5">
                            {f.plus && <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]"><span className="font-semibold text-[#4ade80]">+ </span>{f.plus}</p>}
                            {f.minus && <p className="mt-1 text-footnote leading-relaxed text-[var(--color-text-secondary)]"><span className="font-semibold text-[#ff8585]">− </span>{f.minus}</p>}
                            <div className="mt-3 flex flex-col gap-2.5">
                              {f.quotes.slice(0, 4).map((q, j) => (
                                <figure key={j} className="border-l-2 border-[var(--color-border-strong)] pl-3">
                                  <p className="text-caption italic leading-relaxed text-[var(--color-text-tertiary)]">“{q.text}”</p>
                                  <figcaption className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{q.app} · <span className="text-[#f5b301]">{"★".repeat(q.rating)}</span></figcaption>
                                </figure>
                              ))}
                            </div>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* OPPORTUNITIES */}
      {opps.length > 0 && (
        <section className="mt-20">
          <Sec>{ru ? `Что построить · ${opps.length} возможностей` : `What to build · ${opps.length} opportunities`}</Sec>
          <div className="mt-8 flex flex-col gap-4">
            {opps.map((op, i) => (
              <article key={i} className="rounded-[20px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6 sm:p-7">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-brand)]">{ru ? `Возможность ${i + 1}` : `Opportunity ${i + 1}`}</span>
                  <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{ru ? `спрос ${op.observations}` : `demand ${op.observations}`}</span>
                </div>
                {op.unlocked ? (
                  op.regen ? (
                    <>
                      <h3 className="mt-2.5 text-[24px] font-bold leading-[1.14] tracking-[-0.015em] text-[var(--color-text-primary)] sm:text-[28px]">{op.regen.title}</h3>
                      <p className="mt-2.5 text-[16px] font-medium leading-[1.5] text-[var(--color-text-secondary)]">{op.regen.tagline}</p>
                      <p className="mt-2.5 text-footnote leading-relaxed text-[var(--color-text-tertiary)]">
                        <span className="font-semibold text-[var(--color-text-secondary)]">Для кого: </span>{op.regen.forWhom}
                      </p>

                      {/* The wedge — the centerpiece insight */}
                      <div className="mt-5 rounded-[14px] border-l-[3px] border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] py-4 pl-4 pr-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-brand)]">Клин</div>
                        <p className="mt-1.5 text-[15px] leading-[1.62] text-[var(--color-text-primary)]">{op.regen.wedge}</p>
                      </div>

                      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <Field label="Что строить" value={op.regen.build} />
                        <Field label="Монетизация" value={op.regen.monetization} />
                      </dl>

                      <div className="mt-5">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">Фичи</div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {op.regen.features.map((f, j) => (
                            <span key={j} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] py-1.5 pl-2.5 pr-3 text-caption text-[var(--color-text-secondary)]">
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-brand)]">
                                <path d="M8 1.5a4.5 4.5 0 0 0-2.7 8.1c.4.3.6.7.7 1.1l.1.8h3.8l.1-.8c.1-.4.3-.8.7-1.1A4.5 4.5 0 0 0 8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                <path d="M6.3 14h3.4M6.8 12.5h2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                              </svg>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>

                      {op.gapApps.length > 0 && (
                        <p className="mt-5 text-footnote leading-relaxed text-[var(--color-text-tertiary)]">
                          <span className="font-semibold text-[var(--color-text-secondary)]">Где видно: </span>{op.gapApps.join(" · ")}
                        </p>
                      )}

                      {op.quotes.length > 0 && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                          {op.quotes.slice(0, 3).map((q, j) => (
                            <figure key={j} className="border-l-2 border-[var(--color-border-strong)] pl-3">
                              <p className="text-caption italic leading-relaxed text-[var(--color-text-tertiary)]">“{q.text}”</p>
                              <figcaption className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{q.app} · <span className="text-[#f5b301]">{"★".repeat(q.rating)}</span></figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <h3 className="mt-2.5 text-[22px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[25px]">{op.title}</h3>
                      <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{op.oneLiner}</p>
                      <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                        <Field label={ru ? "Разрыв" : "The gap"} value={op.gap} />
                        <Field label={ru ? "Что строить" : "What to build"} value={op.pitch} />
                        {op.gapApps.length > 0 && <Field label={ru ? "Где видно" : "Where"} value={op.gapApps.join(" · ")} />}
                        {op.monetization && <Field label={ru ? "Монетизация" : "Monetize"} value={op.monetization} />}
                      </dl>
                      {op.quotes.length > 0 && (
                        <div className="mt-5 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-4">
                          {op.quotes.slice(0, 3).map((q, j) => (
                            <figure key={j} className="border-l-2 border-[var(--color-border-strong)] pl-3">
                              <p className="text-caption italic leading-relaxed text-[var(--color-text-tertiary)]">“{q.text}”</p>
                              <figcaption className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{q.app} · <span className="text-[#f5b301]">{"★".repeat(q.rating)}</span></figcaption>
                            </figure>
                          ))}
                        </div>
                      )}
                    </>
                  )
                ) : (
                  <div className="mt-3 flex flex-col gap-3">
                    {op.quotes[0] && (
                      <figure className="border-l-2 border-[color-mix(in_srgb,var(--color-text-brand)_50%,transparent)] pl-3">
                        <p className="text-footnote italic leading-relaxed text-[var(--color-text-secondary)]">“{op.quotes[0].text}”</p>
                        <figcaption className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">{op.quotes[0].app} · <span className="text-[#f5b301]">{"★".repeat(op.quotes[0].rating)}</span></figcaption>
                      </figure>
                    )}
                    <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Внутри — клин ниши, что строить, фичи, монетизация и доказательства из отзывов." : "Inside — the market wedge, what to build, features, monetization and evidence."}</p>
                    <EnergyUnlockButton type="idea" slug={op.slug} cost={UNLOCK_COST.idea} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть возможность" : "Unlock opportunity"} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* COMPETITORS */}
      {apps.length > 0 && (
        <section className="mt-20">
          <Sec>{ru ? `Конкуренты · ${apps.length} приложений` : `Competitors · ${apps.length} apps`}</Sec>
          <div className="mt-8 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
            {apps.map((a, i) => (
              <div key={i} className="flex items-center gap-3.5 py-3.5">
                {a.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-11 shrink-0 rounded-[12px] object-cover" />
                ) : (
                  <div className="size-11 shrink-0 rounded-[12px] bg-[var(--color-bg-muted)]" />
                )}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2 text-callout font-semibold text-[var(--color-text-primary)]">
                    <span className="truncate">{a.name}</span>
                    {a.avg != null && <span className="shrink-0 text-caption tabular-nums text-[#f5b301]">★ {a.avg.toFixed(1)}</span>}
                  </span>
                  <span className="truncate text-caption text-[var(--color-text-tertiary)]">{a.hook || `${a.total} ${ru ? "наблюдений" : "observations"}`}</span>
                </div>
                {a.unlocked ? (
                  a.slug && (
                    <Link href={`/${a.slug}`} className="shrink-0 text-footnote font-semibold text-[var(--color-text-brand)] hover:opacity-80">
                      {ru ? "Разбор →" : "Open →"}
                    </Link>
                  )
                ) : (
                  <EnergyUnlockButton type="app" slug={a.slug as string} cost={UNLOCK_COST.app} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть" : "Unlock"} />
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{value}</dd>
    </div>
  );
}
