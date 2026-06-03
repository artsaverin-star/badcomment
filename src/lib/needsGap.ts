import { prisma } from "./prisma";
import { getSegmentBySlug } from "./segments";
import { resolveNeeds, resolveWhitespace } from "./needs";
import type { Locale } from "./i18n";

// How well a single genre serves each of its authored "needs", scored from real
// reviews. For every need we count, per app, how many complaints vs. how many
// praises mention it (a review counts once, regardless of keyword repeats). A
// need that every app is complained about and none is praised for is an open
// gap; a need some app is net-praised for is "closed".
//
// Counts are honest tallies of mentions in reviews — not a satisfaction %, so we
// surface them as "mentions" and rank, never as a precise score.

export type NeedAppStat = {
  id: string;
  name: string;
  icon: string | null;
  complaints: number;
  praises: number;
  quotes: string[];
};

export type NeedGap = {
  key: string;
  label: string;
  desc: string;
  complaintMentions: number;
  praiseMentions: number;
  demand: number;
  verdict: "open" | "closed" | "thin";
  bestApp: { id: string; name: string } | null;
  apps: NeedAppStat[];
};

export type NeedsGapView = {
  slug: string;
  needs: NeedGap[];
  whitespace: string[];
  maxComplaints: number;
  reviewsScanned: number;
};

const REVIEWS_PER_APP = 600;
const POSITIVES_PER_APP = 300;
const QUOTE_MAX = 220;
const THIN_DEMAND = 5;

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

  // perNeed[i] = map of appId -> stat
  const perNeed: Map<string, NeedAppStat>[] = needs.map(() => new Map());
  let reviewsScanned = 0;

  for (const p of products) {
    const negatives = p.listings.flatMap((l) => l.reviews);
    const positives = p.listings.flatMap((l) => l.positives);
    reviewsScanned += negatives.length;

    needs.forEach((_, i) => {
      const kws = keywordSets[i];
      let complaints = 0;
      let praises = 0;
      const quotes: string[] = [];
      for (const r of negatives) {
        if (matches(r.text.toLowerCase(), kws)) {
          complaints++;
          if (quotes.length < 2 && r.text.trim().length > 12) quotes.push(trimQuote(r.text));
        }
      }
      for (const r of positives) {
        if (matches(r.text.toLowerCase(), kws)) praises++;
      }
      if (complaints > 0 || praises > 0) {
        perNeed[i].set(p.id, { id: p.id, name: p.name, icon: p.icon, complaints, praises, quotes });
      }
    });
  }

  const gaps: NeedGap[] = needs.map((n, i) => {
    const apps = [...perNeed[i].values()].sort((a, b) => b.complaints - a.complaints);
    const complaintMentions = apps.reduce((s, a) => s + a.complaints, 0);
    const praiseMentions = apps.reduce((s, a) => s + a.praises, 0);
    const demand = complaintMentions + praiseMentions;

    let best: NeedAppStat | null = null;
    let bestNet = 0;
    for (const a of apps) {
      const net = a.praises - a.complaints;
      if (net > bestNet) {
        bestNet = net;
        best = a;
      }
    }

    const verdict: NeedGap["verdict"] =
      demand < THIN_DEMAND ? "thin" : bestNet > 0 ? "closed" : "open";

    return {
      key: n.key,
      label: n.label,
      desc: n.desc,
      complaintMentions,
      praiseMentions,
      demand,
      verdict,
      bestApp: verdict === "closed" && best ? { id: best.id, name: best.name } : null,
      apps,
    };
  });

  // Gaps first: most complained about and least praised float to the top; thin
  // signal sinks to the bottom on its own.
  gaps.sort((a, b) => b.complaintMentions - b.praiseMentions - (a.complaintMentions - a.praiseMentions));

  const maxComplaints = Math.max(1, ...gaps.map((g) => g.complaintMentions));

  return {
    slug,
    needs: gaps,
    whitespace: resolveWhitespace(slug, locale),
    maxComplaints,
    reviewsScanned,
  };
}
