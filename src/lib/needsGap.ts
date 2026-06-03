import { prisma } from "./prisma";
import { getSegmentBySlug } from "./segments";
import { resolveNeeds, resolveWhitespace } from "./needs";
import type { Locale } from "./i18n";

// How well a genre serves each of its authored "needs", scored from real reviews.
//
// The honest signal is complaint *breadth*: with hundreds of reviews per app, a
// keyword shows up somewhere for almost everyone, so raw counts mean little.
// Instead we ask, per app, which needs are its *top* complaints (relative to its
// own complaint mix), then count how many apps share each as a top pain. A need
// that's a top complaint across most of the genre is an open gap nobody closes;
// one that only bites a few apps is app-specific. Praise (a small sample) is a
// weak secondary hint, never the verdict.

export type NeedAppStat = {
  id: string;
  name: string;
  icon: string | null;
  complaints: number;
  praises: number;
  sharePct: number; // complaints on this need / app's total negatives
  quotes: string[];
};

export type NeedGap = {
  key: string;
  label: string;
  desc: string;
  complaintMentions: number;
  failApps: number; // apps where this is a top complaint
  totalApps: number; // apps with any reviews
  verdict: "open" | "narrow" | "thin";
  bestApp: { id: string; name: string } | null; // net-praised hint
  apps: NeedAppStat[];
};

export type NeedsGapView = {
  slug: string;
  needs: NeedGap[];
  whitespace: string[];
  maxFail: number;
  reviewsScanned: number;
};

const REVIEWS_PER_APP = 600;
const POSITIVES_PER_APP = 300;
const QUOTE_MAX = 220;
const TOP_NEEDS_PER_APP = 3; // a need ranking this high in an app counts as a top pain
const THIN_FAIL = 2; // fewer than this many apps failing = not enough signal
const OPEN_BREADTH = 0.4; // top pain in >= 40% of the genre = genre-wide gap

function matches(textLower: string, keywords: string[]): boolean {
  for (const k of keywords) if (textLower.includes(k)) return true;
  return false;
}

function trimQuote(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > QUOTE_MAX ? t.slice(0, QUOTE_MAX - 1).trimEnd() + "…" : t;
}

export async function getNeedsGap(slug: string, locale: Locale): Promise<NeedsGapView | null> {
  const segment = getSegmentBySlug(slug, locale);
  const needs = resolveNeeds(slug, locale);
  if (!segment || !needs) return null;

  const keywordSets = needs.map((n) => n.keywords.map((k) => k.toLowerCase()));

  const products = await prisma.product.findMany({
    where: { id: { in: segment.appIds } },
    select: {
      id: true,
      name: true,
      icon: true,
      listings: {
        select: {
          reviews: { select: { text: true }, take: REVIEWS_PER_APP, orderBy: { postedAt: "desc" } },
          positives: { select: { text: true }, take: POSITIVES_PER_APP },
        },
      },
    },
  });

  const perNeed: Map<string, NeedAppStat>[] = needs.map(() => new Map());
  const failApps = needs.map(() => 0);
  let reviewsScanned = 0;
  let totalApps = 0;

  for (const p of products) {
    const negatives = p.listings.flatMap((l) => l.reviews);
    const positives = p.listings.flatMap((l) => l.positives);
    const negTotal = negatives.length;
    if (negTotal === 0) continue;
    totalApps++;
    reviewsScanned += negTotal;

    const stats: (NeedAppStat & { _i: number })[] = needs.map((_, i) => {
      const kws = keywordSets[i];
      let complaints = 0;
      const quotes: string[] = [];
      for (const r of negatives) {
        if (matches(r.text.toLowerCase(), kws)) {
          complaints++;
          if (quotes.length < 2 && r.text.trim().length > 12) quotes.push(trimQuote(r.text));
        }
      }
      let praises = 0;
      for (const r of positives) if (matches(r.text.toLowerCase(), kws)) praises++;
      return {
        _i: i,
        id: p.id,
        name: p.name,
        icon: p.icon,
        complaints,
        praises,
        sharePct: Math.round((complaints / negTotal) * 100),
        quotes,
      };
    });

    // This app's top pains: highest-complaint needs, relative to its own mix.
    const top = [...stats]
      .filter((s) => s.complaints > 0)
      .sort((a, b) => b.complaints - a.complaints)
      .slice(0, TOP_NEEDS_PER_APP);
    for (const s of top) failApps[s._i]++;

    for (const s of stats) {
      if (s.complaints > 0 || s.praises > 0) {
        const { _i, ...stat } = s;
        void _i;
        perNeed[s._i].set(p.id, stat);
      }
    }
  }

  const gaps: NeedGap[] = needs.map((n, i) => {
    const apps = [...perNeed[i].values()].sort((a, b) => b.complaints - a.complaints);
    const complaintMentions = apps.reduce((s, a) => s + a.complaints, 0);

    let best: NeedAppStat | null = null;
    let bestNet = 0;
    for (const a of apps) {
      const net = a.praises - a.complaints;
      if (net > bestNet) {
        bestNet = net;
        best = a;
      }
    }

    const breadth = totalApps ? failApps[i] / totalApps : 0;
    const verdict: NeedGap["verdict"] =
      failApps[i] < THIN_FAIL ? "thin" : breadth >= OPEN_BREADTH ? "open" : "narrow";

    return {
      key: n.key,
      label: n.label,
      desc: n.desc,
      complaintMentions,
      failApps: failApps[i],
      totalApps,
      verdict,
      bestApp: best ? { id: best.id, name: best.name } : null,
      apps,
    };
  });

  // Gaps first: the most widely-shared pains float to the top.
  gaps.sort((a, b) => b.failApps - a.failApps || b.complaintMentions - a.complaintMentions);

  const maxFail = Math.max(1, ...gaps.map((g) => g.failApps));

  return {
    slug,
    needs: gaps,
    whitespace: resolveWhitespace(slug, locale),
    maxFail,
    reviewsScanned,
  };
}
