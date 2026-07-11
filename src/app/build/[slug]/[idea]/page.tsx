import { notFound } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { isActiveCategory } from "@/lib/categoryVisibility";
import { getNicheName, appSlugify } from "@/lib/ratingAppSlug";
import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import { buildDesignPrompt, buildScreenPrompts } from "@/lib/designPrompt";
import { buildCodePrompt } from "@/lib/codePrompt";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import designSpecs from "@/data/designSpecs.json";
import asoTerms from "@/data/asoTerms.json";
import asoLive from "@/data/asoLive.json";
import buildCopy from "@/data/buildCopy.json";
import channelsData from "@/data/channels.json";
import { DOSSIER_BY_SLUG } from "@/data/dossier";
import dossierEn from "@/data/dossier.en.json";
import personaCovers from "@/data/personaCovers.json";
import ideaCovers from "@/data/ideaCovers.json";
import channelsEn from "@/data/channels.en.json";
import BuildWizard, { type BuildData } from "@/components/BuildWizard";

export const dynamic = "force-dynamic";

// The builder wizard, steps 3-7 (solution → plan). Every artifact is
// assembled server-side from existing catalog data — no runtime LLM.

type Spec = { theme?: string; palette?: { bg: string; surface: string; accent: string; textPrimary: string }; motif?: string; screens?: unknown[] };
type Copy = { pain?: string; painEn?: string; painTitle?: string; painTitleEn?: string; buyer?: string; pay?: string; risk?: string };
type LiveTerm = { term: string; hintRank: number | null; median: number; min: number; top: { title: string; ratings: number }[] };
type RApp = { title: string; icon?: string | null; ratings?: number; realScore?: number; weak?: string; verdict?: string; loved?: string; shots?: string[]; en?: { weak?: string; verdict?: string; loved?: string } };

const firstSentence = (t?: string) => {
  if (!t) return "";
  const m = t.match(/^.*?[.!?…](\s|$)/);
  return (m ? m[0] : t).trim();
};

