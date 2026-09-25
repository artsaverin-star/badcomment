// Contract of content/v2/pulse-demand.json (schemaVersion 1), written only by
// app_04_inapp/Tools/pulse-demand/build.py --site (a byte-identical copy of its
// out/pulse-demand.json; Pulse is site-only, the iOS app does not ship it).
// Spec: app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md.
// Server-only data: evidence quotes are gated per category (getViewer().canReadResearch) and
// must never reach a client component.

export const PULSE_LANGS = ["ru", "en", "de", "fr", "ja"] as const;
export type PulseLang = (typeof PULSE_LANGS)[number];
export type PulseText = Record<PulseLang, string>;

/** "request" — people ask for a missing capability; "pain" — something breaks or blocks a job. */
export type PulseKind = "request" | "pain";
export const PULSE_KINDS: readonly PulseKind[] = ["request", "pain"];

export type PulseEvidence = {
  /** sha256 of app|rating|normalized text. */
  id: string;
  appId: string;
  appName: string;
  rating: number;
  /** Original review text (English). */
  quote: string;
  /** Russian translation; may be empty. */
  quoteRu: string;
};

export type PulseTopApp = { id: string; name: string; count: number };

export type PulseNeed = {
  /** "<category>--<slug>": URL-safe, no colons. */
  id: string;
  categoryId: string;
  kind: PulseKind;
  /** Order inside the category (1 = strongest). */
  rank: number;
  /** «Боль 7/10»: integer 1..10 (see source.score). */
  score: number;
  title: PulseText;
  summary: PulseText;
  reviewCount: number;
  appCount: number;
  categoryAppCount: number;
  categoryReviewCount: number;
  /** reviewCount / categoryReviewCount, rounded to 6 digits. */
  share: number;
  /** 1★..5★ */
  ratingCounts: [number, number, number, number, number];
  /** Hand-checked share of correct matches; null when nothing was sampled. */
  precision: number | null;
  precisionSample: number;
  topApps: PulseTopApp[];
  evidence: PulseEvidence[];
};

export type PulseCategory = {
  id: string;
  name: { ru: string; en: string } & Partial<Record<PulseLang, string>>;
  reviewCount: number;
  appCount: number;
  needCount: number;
};

export type PulseScoreParams = {
  shareFloor: number;
  shareCeil: number;
  shareWeight: number;
  breadthWeight: number;
  volumeFloor: number;
  volumeCeil: number;
  volumeWeight: number;
  formula?: string;
};

export type PulseSource = {
  reviewCount: number;
  appCount: number;
  categoryCount: number;
  needCount: number;
  sample?: string;
  countingUnit?: string;
  fingerprint?: string;
  publishRule?: Record<string, number>;
  score: PulseScoreParams;
  /** true only in a development build (needs without an independent verification). */
  unverifiedIncluded?: boolean;
};

export type PulseDemand = {
  schemaVersion: 1;
  generatedAt: string;
  source: PulseSource;
  /** Categories that have at least one need. */
  categories: PulseCategory[];
  /** Global feed order: score desc, then share desc. */
  needs: PulseNeed[];
};
