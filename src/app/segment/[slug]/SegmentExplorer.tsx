"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Locale } from "@/lib/i18n";
import type { FeedIdea } from "@/lib/ideaFeed";
import CategoryGate from "@/components/CategoryGate";
import DeckPile from "@/components/DeckPile";
import Reveal from "@/components/Reveal";
import IdeaFeed from "@/components/IdeaFeed";

export type ExpQuote = { app: string; rating: number; text: string };
export type ExpObs = { title: string; plus?: string; minus?: string; count: number; tone: "up" | "down" | "mixed" | "info"; evidence: ExpQuote[] };
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
  observations: ExpObs[];
};
export type ExpFlaw = { label: string; color: string; n: number };

type Active = { kind: "idea"; i: number } | { kind: "app"; i: number } | { kind: "offer" } | null;

function plural(n: number, one: string, few: string, many: string) {
  const d = n % 10;
  const dd = n % 100;
  if (dd >= 11 && dd <= 14) return many;
  if (d === 1) return one;
  if (d >= 2 && d <= 4) return few;
  return many;
}
const wordOpp = (n: number) => plural(n, "возможность", "возможности", "возможностей");
const wordApp = (n: number) => plural(n, "приложение", "приложения", "приложений");

function Quotes({ list, n = 3 }: { list: ExpQuote[]; n?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {list.slice(0, n).map((q, j) => (
        <figure key={j} className="msg-bubble max-w-[90%] self-start rounded-[18px] rounded-bl-[5px] bg-[var(--color-bg-muted)] px-4 py-3">
          <p className="text-[14px] italic leading-[1.55] text-[var(--color-text-secondary)]">{q.text}</p>
          <figcaption className="mt-1.5 text-[12px] not-italic text-[var(--color-text-tertiary)]">{q.app}</figcaption>
        </figure>
      ))}
    </div>
  );
}
function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] font-medium uppercase tracking-[0.22em] text-[var(--color-text-tertiary)]">{children}</div>;
}

