import { prisma } from "./prisma";
import { getSegmentBySlug } from "./segments";
import { getTaxonomy, taxonomyVersion, TAXONOMIES, type ClassNeed, type GenreTaxonomy } from "./taxonomy";
import type { Locale } from "./i18n";

// How well a genre serves each authored need, scored from reviews classified by
// MEANING (Review.needs — see taxonomy.ts / apply-classify.ts), not keywords.
//
// The honest signal is complaint *breadth*: with hundreds of reviews per app, a
// theme shows up somewhere for almost everyone, so raw counts mean little.
// Instead we ask, per app, which needs are its *top* complaints (relative to its
// own complaint mix), then count how many apps share each as a top pain. A need
// that's a top complaint across most of the genre is an open gap nobody closes.
//
// Only PAIN labels count — there is no "who closes it best" verdict. Praise is a
// manipulable sample (a positive review is easy to plant), so it is never a
// signal here: the page measures where every app fails, full stop.

export type NeedAppStat = {
  id: string;
  name: string;
  icon: string | null;
  complaints: number;
  sharePct: number; // complaints on this need / app's classified reviews
  forks: NeedForkStat[]; // which sub-threads this app hits, as tags (raw text lives in the popup)
};

// A sub-thread inside a need (a taxonomy fork), with how many reviews hit it.
// Forks are shown explicitly, never collapsed into the parent need.
export type NeedForkStat = { key: string; label: string; mentions: number };

// One real review behind a need's number, with the exact verbatim phrase the
// classifier quoted (the trigger). The popup shows these so every count is
// auditable: no number on screen exists without the reviews under it.
export type NeedEvidence = {
  app: string;
  icon: string | null;
  rating: number;
  title: string | null;
  text: string;
  match: string;
  fork: string; // localized label of the sub-thread this review was filed under (for in-popup filtering)
};

export type NeedGap = {
  key: string;
  label: string;
  complaintMentions: number;
  failApps: number; // apps where this is a top complaint
  totalApps: number; // apps with any classified reviews
  verdict: "open" | "narrow" | "thin";
  forks: NeedForkStat[];
  apps: NeedAppStat[];
  evidence: NeedEvidence[]; // real reviews behind the count, capped for the popup
};

export type NeedsGapView = {
  slug: string;
  needs: NeedGap[];
  maxFail: number;
  reviewsScanned: number;
};

type StoredLabel = { key: string; stance: string; confidence: number; trigger: string };

const REVIEWS_PER_APP = 600;
const TOP_NEEDS_PER_APP = 3; // a need ranking this high in an app counts as a top pain
const THIN_FAIL = 2; // fewer than this many apps failing = not enough signal
const OPEN_BREADTH = 0.4; // top pain in >= 40% of the genre = genre-wide gap
const EVIDENCE_PER_APP = 3; // reviews kept per app per need, so the popup spans the genre
const EVIDENCE_CAP = 48; // total reviews shown in the popup per need

