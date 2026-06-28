import type { Metadata } from "next";
import rating from "@/data/peoplesRating/astrology.json";
import thesisAll from "@/data/niche-thesis.json";
import insightsAll from "@/data/segment-insights.json";
import ideasAll from "@/data/ideas.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Прототип единого спуска — астрология",
  robots: { index: false, follow: false },
};

// PROTOTYPE (/test): one niche shown as a single descent — Рейтинг → Разбор →
// Идеи — to feel the unified founder offer. Real astrology data, RU only.

const SLUG = "astrology";
const NF = (n: number) => n.toLocaleString("ru-RU");

// strip a leading "Brand. " prefix some ultra-category idea titles still carry
const cleanTitle = (t: string) => {
  const m = t.replace(/^[A-Za-z][A-Za-z0-9 ]*\.\s+/, "");
  return m.charAt(0).toUpperCase() + m.slice(1);
};

export default function TestDescentPage() {
  const r = rating as typeof rating;
  const thesis = (thesisAll as Record<string, { governing: string }>)[SLUG];
  const insights = (insightsAll as Record<string, { items: { title: string }[] }>)[SLUG];
  const ideas = (ideasAll as { category: string; title: string; oneLiner: string }[]).filter(
    (x) => x.category === SLUG,
  );

  const topApps = r.apps.slice(0, 5);
  const gaps = insights.items.slice(0, 5);
  const firstIdea = ideas[0];
  const lockedIdeas = ideas.slice(1);

  const Step = ({ n, label, active }: { n: number; label: string; active?: boolean }) => (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${active ? "bg-[var(--color-text-primary)] text-[var(--color-bg-page)]" : "border border-[var(--color-border-subtle)] text-[var(--color-text-tertiary)]"}`}
      >
        {n}
      </span>
      <span className={`text-[13px] ${active ? "font-medium text-[var(--color-text-primary)]" : "text-[var(--color-text-tertiary)]"}`}>{label}</span>
    </div>
  );

  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 pb-24 pt-6">
      {/* sticky progress: one document, three acts */}
      <div className="sticky top-0 z-30 -mx-4 mb-2 border-b border-[var(--color-border-subtle)] bg-[color-mix(in_srgb,var(--color-bg-page)_88%,transparent)] px-4 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <a href="#rating"><Step n={1} label="Рейтинг" active /></a>
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          <a href="#breakdown"><Step n={2} label="Разбор" /></a>
          <span className="h-px flex-1 bg-[var(--color-border-subtle)]" />
          <a href="#ideas"><Step n={3} label="Идеи" /></a>
        </div>
      </div>

      {/* hero — one job, founder */}
      <header className="pt-10">
        <div className="text-[13px] font-medium tracking-[0.02em] text-[var(--color-text-tertiary)]">Разбор ниши · {r.name}</div>
        <h1 className="glow-sweep mt-5 text-[clamp(32px,8vw,60px)] font-black leading-[1.0] tracking-[-0.035em] text-balance text-[var(--color-text-primary)]">
          Читаем все отзывы категории и показываем, что в ней строить
        </h1>
        <p className="mt-6 max-w-[54ch] text-[19px] font-light leading-[1.5] text-pretty text-[var(--color-text-secondary)] sm:text-[22px]">
          Честный рейтинг по реальным отзывам, разбор дыр ниши и готовые идеи с пруфами. Для тех, кто ищет следующий продукт.
        </p>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-4">
          <Stat n={NF(r.count)} l="приложений" />
          <Stat n={NF(r.totalReviews)} l="отзывов прочитано" />
          <Stat n={NF(r.inflated)} l="с накрученной звездой" />
        </div>
      </header>

      {/* ACT 1 — RATING (the proof) */}
      <section id="rating" className="mt-20 scroll-mt-20">
        <ActHead n={1} kicker="Доказательство" title="Кто в нише реально хорош" sub="Оценка по реальным отзывам, а не по витринной звезде, которую накручивают." />
        <ol className="mt-8 flex flex-col divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
          {topApps.map((a, i) => (
            <li key={a.id} className="flex items-center gap-3 py-3.5">
              <span className="w-5 text-[13px] font-medium tabular-nums text-[var(--color-text-tertiary)]">{i + 1}</span>
              {a.icon
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={a.icon} alt="" loading="lazy" className="size-10 shrink-0 rounded-[10px] object-cover" />
                : <div className="size-10 shrink-0 rounded-[10px] bg-[var(--color-bg-muted)]" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium text-[var(--color-text-primary)]">{a.title}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)]">в сторе {a.storeAvg?.toFixed(1)}★ · {NF(a.nrev)} отзывов</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-[18px] font-semibold tabular-nums text-[var(--color-text-primary)]">{a.realScore}<span className="text-[11px] text-[var(--color-text-tertiary)]">/100</span></span>
              </div>
            </li>
          ))}
        </ol>
        <Descend href="#breakdown" label="Что вся категория делает не так" />
      </section>

      {/* ACT 2 — BREAKDOWN (the argument) */}
      <section id="breakdown" className="mt-20 scroll-mt-20">
        <ActHead n={2} kicker="Аргумент" title="Где ниша сломана" sub="Структурные дыры, которые видны во всех 100 приложениях сразу." />
        <p className="mt-7 max-w-[60ch] text-[17px] leading-[1.6] text-pretty text-[var(--color-text-secondary)]">{thesis.governing}</p>
        <ul className="mt-8 flex flex-col gap-px overflow-hidden rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)]">
          {gaps.map((g, i) => (
            <li key={i} className="flex items-start gap-3 bg-[var(--color-bg-page)] px-4 py-4">
              <span className="mt-0.5 text-[12px] font-semibold tabular-nums text-[var(--color-text-tertiary)]">0{i + 1}</span>
              <span className="text-[16px] font-medium leading-[1.4] text-[var(--color-text-primary)]">{g.title}</span>
            </li>
          ))}
        </ul>
        <Descend href="#ideas" label="Что из этого строить" />
      </section>

      {/* ACT 3 — IDEAS (the paid payload) */}
      <section id="ideas" className="mt-20 scroll-mt-20">
        <ActHead n={3} kicker="Что строить" title={`${ideas.length} идей под эту нишу`} sub="Каждая идея — реальный бизнес, под который прочитаны все отзывы категории." />

        {/* first idea: open */}
        <article className="mt-8 rounded-[20px] border border-[var(--color-border-subtle)] p-6">
          <div className="text-[12px] font-medium text-[var(--color-text-tertiary)]">Идея 1 · открыта</div>
          <h3 className="mt-2 text-[22px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">{cleanTitle(firstIdea.title)}</h3>
          <p className="mt-2 text-[16px] leading-[1.55] text-[var(--color-text-secondary)]">{firstIdea.oneLiner}</p>
        </article>

        {/* the rest: locked behind a contextual paywall */}
        <div className="relative mt-4">
          <div className="flex flex-col gap-3" aria-hidden>
            {lockedIdeas.map((x, i) => (
              <div key={i} className="rounded-[16px] border border-[var(--color-border-subtle)] p-5 blur-[5px]">
                <h3 className="text-[19px] font-bold text-[var(--color-text-primary)]">{cleanTitle(x.title)}</h3>
                <p className="mt-1.5 text-[15px] text-[var(--color-text-secondary)]">{x.oneLiner}</p>
              </div>
            ))}
          </div>

          {/* contextual paywall — at the END of the descent, scoped to THIS niche */}
          <div className="absolute inset-x-0 bottom-0 top-10 flex items-end justify-center bg-gradient-to-b from-transparent via-[color-mix(in_srgb,var(--color-bg-page)_60%,transparent)] to-[var(--color-bg-page)]">
            <div className="w-full rounded-[22px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-page)] p-6 text-center shadow-[0_-24px_70px_-24px_rgba(0,0,0,0.6)]">
              <div className="text-[13px] font-medium text-[var(--color-text-tertiary)]">Ещё {lockedIdeas.length} идей под {r.name.toLowerCase()}</div>
              <div className="mt-2 text-[21px] font-bold text-[var(--color-text-primary)]">Открыть все идеи ниши</div>
              <p className="mx-auto mt-2 max-w-[40ch] text-[14px] leading-[1.5] text-[var(--color-text-secondary)]">
                Ты уже видел рейтинг и разбор. Идеи — это вывод из них: что конкретно строить.
              </p>
              <button className="mt-5 w-full rounded-full bg-[var(--color-text-primary)] px-6 py-3 text-[15px] font-semibold text-[var(--color-bg-page)] transition-opacity hover:opacity-90">
                Открыть · Lifetime — весь каталог навсегда
              </button>
              <div className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">или открыть только эту нишу</div>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-16 text-center text-[12px] text-[var(--color-text-tertiary)]">Прототип единого оффера · /test · данные реальные (астрология)</p>
    </main>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="flex flex-col">
      <span className="glow-sweep text-[clamp(32px,9vw,48px)] font-black leading-none tracking-[-0.04em] tabular-nums text-[var(--color-text-primary)]">{n}</span>
      <span className="mt-2 text-[13px] text-[var(--color-text-tertiary)]">{l}</span>
    </div>
  );
}

function ActHead({ n, kicker, title, sub }: { n: number; kicker: string; title: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[13px] font-semibold tracking-[0.04em] text-[var(--color-text-tertiary)]">
        <span className="flex size-5 items-center justify-center rounded-full bg-[var(--color-text-primary)] text-[11px] text-[var(--color-bg-page)]">{n}</span>
        {kicker.toUpperCase()}
      </div>
      <h2 className="mt-3 text-[clamp(26px,6vw,38px)] font-black tracking-[-0.03em] text-[var(--color-text-primary)]">{title}</h2>
      <p className="mt-2 max-w-[56ch] text-[16px] leading-[1.5] text-pretty text-[var(--color-text-secondary)]">{sub}</p>
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
