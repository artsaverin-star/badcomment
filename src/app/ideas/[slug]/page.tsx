import { notFound } from "next/navigation";
import Link from "next/link";
import { getIdea } from "@/lib/ideas";
import { ideaCard, ideaContentEn } from "@/lib/regenCards";
import { getAccess } from "@/lib/access";
import { UNLOCK_COST } from "@/lib/tokenConfig";
import UnlockGate from "@/components/UnlockGate";
import ReviewCarousel from "@/components/ReviewCarousel";
import Reveal from "@/components/Reveal";
import { t } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// Idea detail as an editorial landing: many voices → few mechanisms → one idea.
// Centered headings, no card "islands", scroll-reveal animations.

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-7 flex flex-col items-center gap-3 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-[var(--color-accent-brand-subtle)] text-callout font-bold text-[var(--color-text-brand)]">
        {n}
      </span>
      <h2 className="text-[26px] font-bold tracking-[-0.01em] text-[var(--color-text-primary)]">{title}</h2>
    </div>
  );
}

function nablWord(n: number, ru: boolean): string {
  if (!ru) return n === 1 ? "observation" : "observations";
  const d = n % 10, dd = n % 100;
  if (dd >= 11 && dd <= 14) return "наблюдений";
  if (d === 1) return "наблюдение";
  if (d >= 2 && d <= 4) return "наблюдения";
  return "наблюдений";
}

function Mechanism({ obsCount, title, apps, ru }: { obsCount: number; title: string; apps: string[]; ru: boolean }) {
  return (
    <div className="border-b border-[var(--color-border-subtle)] py-3.5 text-center last:border-0">
      <div className="text-[15px] font-medium leading-snug text-[var(--color-text-primary)]">{title}</div>
      <div className="mt-1 text-[11.5px] text-[var(--color-text-tertiary)]">
        {obsCount} {nablWord(obsCount, ru)}
        {apps.length > 0 && <> · {apps.join(" · ")}</>}
      </div>
    </div>
  );
}