export default async function BuildWizardPage({ params }: { params: Promise<{ slug: string; idea: string }> }) {
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
  const screenPrompts = buildScreenPrompts(ideaSlug);
  const code = buildCodePrompt(ideaSlug);
  const copy = (buildCopy as Record<string, Copy>)[ideaSlug];

  // The chosen pain: authored line from the corpus + the strongest real quote.
  const painLine = (ru ? copy?.pain : copy?.painEn) || firstSentence((en?.gap || idea.gap) as string) || (en?.oneLiner || idea.oneLiner);
  const q0 = (idea.reviewGrid ?? [])[0];
  const painQuote = q0 ? { quote: (ru && q0.quoteRu ? q0.quoteRu : q0.quote).slice(0, 220), app: q0.app } : undefined;

  // Competitors: the niche's top apps by rating mass, with their weak spots.
  const rset = (RATING_BY_SLUG as Record<string, { apps?: RApp[] }>)[slug];
  const topApps = [...(rset?.apps ?? [])].sort((a, b) => (b.ratings || 0) - (a.ratings || 0));
  const competitors = topApps.slice(0, 3).map((a) => ({
    title: a.title,
    icon: a.icon ?? null,
    ratings: a.ratings || 0,
    realScore: a.realScore,
    weak: (ru ? a.weak : a.en?.weak || a.weak) || "",
    verdict: (ru ? a.verdict : a.en?.verdict || a.verdict) || "",
    loved: (ru ? a.loved : a.en?.loved || a.loved) || "",
    shots: (a.shots ?? []).slice(0, 4),
    href: `${lp}/rating/${slug}/${appSlugify(a.title)}`,
  }));

  // ASO: baked niche terms + live App Store signals (autocomplete rank and
  // how occupied the top-10 is per query).
  const terms = ((asoTerms as Record<string, string[]>)[slug] ?? []).slice(0, 10);
  const live = ((asoLive as Record<string, { terms?: LiveTerm[] }>)[slug]?.terms ?? []).slice(0, 8);
  const enTitle = ideaContentEn(ideaSlug, "en")?.title || idea.title;
  const namingHint = ru
    ? `Имя должно нести дифференциатор идеи, а не жанр: «${enTitle}». Жанровые слова (${terms.slice(0, 2).join(", ") || "как у топов"}) оставь для подзаголовка в сторе.`
    : `The name must carry the idea's differentiator, not the genre: "${enTitle}". Keep the genre words (${terms.slice(0, 2).join(", ") || "like the leaders"}) for the store subtitle.`;

  // Audience segments of the niche (from the dossier), with sketch covers.
  type Seg = { name: string; job: string; payLevel: string };
  const dsr = (DOSSIER_BY_SLUG as Record<string, { audience?: { segments?: Seg[] } }>)[slug];
  const dsrEn = (dossierEn as Record<string, { audience?: { segments?: Seg[] } }>)[slug];
  const crowdBase = (dsr?.audience?.segments ?? []).map((sg, i) => {
    const e = dsrEn?.audience?.segments?.[i];
    return {
      name: (ru ? sg.name : e?.name || sg.name),
      job: (ru ? sg.job : e?.job || sg.job),
      payLevel: (ru ? sg.payLevel : e?.payLevel || sg.payLevel),
      cover: (personaCovers as Record<string, string>)[`${slug}-${i}`],
    };
  });
  // Highlight the segment the idea aims at: word overlap between the idea's
  // payer/title and the segment's name/job (RU corpus shares the vocabulary).
  const words = (t: string) => new Set(t.toLowerCase().replace(/ё/g, "е").split(/[^a-zа-я0-9]+/).filter((w) => w.length > 3));
  const buyerWords = words(`${copy?.buyer ?? ""} ${s?.targetSegment ?? ""} ${idea.title}`);
  let targetIdx = -1;
  let targetScore = 0;
  crowdBase.forEach((c, i) => {
    let sc = 0;
    for (const w of words(`${c.name} ${c.job}`)) if (buyerWords.has(w)) sc++;
    if (sc > targetScore) { targetScore = sc; targetIdx = i; }
  });
  const crowd = crowdBase.map((c, i) => ({ ...c, target: i === targetIdx && targetScore >= 1 }));

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
    nicheSlug: slug,
    hrefBack: `${lp}/build/${slug}`,
    hrefNiches: `${lp}/build`,
    painLine,
    painTitle: (ru ? copy?.painTitle : copy?.painTitleEn) || undefined,
    painQuote,
    ideaCover: (ideaCovers as Record<string, string>)[ideaSlug],
    crowd,
    pitch: (en?.pitch || idea.idea?.pitch) as string | undefined,
    features: (en?.features || idea.idea?.features || []) as string[],
    founder100: s?.founder != null ? Math.round((s.founder / 45) * 100) : undefined,
    buyer: (ru ? copy?.buyer : undefined) || s?.targetSegment,
    pay: (ru ? copy?.pay : undefined) || s?.whyPay,
    // Never show the English rationale on the RU locale: authored RU or nothing.
    risk: ru ? copy?.risk : s?.founderWhy,
    pricePoint: s?.pricePoint,
    competitors,
    aso: { terms, live, namingHint },
    design: {
      hasSpec: !!spec,
      theme: spec?.theme,
      palette: spec?.palette,
      motif: spec?.motif,
      screens: screenPrompts?.length ?? spec?.screens?.length ?? 0,
      parts: screenPrompts ? screenPrompts.map((x) => x.prompt) : design?.parts ?? [],
      screenTitles: screenPrompts ? screenPrompts.map((x) => x.title) : [],
    },
    codePrompt: code ?? "",
    channels,
  };

  return (
    <main className="mx-auto w-full max-w-[880px] px-4 pb-28 pt-4 sm:px-6 sm:pt-6">
      <BuildWizard data={data} locale={locale} />
    </main>
  );
}
