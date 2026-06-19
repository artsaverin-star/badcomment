"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import EnergyUnlockButton from "@/components/EnergyUnlockButton";
import CardCarousel, { type Slide } from "@/components/CardCarousel";

export type ExpQuote = { app: string; rating: number; text: string };
export type ExpFinding = { title: string; plus?: string; minus?: string; count: number; tone: "up" | "down" | "mixed"; quotes: ExpQuote[] };
export type ExpPillar = { num: string; title: string; dek: string; findings: ExpFinding[] };
export type ExpRegen = { title: string; tagline: string; forWhom: string; wedge: string; build: string; features: string[]; monetization: string };
export type ExpOpp = {
  slug: string;
  locked: boolean;
  demand: number;
  regen: ExpRegen | null;
  title: string;
  oneLiner: string;
  gap: string;
  pitch: string;
  features: string[];
  monetization: string;
  gapApps: string[];
  quotes: ExpQuote[];
};
export type ExpApp = {
  slug: string | null;
  name: string;
  icon: string | null;
  locked: boolean;
  avg: number | null;
  tag: { label: string; color: string } | null;
  hook: string;
  description?: string;
  total: number;
  slides: Slide[];
};
export type ExpFlaw = { label: string; color: string; n: number };

const TONE_DOT: Record<string, string> = { up: "#4ade80", down: "#ff8585", mixed: "#f5b301" };

type Active = { kind: "overview" } | { kind: "idea"; i: number } | { kind: "app"; i: number } | null;