export default async function IdeaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const tr = t(locale);
  const ru = locale !== "en";
  const L = ru
    ? { locked: "Идея под замком", apps: "приложений", reviews: "отзывов", obs: "наблюдений", s1: "Что пишут в отзывах", s2: "Во что это складывается", loves: "За что категорию любят — и что нельзя терять", s3: "Возможность", s4: "Идея", build: "Что делаем", skip: "Чего сознательно не делаем", money: "Монетизация: ", gateTitle: "Готовая идея: суть, механики и что строить" }
    : { locked: "Idea locked", apps: "apps", reviews: "reviews", obs: "observations", s1: "What users write", s2: "What it adds up to", loves: "What users love — and what you can't lose", s3: "The opportunity", s4: "The idea", build: "What we build", skip: "What we deliberately skip", money: "Monetization: ", gateTitle: "The full idea: essence, mechanics, what to build" };

  const idea = getIdea(slug);
  if (!idea) notFound();
  const ov = ideaCard(slug, locale);
  const ideaTitle = ov?.title ?? idea.title;
  const ideaOneLiner = ov?.oneLiner ?? idea.oneLiner;

  // English overlay for the idea body (gap → pitch → features → mechanisms).
  const enc = ideaContentEn(slug, locale);
  const categoryName = enc?.categoryName || idea.categoryName;
  const gap = enc?.gap || idea.gap;
  const pitch = enc?.pitch || idea.idea.pitch;
  const features = enc?.features?.length ? enc.features : idea.idea.features;

  // Token gate: the full idea is unlocked per-idea (or via its category bundle).
  const access = await getAccess();
  const locked = !access.has("idea", slug);

  const mechs = idea.mechanisms.map((m, i) => ({ ...m, title: enc?.mechanisms?.[i]?.trim() || m.title }));
  const pains = mechs.filter((m) => m.polarity === "pain");
  const loves = mechs.filter((m) => m.polarity === "love" || (m.polarity as string) === "praise");
  const antiFeatures = enc?.antiFeatures?.length ? enc.antiFeatures : idea.idea.antiFeatures ?? [];
  const monetization = enc?.monetization || idea.idea.monetization || "";

  return (
    <main className="mx-auto w-full max-w-[680px] overflow-x-clip px-4 py-8">
      <div className="mb-8">
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

      <header className="ld-fade mb-4 text-center">
        <Link
          href={`/segment/${idea.category}`}
          className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-brand)] hover:underline"
        >
          {categoryName}
        </Link>
        <h1 className="mx-auto mt-3 max-w-[18ch] text-[34px] font-bold leading-[1.08] tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[40px]">
          {locked ? L.locked : ideaTitle}
        </h1>
        {!locked && (
          <p className="mx-auto mt-4 max-w-xl text-lead leading-relaxed text-[var(--color-text-secondary)]">
            {ideaOneLiner}
          </p>
        )}
        <div className="mt-4 text-[12px] tabular-nums text-[var(--color-text-tertiary)]">
          {idea.stats.apps} {L.apps} · {idea.stats.reviews.toLocaleString(ru?"ru-RU":"en-US")} {L.reviews} ·{" "}{idea.stats.observations.toLocaleString(ru?"ru-RU":"en-US")} {L.obs}
        </div>
      </header>

      {locked ? (
        <UnlockGate
          type="idea"
          slug={slug}
          cost={UNLOCK_COST.idea}
          loggedIn={access.loggedIn}
          balance={access.balance}
          locale={locale}
          title={L.gateTitle}
        />
      ) : (
        <>
          {/* Step 1 — the raw voices (coverflow carousel, no island) */}
          <Reveal className="mt-14">
            <StepLabel n={1} title={L.s1} />
            <ReviewCarousel items={idea.reviewGrid} />
          </Reveal>

          {/* Step 2 — what they sum into */}
          <Reveal className="mt-20">
            <StepLabel n={2} title={L.s2} />
            <div className="mx-auto max-w-xl">
              {pains.map((m) => (
                <Mechanism key={m.title} obsCount={m.obsCount} title={m.title} apps={m.apps} ru={ru} />
              ))}
            </div>
            {loves.length > 0 && (
              <div className="mx-auto mt-10 max-w-xl">
                <p className="mb-2 text-center text-footnote font-semibold text-[var(--color-text-secondary)]">{L.loves}</p>
                {loves.map((m) => (
                  <Mechanism key={m.title} obsCount={m.obsCount} title={m.title} apps={m.apps} ru={ru} />
                ))}
              </div>
            )}
          </Reveal>

          {/* Step 3 — the gap */}
          <Reveal className="mt-20">
            <StepLabel n={3} title={L.s3} />
            <p className="mx-auto max-w-2xl text-center text-[21px] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--color-text-primary)]">
              {gap}
            </p>
          </Reveal>

          {/* Step 4 — the idea */}
          <Reveal className="mt-20">
            <StepLabel n={4} title={L.s4} />
            <p className="mx-auto max-w-2xl text-center text-lead leading-relaxed text-[var(--color-text-primary)]">
              {pitch}
            </p>
            <div className={`mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-8 ${antiFeatures.length > 0 ? "sm:grid-cols-2" : ""}`}>
              <div>
                <div className="mb-3 text-center text-callout font-semibold text-[var(--color-text-secondary)] sm:text-left">{L.build}</div>
                <ul className="flex flex-col gap-2">
                  {features.map((f) => (
                    <li key={f} className="flex gap-2.5 text-[15px] leading-[1.6] text-[var(--color-text-primary)]">
                      <span className="shrink-0 font-semibold text-[var(--color-text-brand)]">+</span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {antiFeatures.length > 0 && (
                <div>
                  <div className="mb-3 text-center text-callout font-semibold text-[var(--color-text-secondary)] sm:text-left">{L.skip}</div>
                  <ul className="flex flex-col gap-2">
                    {antiFeatures.map((f) => (
                      <li key={f} className="flex gap-2.5 text-[15px] leading-[1.6] text-[var(--color-text-primary)]">
                        <span className="shrink-0 font-semibold text-[var(--color-text-tertiary)]">−</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {monetization && (
              <p className="mx-auto mt-10 max-w-xl border-t border-[var(--color-border-subtle)] pt-5 text-center text-footnote leading-relaxed text-[var(--color-text-secondary)]">
                <span className="font-semibold text-[var(--color-text-primary)]">{L.money}</span>
                {monetization}
              </p>
            )}
          </Reveal>
        </>
      )}
    </main>
  );
}
