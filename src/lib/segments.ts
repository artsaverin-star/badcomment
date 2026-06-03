import segmentsData from "@/data/segments.json";
import type { Locale } from "./i18n";

// A market "genre": a hand-authored cluster of apps that compete in the same
// niche, with a read on its pricing, audience and shared problems. Authored in
// src/data/segments.json the same way card summaries are — membership is an
// explicit list of product ids (FeedCard.id). Add a genre by appending an
// object; everything downstream keys off `slug`.
type SegmentProse = {
  name: string;
  pricing: string;
  audience: string;
  problems: string[];
};

type RawSegment = {
  slug: string;
  appIds: string[];
  ru: SegmentProse;
  en: SegmentProse;
};

export type Segment = { slug: string; appIds: string[] } & SegmentProse;

const SEGMENTS = segmentsData as RawSegment[];

function resolve(s: RawSegment, locale: Locale): Segment {
  return { slug: s.slug, appIds: s.appIds, ...(locale === "ru" ? s.ru : s.en) };
}

export function getSegments(locale: Locale): Segment[] {
  return SEGMENTS.map((s) => resolve(s, locale));
}

export function getSegmentBySlug(slug: string, locale: Locale): Segment | null {
  const s = SEGMENTS.find((x) => x.slug === slug);
  return s ? resolve(s, locale) : null;
}

// Member id set for filtering the feed by genre. Null when the slug is unknown,
// so callers can treat "no such segment" the same as "no filter".
export function getSegmentMemberIds(slug: string): Set<string> | null {
  const s = SEGMENTS.find((x) => x.slug === slug);
  return s ? new Set(s.appIds) : null;
}
