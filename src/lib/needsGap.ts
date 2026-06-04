import { prisma } from "./prisma";
import { getSegmentBySlug } from "./segments";
import { getTaxonomy, taxonomyVersion, type ClassNeed } from "./taxonomy";
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
  quotes: string[];
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
const QUOTE_MAX = 220;
const TOP_NEEDS_PER_APP = 3; // a need ranking this high in an app counts as a top pain
const THIN_FAIL = 2; // fewer than this many apps failing = not enough signal
const OPEN_BREADTH = 0.4; // top pain in >= 40% of the genre = genre-wide gap
const EVIDENCE_PER_APP = 3; // reviews kept per app per need, so the popup spans the genre
const EVIDENCE_CAP = 48; // total reviews shown in the popup per need

function trimQuote(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > QUOTE_MAX ? t.slice(0, QUOTE_MAX - 1).trimEnd() + "…" : t;
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
    const appQuotes: string[][] = needs.map(() => []);
    const appEvidence = needs.map(() => 0);

    for (const r of reviews) {
      let labels: StoredLabel[];
      try {
        labels = JSON.parse(r.needs || "[]");
      } catch {
        continue;
      }

      // Per review: which needs it complains about (first trigger per need), and
      // the distinct fork keys it hit (each counted once per review).
      const hitNeed = new Map<number, string>();
      const hitFork = new Set<string>();
      for (const l of labels) {
        if (l.stance !== "pain") continue;
        const ni = keyToNeed.get(l.key);
        if (ni === undefined) continue;
        if (!hitNeed.has(ni)) hitNeed.set(ni, l.trigger);
        hitFork.add(l.key);
      }

      for (const k of hitFork) {
        const ni = keyToNeed.get(k)!;
        // Only forks are sub-threads; a bare-need hit is the need itself.
        if (k !== needs[ni].key) forkCounts[ni].set(k, (forkCounts[ni].get(k) ?? 0) + 1);
      }

      for (const [ni, trigger] of hitNeed) {
        appComplaints[ni]++;
        const clean = r.text.trim();
        if (clean.length > 12) {
          if (appQuotes[ni].length < 2) appQuotes[ni].push(trimQuote(clean));
          if (appEvidence[ni] < EVIDENCE_PER_APP) {
            appEvidence[ni]++;
            evidencePerNeed[ni].push({
              app: p.name,
              icon: p.icon,
              rating: r.rating,
              title: r.title?.trim() || null,
              text: trimQuote(clean),
              match: trigger,
            });
          }
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
        perNeed[i].set(p.id, {
          id: p.id,
          name: p.name,
          icon: p.icon,
          complaints: appComplaints[i],
          sharePct: Math.round((appComplaints[i] / total) * 100),
          quotes: appQuotes[i],
        });
      }
    }
  }

  const gaps: NeedGap[] = needs.map((n, i) => {
    const apps = [...perNeed[i].values()].sort((a, b) => b.complaints - a.complaints);
    const complaintMentions = apps.reduce((s, a) => s + a.complaints, 0);

    const forks: NeedForkStat[] = [];
    for (const [k, c] of forkCounts[i]) {
      const f = n.forks.find((f) => f.key === k);
      forks.push({ key: k, label: f ? (locale === "ru" ? f.ru : f.en) : k, mentions: c });
    }
    forks.sort((a, b) => b.mentions - a.mentions);

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
