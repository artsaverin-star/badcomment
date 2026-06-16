import segCards from "@/data/segment-cards.json";
import appCards from "@/data/app-cards.json";
import ideaCards from "@/data/idea-cards.json";
import segCardsEn from "@/data/segment-cards.en.json";
import appCardsEn from "@/data/app-cards.en.json";
import ideaCardsEn from "@/data/idea-cards.en.json";
import descriptionsEn from "@/data/descriptions.en.json";
import ideasContentEn from "@/data/ideas-content.en.json";
import type { Evidence } from "@/components/InsightCard";
import type { Locale } from "./i18n";

// Regenerated, share-worthy insight cards (built offline by the regen workflow +
// scripts/regen-assemble.mjs). When a slug/productId is present here the page
// renders these; otherwise it falls back to the original synthesis.
//
// English: *.en.json overlays carry ONLY translated text (title/plus/minus), in
// the same order/length as the RU cards. The loaders merge that text onto the RU
// card so evidence (already-English review quotes), counts and apps are reused.

export type RegenCard = {
  title: string;
  body?: string;
  plus?: string;
  minus?: string;
  count: number;
  apps?: string[];
  kicker?: string;
  evidence: Evidence[];
};
export type RegenSet = { product: RegenCard[]; hygiene: RegenCard[] };

type TextCard = { title?: string; plus?: string; minus?: string; body?: string };
type TextSet = { product?: TextCard[]; hygiene?: TextCard[] };

const RU_SEG = segCards as unknown as Record<string, RegenSet>;
const RU_APP = appCards as unknown as Record<string, RegenSet>;
const EN_SEG = segCardsEn as unknown as Record<string, TextSet>;
const EN_APP = appCardsEn as unknown as Record<string, TextSet>;

// Overlay translated text onto the RU card by index (keeps count/apps/evidence).
function mergeText(ru: RegenCard, en?: TextCard): RegenCard {
  if (!en) return ru;
  return {
    ...ru,
    title: en.title?.trim() || ru.title,
    plus: en.plus?.trim() || ru.plus,
    minus: en.minus?.trim() || ru.minus,
    body: en.body?.trim() || ru.body,
  };
}
function mergeSet(ru: RegenSet, en?: TextSet): RegenSet {
  if (!en) return ru;
  return {
    product: ru.product.map((c, i) => mergeText(c, en.product?.[i])),
    hygiene: ru.hygiene.map((c, i) => mergeText(c, en.hygiene?.[i])),
  };
}

export function categoryCards(slug: string, locale: Locale = "ru"): RegenSet | null {
  const ru = RU_SEG[slug];
  if (!ru) return null;
  return locale === "en" ? mergeSet(ru, EN_SEG[slug]) : ru;
}
export function appCardsFor(productId: string, locale: Locale = "ru"): RegenSet | null {
  const ru = RU_APP[productId];
  if (!ru) return null;
  return locale === "en" ? mergeSet(ru, EN_APP[productId]) : ru;
}
export function ideaCard(slug: string, locale: Locale = "ru"): { title?: string; oneLiner?: string } | null {
  const ru = (ideaCards as Record<string, { title?: string; oneLiner?: string }>)[slug] ?? null;
  if (locale === "en") {
    const en = (ideaCardsEn as Record<string, { title?: string; oneLiner?: string }>)[slug];
    if (en) return { title: en.title || ru?.title, oneLiner: en.oneLiner || ru?.oneLiner };
  }
  return ru;
}

// English app description override (under the app title). Falls back to RU.
export function descriptionFor(productId: string, locale: Locale, ruDescription?: string): string | undefined {
  if (locale === "en") {
    const en = (descriptionsEn as Record<string, string>)[productId];
    if (en) return en;
  }
  return ruDescription;
}

// English body of an idea (gap → pitch → features → mechanisms), keyed by idea
// slug. Returns null in RU or when no translation exists, so the page keeps RU.
export type IdeaContentEn = {
  title?: string;
  oneLiner?: string;
  gap?: string;
  pitch?: string;
  features?: string[];
  antiFeatures?: string[];
  monetization?: string;
  categoryName?: string;
  mechanisms?: string[]; // translated mechanism titles, in order
};
export function ideaContentEn(slug: string, locale: Locale): IdeaContentEn | null {
  if (locale !== "en") return null;
  return (ideasContentEn as Record<string, IdeaContentEn>)[slug] ?? null;
}
