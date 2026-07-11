import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";
import { scoreFor } from "@/lib/ideaScores";
import designSpecs from "@/data/designSpecs.json";

// The builder-path code prompt: a paste-into-Cursor/Claude starter brief that
// scaffolds the idea's MVP. Assembled deterministically from the idea payload
// and (when present) the studio design spec — no runtime LLM. English, like
// the design prompts: coding agents follow English best.

type DesignSpec = {
  territory?: string;
  theme?: string;
  palette?: { bg: string; surface: string; textPrimary: string; textSecondary: string; accent: string };
  typography?: string;
  motif?: string;
  ia?: { coreObject: string; primaryLoop: string; tabs: string[] };
  screens?: { title: string; purpose: string; hero: string; data: string }[];
};
const SPECS = designSpecs as Record<string, DesignSpec>;

export function buildCodePrompt(slug: string): string | null {
  const idea = getIdea(slug);
  if (!idea) return null;
  const en = ideaContentEn(slug, "en");
  const title = en?.title ?? idea.title;
  const oneLiner = en?.oneLiner ?? idea.oneLiner;
  const pitch = en?.pitch ?? idea.idea?.pitch;
  const features: string[] = en?.features ?? idea.idea?.features ?? [];
  const antiFeatures: string[] = en?.antiFeatures ?? idea.idea?.antiFeatures ?? [];
  const monetization = en?.monetization ?? idea.idea?.monetization;
  const score = scoreFor(slug, "en");
  const spec = SPECS[slug];

  const screens = spec?.screens?.length
    ? spec.screens.map((s, i) => `${i + 1}. ${s.title} — ${s.purpose} Hero element: ${s.hero}. Show: ${s.data}`)
    : [
        `1. Onboarding (max 2 steps): the promise "${oneLiner}" and only the truly needed permissions`,
        `2. Main screen: the product's central object mid-use with believable data`,
        ...features.map((f, i) => `${i + 3}. A screen for: ${f}`),
        `${features.length + 3}. Paywall: ${monetization ?? "one-time purchase"}`,
        `${features.length + 4}. First-launch empty state with one obvious next step`,
        `${features.length + 5}. Settings`,
      ];

  return [
    `You are a senior mobile engineer. Scaffold a production-quality MVP of the iOS app "${title}".`,
    ``,
    `THE PRODUCT`,
    `${oneLiner}${pitch ? ` ${pitch}` : ""}`,
    score?.targetSegment ? `Audience: ${score.targetSegment}.${score.whyPay ? ` Why they pay: ${score.whyPay}` : ""}` : "",
    ``,
    `STACK (use exactly this unless the user overrides):`,
    `- SwiftUI, iOS 17+, MVVM, SwiftData for local persistence`,
    `- No backend for v1: everything on-device${monetization?.toLowerCase().includes("подписк") || monetization?.toLowerCase().includes("subscription") ? ", StoreKit 2 subscription" : ", StoreKit 2 one-time purchase"}`,
    `- No analytics SDKs, no ads, no tracking in v1`,
    ``,
    spec?.ia ? `INFORMATION ARCHITECTURE\n- Core object: ${spec.ia.coreObject}\n- Primary loop: ${spec.ia.primaryLoop}\n- Tab bar: ${spec.ia.tabs.join(" · ")}` : "",
    ``,
    `SCREENS (build in this order, each must compile before the next):`,
    ...screens,
    ``,
    spec?.palette ? `DESIGN TOKENS (from the studio spec, apply globally):\n- Theme ${spec.theme}, background ${spec.palette.bg}, surface ${spec.palette.surface}, text ${spec.palette.textPrimary}/${spec.palette.textSecondary}, single accent ${spec.palette.accent}\n- Typography: ${spec.typography ?? "SF Pro"}\n- Visual motif to honor: ${spec.motif ?? ""}` : "",
    ``,
    `MONETIZATION`,
    `${monetization ?? "One-time purchase instead of a subscription."} Implement the paywall honestly: price visible, restore purchase present, no dark patterns.`,
    ``,
    antiFeatures.length ? `WHAT THIS PRODUCT DELIBERATELY DOES NOT DO (do not build these):\n${antiFeatures.map((a) => `- ${a}`).join("\n")}` : "",
    ``,
    `WORKING RULES`,
    `- Start with the data model + the main screen. Ship one vertical slice, then expand screen by screen.`,
    `- Sample data must be believable for the audience, no lorem ipsum.`,
    `- After each screen: state what was built, what is next and one open question if any.`,
  ].filter(Boolean).join("\n");
}
