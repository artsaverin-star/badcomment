import { notFound } from "next/navigation";
import Link from "next/link";
import { getIdea } from "@/lib/ideas";
import { isPremium, canAccessCategory } from "@/lib/premium";
import Paywall from "@/components/Paywall";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// Idea detail: the derivation chain made visible. Step 1 is a grid of verbatim
// review quotes, step 2 the mechanisms they aggregate into (with real
// observation counts), step 3 the gap, step 4 the pitch. The layout deliberately
// reads top-down like a funnel: many voices → few mechanisms → one idea.

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[11px] tracking-tight text-[var(--color-text-tertiary)]">
      {"★".repeat(rating)}
      <span className="opacity-30">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-text-brand)] text-[13px] font-bold text-white">
        {n}
      </span>
      <h2 className="text-[20px] font-semibold text-[var(--color-text-primary)]">{title}</h2>
    </div>
  );
}

function FunnelArrow() {
  return (
    <div className="my-6 flex justify-center text-[24px] text-[var(--color-text-tertiary)]" aria-hidden>
      ↓
    </div>
  );
}

export default async function IdeaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);

  const idea = getIdea(slug);
  if (!idea) notFound();

  // Premium gate: ideas in premium categories are paywalled for non-subscribers.
  const premium = await isPremium();
  const locked = !canAccessCategory(idea.category, premium);

  const pains = idea.mechanisms.filter((m) => m.polarity === "pain");
  const loves = idea.mechanisms.filter((m) => m.polarity === "love" || (m.polarity as string) === "praise");
  const antiFeatures = idea.idea.antiFeatures ?? [];
  const monetization = idea.idea.monetization ?? "";

  return (
    <main className="mx-auto w-full max-w-[760px] overflow-x-clip px-4 py-8">
      <div className="mb-6">
        <Link
          href="/ideas"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] px-3.5 py-1.5 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3.5 5.5 8l4.5 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {tr.ideas.title}
        </Link>
      </div>

      <header className="mb-10 text-center">
        <Link
          href={`/segment/${idea.category}`}
          className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-text-brand)] hover:underline"
        >
          {idea.categoryName}
        </Link>
        <h1 className="mt-2 text-[28px] font-bold leading-tight text-[var(--color-text-primary)]">
          {idea.title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {idea.oneLiner}
        </p>
        <div className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
          {idea.stats.apps} приложений · {idea.stats.reviews.toLocaleString("ru-RU")} отзывов ·{" "}
          {idea.stats.observations.toLocaleString("ru-RU")} наблюдений · {idea.asOf}
        </div>
      </header>

      {locked ? (
        <Paywall title="Полная идея — в премиуме" />
      ) : (
        <>
      {/* Step 1 — the raw voices */}
      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
        <StepLabel n={1} title="Что пишут в отзывах" />
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {idea.reviewGrid.map((q, i) => (
            <figure
              key={i}
              className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] p-3"
            >
              <Stars rating={q.rating} />
              <blockquote className="text-[12.5px] leading-snug text-[var(--color-text-primary)]">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-auto text-[11px] text-[var(--color-text-tertiary)]">
                {q.app}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <FunnelArrow />

      {/* Step 2 — what they sum into */}
      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
        <StepLabel n={2} title="Во что это складывается" />
        <div className="flex flex-col gap-2">
          {pains.map((m) => (
            <div
              key={m.title}
              className="flex items-baseline gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3"
            >
              <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                {m.obsCount}
              </span>
              <div className="min-w-0">
                <div className="text-[14px] font-medium leading-snug text-[var(--color-text-primary)]">
                  {m.title}
                </div>
                <div className="mt-0.5 text-[11.5px] text-[var(--color-text-tertiary)]">
                  {m.apps.join(" · ")}
                </div>
              </div>
            </div>
          ))}
        </div>
        {loves.length > 0 && (
          <>
            <div className="mb-2 mt-5 text-[13px] font-semibold text-[var(--color-text-secondary)]">
              А это — то, за что категорию любят (и что нельзя терять):
            </div>
            <div className="flex flex-col gap-2">
              {loves.map((m) => (
                <div
                  key={m.title}
                  className="flex items-baseline gap-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card-subtle)] px-4 py-3"
                >
                  <span className="shrink-0 rounded-full bg-[var(--color-bg-muted)] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">
                    {m.obsCount}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium leading-snug text-[var(--color-text-primary)]">
                      {m.title}
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-[var(--color-text-tertiary)]">
                      {m.apps.join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <FunnelArrow />

      {/* Step 3 — the gap */}
      <section className="rounded-2xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-card)] p-6">
        <StepLabel n={3} title="Возможность" />
        <p className="text-[15px] leading-relaxed text-[var(--color-text-primary)]">{idea.gap}</p>
      </section>

      <FunnelArrow />

      {/* Step 4 — the idea */}
      <section className="rounded-2xl border-2 border-[var(--color-text-brand)] bg-[var(--color-surface-card)] p-6">
        <StepLabel n={4} title="Идея" />
        <p className="text-[15px] leading-relaxed text-[var(--color-text-primary)]">
          {idea.idea.pitch}
        </p>
        <div className={`mt-5 grid grid-cols-1 gap-5 ${antiFeatures.length > 0 ? "sm:grid-cols-2" : ""}`}>
          <div>
            <div className="mb-2 text-footnote font-semibold text-[var(--color-text-secondary)]">
              Что делаем
            </div>
            <ul className="flex flex-col gap-1.5">
              {idea.idea.features.map((f) => (
                <li key={f} className="flex gap-2 text-footnote leading-snug text-[var(--color-text-primary)]">
                  <span className="text-[var(--color-text-brand)]">+</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          {antiFeatures.length > 0 && (
            <div>
              <div className="mb-2 text-footnote font-semibold text-[var(--color-text-secondary)]">
                Чего сознательно не делаем
              </div>
              <ul className="flex flex-col gap-1.5">
                {antiFeatures.map((f) => (
                  <li key={f} className="flex gap-2 text-footnote leading-snug text-[var(--color-text-primary)]">
                    <span className="text-[var(--color-text-tertiary)]">−</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {monetization && (
          <div className="mt-5 border-t border-[var(--color-border-subtle)] pt-4 text-footnote leading-relaxed text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Монетизация: </span>
            {monetization}
          </div>
        )}
      </section>
        </>
      )}
    </main>
  );
}