export default function SegmentExplorer({
  locale,
  slug,
  categoryName,
  opps,
  apps,
  competitorRead,
  loggedIn,
  sellable,
  price,
  pregenDate,
  starsHref,
  starsLabel,
}: {
  locale: Locale;
  slug: string;
  categoryName?: string;
  opps: ExpOpp[];
  apps: ExpApp[];
  competitorRead?: string;
  loggedIn: boolean;
  sellable: boolean;
  price: number;
  pregenDate: string;
  starsHref?: string;
  starsLabel?: string;
}) {
  const ru = locale !== "en";
  const [active, setActive] = useState<Active>(null);
  const ideasLocked = opps.some((o) => o.locked);
  const appsLocked = apps.some((a) => a.locked);

  // Map the niche's opportunities onto the shared idea-feed card shape so the
  // ideas read as our swipe carousel; depth is null when locked (preview only).
  const feedItems: FeedIdea[] = opps.map((op) => ({
    slug: op.slug,
    category: slug,
    categoryName: categoryName ?? "",
    title: op.regen?.title || op.title,
    oneLiner: op.regen?.tagline || op.oneLiner,
    demand: op.demand,
    quote: op.quotes[0] ? { text: op.quotes[0].text, app: op.quotes[0].app, rating: op.quotes[0].rating } : null,
    depth: op.locked
      ? null
      : {
          gap: op.regen?.wedge || op.gap,
          pitch: op.regen?.build || op.pitch,
          features: op.regen?.features || op.features,
          monetization: op.regen?.monetization || op.monetization,
          quotes: op.quotes.slice(0, 5).map((q) => ({ text: q.text, app: q.app, rating: q.rating })),
        },
  }));

  // Lock background scroll (iOS-safe: overflow:hidden alone leaks on Safari, so
  // pin the body in place and restore the scroll position on close) + close on Esc.
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width, overflow: body.style.overflow };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setActive(null);
    window.addEventListener("keydown", onKey);
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      body.style.overflow = prev.overflow;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKey);
    };
  }, [active]);

  return (
    <>
      {/* ── OPPORTUNITIES — our swipe carousel (only once unlocked; while locked
            the findings offer above covers the whole category) ── */}
      {opps.length > 0 && !ideasLocked && (
        <Reveal className="mt-20 sm:mt-28">
          <section>
            <Eyebrow>{ru ? "Что построить" : "What to build"}</Eyebrow>
            <h2 className="mt-4 text-[34px] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[46px]">
              {opps.length} {ru ? wordOpp(opps.length) : "opportunities"}
            </h2>
            <p className="mt-5 max-w-[56ch] text-[17px] leading-[1.6] text-[var(--color-text-secondary)] sm:text-[18px]">
              {ru ? "Идеи, которые пользователи просят сами — каждая под подтверждённый спрос." : "Ideas users ask for themselves — each backed by proven demand."}
            </p>
            <div className="mt-10">
              <IdeaFeed
                items={feedItems}
                dailySlug={null}
                fullDeck={false}
                compact
                hasAccess={!ideasLocked}
                loggedIn={loggedIn}
                deckPrice={price}
                locale={locale}
                onLockedOpen={() => setActive({ kind: "offer" })}
              />
            </div>
          </section>
        </Reveal>
      )}

      {/* ── COMPETITORS — synthesis + clean list (only once unlocked) ── */}
      {apps.length > 0 && !appsLocked && (
        <Reveal className="mt-20 sm:mt-28">
          <section>
          <Eyebrow>{ru ? "Конкуренты" : "Competitors"}</Eyebrow>
          {!appsLocked && (
            <>
              <h2 className="mt-4 text-[34px] font-black leading-[1.02] tracking-[-0.04em] text-[var(--color-text-primary)] sm:text-[46px]">
                {apps.length} {ru ? wordApp(apps.length) : "apps"}
              </h2>
              {competitorRead && <p className="mt-7 max-w-[60ch] text-[20px] font-light leading-[1.5] text-[var(--color-text-secondary)] sm:text-[23px]">{competitorRead}</p>}
            </>
          )}
          {appsLocked ? (
            <DeckPile
              title={ru ? `Разбор ${apps.length} приложений` : `${apps.length} app teardowns`}
              subtitle={ru ? "По каждому лидеру ниши — за что его любят, где он бесит и чего людям не хватает. Готовая карта конкурентов по реальным отзывам, чтобы не повторять их ошибок." : "For each niche leader — what it's loved for, what enrages users and what's missing. A ready competitor map from real reviews."}
              icons={apps.map((a) => a.icon)}
              button={
                <CategoryGate slug={slug} categoryName={categoryName} sellable={sellable} price={price} loggedIn={loggedIn} pregenDate={pregenDate} locale={locale} starsHref={starsHref} starsLabel={starsLabel} inline />
              }
            />
          ) : (
            <div className="deck-grid mt-12 flex flex-col gap-3">
              {apps.map((a, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActive({ kind: "app", i })}
                  style={{ animationDelay: `${Math.min(i, 10) * 45}ms` }}
                  className="deck-card group flex w-full items-center gap-4 rounded-[18px] border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-4 py-3.5 text-left transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
                >
                  {a.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.icon} alt="" loading="lazy" decoding="async" className="size-12 shrink-0 rounded-[13px] object-cover" />
                  ) : (
                    <div className="size-12 shrink-0 rounded-[13px] bg-[var(--color-bg-muted)]" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">{a.name}</span>
                      {a.avg != null && <span className="shrink-0 text-[12px] font-semibold tabular-nums text-[var(--color-text-tertiary)]">{a.avg.toFixed(1)}★</span>}
                    </span>
                    {a.hook ? (
                      <span className="truncate text-[13px] leading-snug text-[var(--color-text-secondary)]">{a.hook}</span>
                    ) : (
                      a.description && <span className="truncate text-[13px] text-[var(--color-text-tertiary)]">{a.description}</span>
                    )}
                  </span>
                  <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-hover:translate-x-0.5">
                    <path d="M6 4l5 5-5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          )}
          </section>
        </Reveal>
      )}

      {/* ── MODAL — portalled to <body> to escape transformed/blurred ancestors ── */}
      {active &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
          <button type="button" aria-label={ru ? "Закрыть" : "Close"} onClick={() => setActive(null)} className="modal-backdrop absolute inset-0 bg-black/50 backdrop-blur-md" />
          <div className="modal-panel relative z-10 flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[28px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] shadow-[0_-20px_70px_-20px_rgba(0,0,0,0.7)] sm:rounded-[28px]">
            <div className="flex shrink-0 items-center justify-between gap-3 px-6 pt-5">
              <span className="text-[13px] font-medium uppercase tracking-[0.2em] text-[var(--color-text-tertiary)]">
                {active.kind === "idea" ? (ru ? `Возможность ${active.i + 1}` : `Opportunity ${active.i + 1}`) : active.kind === "app" ? (ru ? "Приложение" : "App") : (ru ? "Разбор категории" : "Category")}
              </span>
              <button type="button" onClick={() => setActive(null)} className="-mr-1 flex size-9 items-center justify-center rounded-full text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-text-primary)]" aria-label={ru ? "Закрыть" : "Close"}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain px-6 py-7 sm:px-8 sm:py-8">
              {/* IDEA */}
              {active.kind === "idea" && (() => {
                const op = opps[active.i];
                if (op.locked) {
                  return (
                    <div className="flex flex-col gap-6">
                      <h2 className="text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[30px]">{ru ? "Готовая возможность под подтверждённый спрос" : "A ready opportunity for proven demand"}</h2>
                      {op.quotes[0] && (
                        <figure>
                          <p className="text-[15px] italic leading-[1.6] text-[var(--color-text-secondary)]">“{op.quotes[0].text}”</p>
                          <figcaption className="mt-1.5 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{op.quotes[0].app} · {op.quotes[0].rating}★</figcaption>
                        </figure>
                      )}
                      <p className="text-[14px] leading-[1.6] text-[var(--color-text-tertiary)]">{ru ? "Внутри — в чём разрыв и почему это шанс, что строить, фичи, монетизация и доказательства из отзывов." : "Inside — the gap and why it's an opening, what to build, features, monetization and evidence."}</p>
                      <CategoryGate slug={slug} categoryName={categoryName} sellable={sellable} price={price} loggedIn={loggedIn} pregenDate={pregenDate} locale={locale} starsHref={starsHref} starsLabel={starsLabel} inline />
                    </div>
                  );
                }
                const r = op.regen;
                return (
                  <div className="flex flex-col">
                    <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[32px]">{r?.title || op.title}</h2>
                    <p className="mt-3 text-[18px] font-light leading-[1.45] text-[var(--color-text-secondary)] sm:text-[20px]">{r?.tagline || op.oneLiner}</p>
                    {r && <p className="mt-4 text-[14px] leading-[1.6] text-[var(--color-text-tertiary)]"><span className="text-[var(--color-text-secondary)]">Для кого — </span>{r.forWhom}</p>}

                    <div className="mt-8 border-l border-[var(--color-border-strong)] pl-5">
                      <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Почему это шанс" : "Why it's an opening"}</div>
                      <p className="mt-2.5 text-[16px] leading-[1.65] text-[var(--color-text-primary)]">{r?.wedge || op.gap}</p>
                    </div>

                    <div className="mt-8 flex flex-col gap-7">
                      <div>
                        <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Что строить" : "What to build"}</div>
                        <p className="mt-2.5 text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">{r?.build || op.pitch}</p>
                      </div>
                      {(r?.features || op.features).length > 0 && (
                        <div>
                          <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Что входит" : "Features"}</div>
                          <ul className="mt-3 flex flex-col gap-2.5">
                            {(r?.features || op.features).map((f, j) => (
                              <li key={j} className="flex gap-3 text-[15px] leading-[1.5] text-[var(--color-text-secondary)]">
                                <span className="select-none text-[var(--color-text-tertiary)]">—</span>
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {(r?.monetization || op.monetization) && (
                        <div>
                          <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Монетизация" : "Monetize"}</div>
                          <p className="mt-2.5 text-[16px] leading-[1.65] text-[var(--color-text-secondary)]">{r?.monetization || op.monetization}</p>
                        </div>
                      )}
                      {op.gapApps.length > 0 && (
                        <div>
                          <div className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Где видно" : "Where"}</div>
                          <p className="mt-2.5 text-[15px] leading-[1.6] text-[var(--color-text-tertiary)]">{op.gapApps.join("  ·  ")}</p>
                        </div>
                      )}
                    </div>

                    {op.quotes.length > 0 && (
                      <div className="mt-8 border-t border-[var(--color-border-subtle)] pt-7">
                        <div className="mb-4 text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{ru ? "Доказательства" : "Evidence"}</div>
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
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <span className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)]">{a.name}</span>
                        {a.description && <span className="text-[14px] leading-snug text-[var(--color-text-tertiary)]">{a.description}</span>}
                      </div>
                    </div>

                    {a.locked ? (
                      <div className="mt-8">
                        <CategoryGate slug={slug} categoryName={categoryName} sellable={sellable} price={price} loggedIn={loggedIn} pregenDate={pregenDate} locale={locale} starsHref={starsHref} starsLabel={starsLabel} inline />
                      </div>
                    ) : (
                      <div className="mt-7">
                        {[
                          { key: "up", label: ru ? "Сильные стороны" : "Strengths", items: a.observations.filter((s) => s.tone === "up" || s.tone === "info").slice().sort((x, y) => y.count - x.count) },
                          { key: "mixed", label: ru ? "Спорно" : "Mixed", items: a.observations.filter((s) => s.tone === "mixed").slice().sort((x, y) => y.count - x.count) },
                          { key: "down", label: ru ? "Слабые места" : "Weak spots", items: a.observations.filter((s) => s.tone === "down").slice().sort((x, y) => y.count - x.count) },
                        ]
                          .filter((g) => g.items.length > 0)
                          .map((g) => (
                            <div key={g.key} className="mb-8 last:mb-0">
                              <div className="flex items-baseline gap-2.5">
                                <span className="text-[13px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">{g.label}</span>
                                <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{g.items.length}</span>
                              </div>
                              <div className="mt-3 border-t border-[var(--color-border-subtle)]">
                                {g.items.map((s, k) => (
                                  <details key={k} className="group/f border-b border-[var(--color-border-subtle)]">
                                    <summary className="flex cursor-pointer list-none items-start gap-4 py-3.5 [&::-webkit-details-marker]:hidden">
                                      <span className="min-w-0 flex-1 text-[15px] font-medium leading-[1.45] text-[var(--color-text-primary)]">{s.title}</span>
                                      <span className="mt-0.5 shrink-0 text-[13px] tabular-nums text-[var(--color-text-tertiary)]">{s.count}</span>
                                      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    </summary>
                                    <div className="details-reveal pb-5">
                                      {(s.plus || s.minus) && <p className="text-[15px] leading-[1.6] text-[var(--color-text-secondary)]">{[s.plus, s.minus].filter(Boolean).join(" ")}</p>}
                                      {s.evidence.length > 0 && (
                                        <div className="mt-4">
                                          <Quotes list={s.evidence} />
                                        </div>
                                      )}
                                    </div>
                                  </details>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* OFFER — raised when a locked idea breakdown is opened */}
              {active.kind === "offer" && (
                <div className="flex flex-col gap-6">
                  <h2 className="text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--color-text-primary)] sm:text-[30px]">{ru ? `Откройте разбор ниши «${categoryName}»` : `Open the “${categoryName}” breakdown`}</h2>
                  <p className="text-[15px] leading-[1.6] text-[var(--color-text-tertiary)]">{ru ? "Внутри по каждой идее — почему это шанс, что строить, фичи, монетизация и доказательства из отзывов. Плюс разбор всех конкурентов ниши." : "Inside every idea — the gap, what to build, features, monetization and review evidence. Plus the full competitor teardown."}</p>
                  <CategoryGate slug={slug} categoryName={categoryName} sellable={sellable} price={price} loggedIn={loggedIn} pregenDate={pregenDate} locale={locale} starsHref={starsHref} starsLabel={starsLabel} inline />
                </div>
              )}
            </div>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