// Reviews are shown in full — a clipped complaint is a half-told one. We only
// collapse runs of whitespace so the verbatim quote reads as one clean block.
function trimQuote(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// The sub-thread label a review is filed under: the fork's own label, or a
// catch-all bucket when the review only hit the bare need (no fork). The
// catch-all lets the displayed tags partition the reviews and sum to the
// headline without inventing a sub-problem that the classifier didn't assign.
function forkLabelOf(need: ClassNeed, key: string, locale: Locale): string {
  const f = need.forks.find((f) => f.key === key);
  if (f) return locale === "ru" ? f.ru : f.en;
  return locale === "ru" ? "Прочее" : "Other";
}

export async function getNeedsGap(slug: string, locale: Locale): Promise<NeedsGapView | null> {
  const segment = getSegmentBySlug(slug, locale);
  const taxonomy = getTaxonomy(slug);
  if (!segment || !taxonomy) return null;

  const version = taxonomyVersion(slug);
  const needs = taxonomy.needs;
  const label = (n: ClassNeed) => (locale === "ru" ? n.ru : n.en);

  // Every emittable key (bare need + forks) maps back to its need's index.
  const keyToNeed = new Map<string, number>();
  needs.forEach((n, i) => {
    keyToNeed.set(n.key, i);
    for (const f of n.forks) keyToNeed.set(f.key, i);
  });

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: {
      id: true,
      name: true,
      icon: true,
      listings: {
        select: {
          reviews: {
            where: { needsVersion: version },
            select: { needs: true, text: true, rating: true, title: true },
            take: REVIEWS_PER_APP,
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });

  const perNeed: Map<string, NeedAppStat>[] = needs.map(() => new Map());
  const evidencePerNeed: NeedEvidence[][] = needs.map(() => []);
  const forkCounts: Map<string, number>[] = needs.map(() => new Map()); // fork key -> reviews hitting it
  const failApps = needs.map(() => 0);
  let reviewsScanned = 0;
  let totalApps = 0;

  for (const p of products) {
    const reviews = p.listings.flatMap((l) => l.reviews);
    const total = reviews.length;
    if (total === 0) continue;
    totalApps++;
    reviewsScanned += total;

    const appComplaints = needs.map(() => 0);
    const appForks: Map<string, number>[] = needs.map(() => new Map());
    const appEvidence = needs.map(() => 0);
    // Reviews are often stored verbatim under several ids. The same complaint
    // text is one complaint: dedupe by text so it neither inflates the count nor
    // shows up twice in the popup (otherwise "2 reviews" could open to just 1).
    const appSeen: Set<string>[] = needs.map(() => new Set());

    for (const r of reviews) {
      let labels: StoredLabel[];
      try {
        labels = JSON.parse(r.needs || "[]");
      } catch {
        continue;
      }

      // Per review, per need: file the review under its SINGLE strongest label
      // (highest confidence). One review counts once toward a need, and lands in
      // exactly one sub-thread bucket — so the fork tags partition the reviews
      // and sum to the headline instead of double-counting overlaps.
      const topPerNeed = new Map<number, StoredLabel>();
      for (const l of labels) {
        if (l.stance !== "pain") continue;
        const ni = keyToNeed.get(l.key);
        if (ni === undefined) continue;
        const cur = topPerNeed.get(ni);
        if (!cur || l.confidence > cur.confidence) topPerNeed.set(ni, l);
      }

      for (const [ni, top] of topPerNeed) {
        const clean = r.text.trim();
        const dedupeKey = clean.toLowerCase().replace(/\s+/g, " ");
        const dedupable = clean.length > 12;
        if (dedupable && appSeen[ni].has(dedupeKey)) continue; // verbatim duplicate: already counted
        if (dedupable) appSeen[ni].add(dedupeKey);

        appComplaints[ni]++;
        forkCounts[ni].set(top.key, (forkCounts[ni].get(top.key) ?? 0) + 1);
        appForks[ni].set(top.key, (appForks[ni].get(top.key) ?? 0) + 1);
        if (dedupable && appEvidence[ni] < EVIDENCE_PER_APP) {
          appEvidence[ni]++;
          evidencePerNeed[ni].push({
            app: p.name,
            icon: p.icon,
            rating: r.rating,
            title: r.title?.trim() || null,
            text: trimQuote(clean),
            match: top.trigger,
            fork: forkLabelOf(needs[ni], top.key, locale),
          });
        }
      }
    }

    // This app's top pains: highest-complaint needs, relative to its own mix.
    const ranked = appComplaints
      .map((c, i) => ({ i, c }))
      .filter((x) => x.c > 0)
      .sort((a, b) => b.c - a.c)
      .slice(0, TOP_NEEDS_PER_APP);
    for (const x of ranked) failApps[x.i]++;

    for (let i = 0; i < needs.length; i++) {
      if (appComplaints[i] > 0) {
        // Forkless needs show no sub-thread tags; forked needs show every bucket
        // (incl. the "Прочее"/"Other" catch-all) so the tags sum to the count.
        const appForkStats: NeedForkStat[] = [];
        if (needs[i].forks.length > 0) {
          for (const [k, c] of appForks[i]) {
            appForkStats.push({ key: k, label: forkLabelOf(needs[i], k, locale), mentions: c });
          }
          appForkStats.sort((a, b) => b.mentions - a.mentions);
        }
        perNeed[i].set(p.id, {
          id: p.id,
          name: p.name,
          icon: p.icon,
          complaints: appComplaints[i],
          sharePct: Math.round((appComplaints[i] / total) * 100),
          forks: appForkStats,
        });
      }
    }
  }

  const gaps: NeedGap[] = needs.map((n, i) => {
    const apps = [...perNeed[i].values()].sort((a, b) => b.complaints - a.complaints);
    const complaintMentions = apps.reduce((s, a) => s + a.complaints, 0);

    const forks: NeedForkStat[] = [];
    if (n.forks.length > 0) {
      for (const [k, c] of forkCounts[i]) {
        forks.push({ key: k, label: forkLabelOf(n, k, locale), mentions: c });
      }
      forks.sort((a, b) => b.mentions - a.mentions);
    }

    const breadth = totalApps ? failApps[i] / totalApps : 0;
    const verdict: NeedGap["verdict"] =
      failApps[i] < THIN_FAIL ? "thin" : breadth >= OPEN_BREADTH ? "open" : "narrow";

    return {
      key: n.key,
      label: label(n),
      complaintMentions,
      failApps: failApps[i],
      totalApps,
      verdict,
      forks,
      apps,
      evidence: evidencePerNeed[i].slice(0, EVIDENCE_CAP),
    };
  });

  // Gaps first: the most widely-shared pains float to the top.
  gaps.sort((a, b) => b.failApps - a.failApps || b.complaintMentions - a.complaintMentions);

  const maxFail = Math.max(1, ...gaps.map((g) => g.failApps));

  return {
    slug,
    needs: gaps,
    maxFail,
    reviewsScanned,
  };
}

// ── Per-app semantic needs (product detail page) ──────────────────────────────
// The single-app cousin of getNeedsGap: instead of breadth across a genre, it
// just ranks an app's own pains by how many of its reviews hit each need. Same
// pain-only, verbatim-trigger evidence — every count opens to the real reviews.

export type AppNeed = {
  key: string;
  label: string;
  mentions: number;
  forks: NeedForkStat[];
  evidence: NeedEvidence[];
};

export type AppNeedsView = {
  needs: AppNeed[];
  maxMentions: number;
  reviewsClassified: number;
};

const APP_EVIDENCE_CAP = 24;

export async function getAppNeeds(productId: string, locale: Locale): Promise<AppNeedsView | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      listings: {
        select: {
          reviews: {
            where: { needsVersion: { not: null } },
            select: { needs: true, needsVersion: true, text: true, rating: true, title: true },
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });
  if (!product) return null;

  const reviews = product.listings.flatMap((l) => l.reviews);
  if (reviews.length === 0) return null;

  // Pick the taxonomy from the version stamped on the app's reviews.
  const version = reviews.find((r) => r.needsVersion)?.needsVersion;
  const taxonomy: GenreTaxonomy | undefined = Object.values(TAXONOMIES).find((t) => t.version === version);
  if (!taxonomy) return null;

  const needs = taxonomy.needs;
  const label = (n: ClassNeed) => (locale === "ru" ? n.ru : n.en);
  const keyToNeed = new Map<string, number>();
  needs.forEach((n, i) => {
    keyToNeed.set(n.key, i);
    for (const f of n.forks) keyToNeed.set(f.key, i);
  });

  const mentions = needs.map(() => 0);
  const forkCounts: Map<string, number>[] = needs.map(() => new Map());
  const evidence: NeedEvidence[][] = needs.map(() => []);
  const evidenceSeen: Set<string>[] = needs.map(() => new Set()); // dedupe verbatim duplicate reviews
  let reviewsClassified = 0;

  for (const r of reviews) {
    if (r.needsVersion !== version) continue;
    let labels: StoredLabel[];
    try {
      labels = JSON.parse(r.needs || "[]");
    } catch {
      continue;
    }
    reviewsClassified++;

    // File each review under its single strongest label per need (see getNeedsGap):
    // one count per need, one sub-thread bucket, so tags sum to the headline.
    const topPerNeed = new Map<number, StoredLabel>();
    for (const l of labels) {
      if (l.stance !== "pain") continue;
      const ni = keyToNeed.get(l.key);
      if (ni === undefined) continue;
      const cur = topPerNeed.get(ni);
      if (!cur || l.confidence > cur.confidence) topPerNeed.set(ni, l);
    }

    for (const [ni, top] of topPerNeed) {
      const clean = r.text.trim();
      const dedupeKey = clean.toLowerCase().replace(/\s+/g, " ");
      const dedupable = clean.length > 12;
      if (dedupable && evidenceSeen[ni].has(dedupeKey)) continue; // verbatim duplicate: count once
      if (dedupable) evidenceSeen[ni].add(dedupeKey);

      mentions[ni]++;
      forkCounts[ni].set(top.key, (forkCounts[ni].get(top.key) ?? 0) + 1);
      if (dedupable && evidence[ni].length < APP_EVIDENCE_CAP) {
        evidence[ni].push({
          app: "",
          icon: null,
          rating: r.rating,
          title: r.title?.trim() || null,
          text: trimQuote(clean),
          match: top.trigger,
          fork: forkLabelOf(needs[ni], top.key, locale),
        });
      }
    }
  }

  const appNeeds: AppNeed[] = needs
    .map((n, i): AppNeed => {
      const forks: NeedForkStat[] = [];
      if (n.forks.length > 0) {
        for (const [k, c] of forkCounts[i]) {
          forks.push({ key: k, label: forkLabelOf(n, k, locale), mentions: c });
        }
        forks.sort((a, b) => b.mentions - a.mentions);
      }
      return { key: n.key, label: label(n), mentions: mentions[i], forks, evidence: evidence[i] };
    })
    .filter((n) => n.mentions > 0)
    .sort((a, b) => b.mentions - a.mentions);

  if (appNeeds.length === 0) return null;

  return {
    needs: appNeeds,
    maxMentions: Math.max(1, ...appNeeds.map((n) => n.mentions)),
    reviewsClassified,
  };
}