export default function SegmentExplorer({
  locale,
  pillars,
  opps,
  apps,
  competitorRead,
  flawDist,
  loggedIn,
  balance,
}: {
  locale: Locale;
  pillars: ExpPillar[];
  opps: ExpOpp[];
  apps: ExpApp[];
  competitorRead?: string;
  flawDist: ExpFlaw[];
  loggedIn: boolean;
  balance: number;
}) {
  const ru = locale !== "en";
  const [active, setActive] = useState<Active>(null);

  // Lock body scroll + close on Esc while a modal is open.
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  const Quotes = ({ list, n = 4 }: { list: ExpQuote[]; n?: number }) => (
    <div className="flex flex-col gap-2.5">
      {list.slice(0, n).map((q, j) => (
        <figure key={j} className="border-l-2 border-[var(--color-border-strong)] pl-3">
          <p className="text-caption italic leading-relaxed text-[var(--color-text-tertiary)]">“{q.text}”</p>
          <figcaption className="mt-0.5 text-[11px] text-[var(--color-text-tertiary)]">
            {q.app} · <span className="text-[#f5b301]">{"★".repeat(q.rating)}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );

  return (
    <>
      {/* ── OVERVIEW CARD → three findings modal ── */}
      {pillars.length > 0 && (
        <button
          type="button"
          onClick={() => setActive({ kind: "overview" })}
          className="group relative mt-12 block w-full overflow-hidden rounded-[24px] border border-[color-mix(in_srgb,var(--color-text-brand)_24%,var(--color-border-subtle))] bg-[var(--color-surface-card)] p-6 text-left shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)] transition-colors hover:border-[var(--color-text-brand)] sm:p-7"
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.2]" style={{ background: "radial-gradient(120% 80% at 50% 0%, var(--color-text-brand) 0%, transparent 70%)" }} />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-brand)]">{ru ? "Обзор ниши · бесплатно" : "Niche overview · free"}</span>
              <span className="shrink-0 text-caption text-[var(--color-text-tertiary)] transition-transform group-hover:translate-x-0.5">{ru ? "Открыть →" : "Open →"}</span>
            </div>
            <h2 className="mt-2 text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">{ru ? "Главное · три вывода" : "Key findings · three"}</h2>
            <ol className="mt-4 flex flex-col gap-2.5">
              {pillars.map((p, i) => (
                <li key={i} className="flex items-baseline gap-3">
                  <span className="shrink-0 text-footnote font-bold tabular-nums text-[color-mix(in_srgb,var(--color-text-brand)_75%,transparent)]">{p.num}</span>
                  <span className="text-footnote leading-snug text-[var(--color-text-secondary)]">{p.title}</span>
                </li>
              ))}
            </ol>
          </div>
        </button>
      )}

      {/* ── IDEA MINI CARDS → idea modal ── */}
      {opps.length > 0 && (
        <section className="mt-12">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? `Что построить · ${opps.length} возможностей` : `What to build · ${opps.length} opportunities`}</div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {opps.map((op, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive({ kind: "idea", i })}
                className="group flex h-full flex-col rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-5 text-left transition-colors hover:border-[var(--color-text-brand)]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-brand)]">{ru ? `Возможность ${i + 1}` : `Opportunity ${i + 1}`}</span>
                  {op.locked && (
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)]">
                      <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  )}
                </div>
                <h3 className="mt-2 text-[18px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--color-text-primary)]">
                  {op.locked ? (ru ? "Готовая возможность под спрос" : "A ready opportunity") : op.regen?.title || op.title}
                </h3>
                <p className="mt-1.5 line-clamp-2 text-footnote leading-snug text-[var(--color-text-secondary)]">
                  {op.locked ? (op.quotes[0] ? `«${op.quotes[0].text}»` : "") : op.regen?.tagline || op.oneLiner}
                </p>
                <div className="mt-auto pt-4 text-caption tabular-nums text-[var(--color-text-tertiary)]">{ru ? `спрос ${op.demand} наблюдений` : `demand ${op.demand}`}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── COMPETITORS: synthesis + distribution + app mini cards → app modal ── */}
      {apps.length > 0 && (
        <section className="mt-12">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? `Конкуренты · ${apps.length} приложений` : `Competitors · ${apps.length} apps`}</div>
          {ru && competitorRead && <p className="mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-[var(--color-text-primary)]">{competitorRead}</p>}
          {flawDist.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {flawDist.map((d) => (
                <span key={d.label} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] py-1 pl-2.5 pr-3 text-caption text-[var(--color-text-secondary)]">
                  <span className="size-2 rounded-full" style={{ background: d.color }} />
                  {d.label}
                  <span className="font-semibold tabular-nums text-[var(--color-text-primary)]">{d.n}</span>
                </span>
              ))}
            </div>
          )}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {apps.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive({ kind: "app", i })}
                className="group flex items-center gap-3.5 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-4 text-left transition-colors hover:border-[var(--color-text-brand)]"
              >
                {a.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[13px] object-cover" />
                ) : (
                  <div className="size-12 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-callout font-semibold text-[var(--color-text-primary)]">{a.name}</span>
                    {a.avg != null && <span className="shrink-0 text-caption tabular-nums text-[#f5b301]">★ {a.avg.toFixed(1)}</span>}
                  </span>
                  {a.tag ? (
                    <span className="inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${a.tag.color} 16%, transparent)`, color: a.tag.color }}>
                      {a.tag.label}
                    </span>
                  ) : (
                    <span className="truncate text-caption text-[var(--color-text-tertiary)]">{a.hook}</span>
                  )}
                </div>
                {a.locked && (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 self-start text-[var(--color-text-tertiary)]">
                    <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── MODAL ── */}
      {active && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setActive(null)} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-t-[24px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.6)] sm:rounded-[24px]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] px-5 py-3.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-brand)]">
                {active.kind === "overview" ? (ru ? "Главное · три вывода" : "Key findings") : active.kind === "idea" ? (ru ? `Возможность ${active.i + 1}` : `Opportunity ${active.i + 1}`) : ru ? "Разбор приложения" : "App breakdown"}
              </span>
              <button type="button" onClick={() => setActive(null)} className="flex size-8 items-center justify-center rounded-full bg-[var(--color-bg-muted)] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-6 sm:px-7">
              {/* OVERVIEW — three findings */}
              {active.kind === "overview" && (
                <div className="flex flex-col">
                  {pillars.map((p, i) => (
                    <div key={i} className="border-t border-[var(--color-border-subtle)] py-7 first:border-t-0 first:pt-0">
                      <div className="flex gap-4">
                        <span className="shrink-0 text-[34px] font-bold leading-none tabular-nums text-[color-mix(in_srgb,var(--color-text-brand)_70%,transparent)]">{p.num}</span>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-[21px] font-bold leading-[1.18] tracking-[-0.01em] text-[var(--color-text-primary)]">{p.title}</h3>
                          <p className="mt-2.5 text-footnote leading-[1.6] text-[var(--color-text-secondary)]">{p.dek}</p>
                          <div className="mt-5 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
                            {p.findings.map((f, k) => (
                              <details key={k} className="group/f">
                                <summary className="flex cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                                  <span className="size-2 shrink-0 rounded-full" style={{ background: TONE_DOT[f.tone] }} />
                                  <span className="min-w-0 flex-1 text-footnote font-medium leading-snug text-[var(--color-text-primary)]">{f.title}</span>
                                  <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">{f.count}</span>
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </summary>
                                <div className="pb-4 pl-5">
                                  {f.plus && <p className="text-footnote leading-relaxed text-[var(--color-text-secondary)]"><span className="font-semibold text-[#4ade80]">+ </span>{f.plus}</p>}
                                  {f.minus && <p className="mt-1 text-footnote leading-relaxed text-[var(--color-text-secondary)]"><span className="font-semibold text-[#ff8585]">− </span>{f.minus}</p>}
                                  {f.quotes.length > 0 && <div className="mt-3"><Quotes list={f.quotes} /></div>}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* IDEA */}
              {active.kind === "idea" && (() => {
                const op = opps[active.i];
                if (op.locked) {
                  return (
                    <div className="flex flex-col gap-4">
                      <h2 className="text-[24px] font-bold leading-[1.16] tracking-[-0.01em] text-[var(--color-text-primary)]">{ru ? "Готовая возможность под подтверждённый спрос" : "A ready opportunity for proven demand"}</h2>
                      {op.quotes[0] && (
                        <figure className="border-l-2 border-[color-mix(in_srgb,var(--color-text-brand)_50%,transparent)] pl-3">
                          <p className="text-footnote italic leading-relaxed text-[var(--color-text-secondary)]">“{op.quotes[0].text}”</p>
                          <figcaption className="mt-1 text-caption text-[var(--color-text-tertiary)]">{op.quotes[0].app} · <span className="text-[#f5b301]">{"★".repeat(op.quotes[0].rating)}</span></figcaption>
                        </figure>
                      )}
                      <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? "Внутри — в чём разрыв и почему это шанс, что строить, фичи, монетизация и доказательства из отзывов." : "Inside — the gap and why it's an opening, what to build, features, monetization and evidence."}</p>
                      <EnergyUnlockButton type="idea" slug={op.slug} cost={UNLOCK_COST.idea} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть возможность" : "Unlock opportunity"} />
                    </div>
                  );
                }
                const r = op.regen;
                return (
                  <div className="flex flex-col">
                    <h2 className="text-[25px] font-bold leading-[1.14] tracking-[-0.015em] text-[var(--color-text-primary)] sm:text-[28px]">{r?.title || op.title}</h2>
                    <p className="mt-2.5 text-[16px] font-medium leading-[1.5] text-[var(--color-text-secondary)]">{r?.tagline || op.oneLiner}</p>
                    {r && <p className="mt-2.5 text-footnote leading-relaxed text-[var(--color-text-tertiary)]"><span className="font-semibold text-[var(--color-text-secondary)]">Для кого: </span>{r.forWhom}</p>}

                    <div className="mt-5 rounded-[14px] border-l-[3px] border-[var(--color-text-brand)] bg-[color-mix(in_srgb,var(--color-text-brand)_8%,transparent)] py-4 pl-4 pr-4">
                      <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-brand)]">{ru ? "Почему это шанс" : "Why it's an opening"}</div>
                      <p className="mt-1.5 text-[15px] leading-[1.62] text-[var(--color-text-primary)]">{r?.wedge || op.gap}</p>
                    </div>

                    <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</dt>
                        <dd className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{r?.build || op.pitch}</dd>
                      </div>
                      {(r?.monetization || op.monetization) && (
                        <div className="flex flex-col gap-1">
                          <dt className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Монетизация" : "Monetize"}</dt>
                          <dd className="text-footnote leading-relaxed text-[var(--color-text-secondary)]">{r?.monetization || op.monetization}</dd>
                        </div>
                      )}
                    </dl>

                    {(r?.features || op.features).length > 0 && (
                      <div className="mt-5">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Фичи" : "Features"}</div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          {(r?.features || op.features).map((f, j) => (
                            <span key={j} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] py-1.5 pl-2.5 pr-3 text-caption text-[var(--color-text-secondary)]">
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-brand)]"><path d="M8 1.5a4.5 4.5 0 0 0-2.7 8.1c.4.3.6.7.7 1.1l.1.8h3.8l.1-.8c.1-.4.3-.8.7-1.1A4.5 4.5 0 0 0 8 1.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><path d="M6.3 14h3.4M6.8 12.5h2.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
                              {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {op.gapApps.length > 0 && <p className="mt-5 text-footnote leading-relaxed text-[var(--color-text-tertiary)]"><span className="font-semibold text-[var(--color-text-secondary)]">Где видно: </span>{op.gapApps.join(" · ")}</p>}

                    {op.quotes.length > 0 && (
                      <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-5">
                        <div className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-text-tertiary)]">{ru ? "Доказательства" : "Evidence"}</div>
                        <Quotes list={op.quotes} n={6} />
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* APP */}
              {active.kind === "app" && (() => {
                const a = apps[active.i];
                return (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3.5">
                      {a.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-14 shrink-0 rounded-[15px] object-cover" />
                      ) : (
                        <div className="size-14 shrink-0 rounded-[15px] bg-[var(--color-bg-muted)]" />
                      )}
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-[20px] font-bold leading-tight tracking-[-0.01em] text-[var(--color-text-primary)]">{a.name}</span>
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          {a.avg != null && <span className="text-caption tabular-nums text-[#f5b301]">★ {a.avg.toFixed(1)}</span>}
                          {a.tag && <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: `color-mix(in srgb, ${a.tag.color} 16%, transparent)`, color: a.tag.color }}>{a.tag.label}</span>}
                        </span>
                      </div>
                    </div>

                    {a.locked ? (
                      <div className="mt-5 flex flex-col gap-4">
                        {a.hook && <p className="text-[18px] font-semibold leading-snug text-[var(--color-text-primary)]">{a.hook}</p>}
                        <p className="text-footnote text-[var(--color-text-tertiary)]">{ru ? `Внутри — что хвалят, на что злятся и где косяк: ${a.total} наблюдений.` : `Inside — what's loved, hated and broken: ${a.total} observations.`}</p>
                        <EnergyUnlockButton type="app" slug={a.slug as string} cost={UNLOCK_COST.app} loggedIn={loggedIn} balance={balance} locale={locale} label={ru ? "Открыть разбор" : "Unlock breakdown"} />
                      </div>
                    ) : (
                      <div className="mt-5">
                        {a.description && <p className="mb-4 text-footnote leading-relaxed text-[var(--color-text-secondary)]">{a.description}</p>}
                        {a.slides.length > 0 && <CardCarousel slides={a.slides} locale={ru ? "ru" : "en"} layout="feed" />}
                        {a.slug && (
                          <Link href={`/${a.slug}`} className="mt-5 inline-flex items-center gap-1.5 text-footnote font-semibold text-[var(--color-text-brand)] hover:opacity-80">
                            {ru ? "Полный разбор приложения →" : "Full app breakdown →"}
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
