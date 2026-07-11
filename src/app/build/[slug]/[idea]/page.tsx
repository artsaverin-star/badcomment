import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import { getLocale } from "@/lib/i18n.server";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getNicheName } from "@/lib/ratingAppSlug";
import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { buildDesignPrompt } from "@/lib/designPrompt";
import { buildCodePrompt } from "@/lib/codePrompt";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import designSpecs from "@/data/designSpecs.json";
import asoTerms from "@/data/asoTerms.json";
import channelsData from "@/data/channels.json";
import channelsEn from "@/data/channels.en.json";
import BuildWizard, { type BuildData } from "@/components/BuildWizard";

export const dynamic = "force-dynamic";

// The builder wizard itself (admin-only prototype). Every artifact is
// assembled server-side from existing catalog data — no runtime LLM.

type Spec = { theme?: string; palette?: { bg: string; surface: string; accent: string; textPrimary: string }; motif?: string; screens?: unknown[] };

export default async function BuildWizardPage({ params }: { params: Promise<{ slug: string; idea: string }> }) {
  const me = await getSessionUser();
  if (!me || !me.isAdmin) notFound();
  const { slug, idea: ideaSlug } = await params;
  if (!isActiveCategory(slug)) notFound();
  const locale = await getLocale();
  const ru = locale !== "en";
  const lp = ru ? "/ru" : "/en";
  const niche = getNicheName(slug, locale);
  const idea = getIdea(ideaSlug);
  if (!niche || !idea || idea.category !== slug) notFound();

  const en = !ru ? ideaContentEn(ideaSlug, locale) : null;
  const s = scoreFor(ideaSlug, locale);
  const spec = (designSpecs as Record<string, Spec>)[ideaSlug];
  const design = buildDesignPrompt(ideaSlug);
  const code = buildCodePrompt(ideaSlug);

  // Pains: the idea's own demand quotes (RU overlay when present).
  const pains = (idea.reviewGrid ?? []).slice(0, 6).map((q) => ({ quote: (ru && q.quoteRu ? q.quoteRu : q.quote).slice(0, 220), app: q.app }));

  // ASO: baked niche search terms (33 niches) + idea title as the long-tail hint.
  const terms = ((asoTerms as Record<string, string[]>)[slug] ?? []).slice(0, 10);
  const rset = (RATING_BY_SLUG as Record<string, { apps?: { title: string; ratings?: number }[] }>)[slug];
  const competitors = [...(rset?.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0)).slice(0, 3).map((a) => ({ title: a.title, ratings: a.ratings || 0 }));
  const enTitle = ideaContentEn(ideaSlug, "en")?.title || idea.title;
  const namingHint = ru
    ? `Имя должно нести дифференциатор идеи, а не жанр: «${enTitle}». Жанровые слова (${terms.slice(0, 2).join(", ") || "как у топов"}) оставь для подзаголовка в сторе.`
    : `The name must carry the idea's differentiator, not the genre: "${enTitle}". Keep the genre words (${terms.slice(0, 2).join(", ") || "like the leaders"}) for the store subtitle.`;

  // Channels of the niche.
  type Ch = { name: string; note: string; count: number };
  const chRu = ((channelsData as Record<string, { channels?: Ch[] }>)[slug]?.channels ?? []).slice(0, 4);
  const chEn = ((channelsEn as Record<string, { channels?: { name: string; note: string }[] }>)[slug]?.channels ?? []);
  const channels = ru ? chRu : chRu.map((c, i) => ({ ...c, name: chEn[i]?.name ?? c.name, note: chEn[i]?.note ?? c.note }));

  const data: BuildData = {
    ideaSlug,
    ideaTitle: (en?.title || idea.title) as string,
    oneLiner: (en?.oneLiner || idea.oneLiner) as string,
    nicheName: niche,
    gap: (en?.gap || idea.gap) as string | undefined,
    pitch: (en?.pitch || idea.idea?.pitch) as string | undefined,
    features: (en?.features || idea.idea?.features || []) as string[],
    founder100: s?.founder != null ? Math.round((s.founder / 45) * 100) : undefined,
    pains,
    audience: { targetSegment: s?.targetSegment, whyPay: s?.whyPay, pricePoint: s?.pricePoint, founderWhy: s?.founderWhy },
    aso: { terms, competitors, namingHint },
    design: {
      hasSpec: !!spec,
      theme: spec?.theme,
      palette: spec?.palette,
      motif: spec?.motif,
      screens: spec?.screens?.length ?? 0,
      parts: design?.parts ?? [],
    },
    codePrompt: code ?? "",
    channels,
  };

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-28 pt-16 sm:px-6 sm:pt-20">
      <div className="mx-auto mb-8 flex max-w-[720px] items-center justify-between gap-3">
        <Link href={`${lp}/build/${slug}`} className="card-min inline-flex items-center gap-1.5 rounded-full py-2 pl-3 pr-4 text-footnote font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3.25 5.25 8 10 12.75" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          {niche}
        </Link>
        <span className="text-caption text-[var(--color-text-tertiary)]">{ru ? "прототип · админ" : "prototype · admin"}</span>
      </div>
      <div className="mx-auto mb-10 max-w-[720px]">
        <h1 className="text-title1 text-balance text-[var(--color-text-primary)]">{data.ideaTitle}</h1>
        <p className="mt-3 max-w-[58ch] text-lead text-pretty text-[var(--color-text-secondary)]">{data.oneLiner}</p>
      </div>
      <BuildWizard data={data} locale={locale} />
    </main>
  );
}
