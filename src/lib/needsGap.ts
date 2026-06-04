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
//
// The page ships only the aggregate numbers (counts + fork/app breakdown). The
// real reviews behind any number are loaded on demand — see getSegmentEvidence /
// getAppEvidence and /api/evidence — so the popup can show every matching review
// (filterable by app and sub-problem) without bloating every page render.

export type NeedAppStat = {
  id: string;
  name: string;
  icon: string | null;
  complaints: number;
  sharePct: number; // complaints on this need / app's classified reviews
  forks: NeedForkStat[]; // which sub-threads this app hits, as tags
};

// A sub-thread inside a need (a taxonomy fork), with how many reviews hit it.
// The catch-all "Other" bucket uses the need's own key (no fork was assigned).
export type NeedForkStat = { key: string; label: string; mentions: number };

export type NeedGap = {
  key: string;
  label: string;
  complaintMentions: number;
  failApps: number; // apps where this is a top complaint
  totalApps: number; // apps with any classified reviews
  verdict: "open" | "narrow" | "thin";
  forks: NeedForkStat[];
  apps: NeedAppStat[];
};

export type NeedsGapView = {
  slug: string;
  needs: NeedGap[];
  maxFail: number;
  reviewsScanned: number;
};

// One real review behind a count, loaded on demand for the evidence popup. The
// verbatim trigger is the exact phrase the classifier matched, so every number
// opens to readable proof (the phrase is highlighted in the popup).
export type EvidenceReview = {
  app: string;
  icon: string | null;
  rating: number;
  title: string | null;
  text: string;
  match: string;
  translated: boolean; // text is a Russian translation of a non-Russian original
};

export type EvidencePage = { reviews: EvidenceReview[]; total: number };

type StoredLabel = { key: string; stance: string; confidence: number; trigger: string };

const REVIEWS_PER_APP = 600;
const TOP_NEEDS_PER_APP = 3; // a need ranking this high in an app counts as a top pain
const THIN_FAIL = 2; // fewer than this many apps failing = not enough signal
const OPEN_BREADTH = 0.4; // top pain in >= 40% of the genre = genre-wide gap

// Full verbatim text with runs of whitespace collapsed to one clean block. We
// never truncate — a clipped complaint is a half-told one.
function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// The sub-thread label a review is filed under: the fork's own label, or a
// catch-all bucket when the review only hit the bare need (no fork). The
// catch-all lets the displayed tags partition the reviews and sum to the
// headline without inventing a sub-problem the classifier didn't assign.
function forkLabelOf(need: ClassNeed, key: string, locale: Locale): string {
  const f = need.forks.find((f) => f.key === key);
  if (f) return locale === "ru" ? f.ru : f.en;
  return locale === "ru" ? "Прочее" : "Other";
}

// Every emittable key (bare need + forks) mapped back to its need's index.
function buildKeyToNeed(needs: ClassNeed[]): Map<string, number> {
  const m = new Map<string, number>();
  needs.forEach((n, i) => {
    m.set(n.key, i);
    for (const f of n.forks) m.set(f.key, i);
  });
  return m;
}

// File a review under its SINGLE strongest pain label per need (highest
// confidence): one count per need, landing in exactly one sub-thread bucket, so
// fork tags partition the reviews and sum to the headline instead of
// double-counting overlaps. The winning label's key is the fork bucket (or the
// bare need key, which renders as "Other").
function topPainPerNeed(needsJson: string | null, keyToNeed: Map<string, number>): Map<number, StoredLabel> {
  let labels: StoredLabel[];
  try {
    labels = JSON.parse(needsJson || "[]");
  } catch {
    return new Map();
  }
  const top = new Map<number, StoredLabel>();
  for (const l of labels) {
    if (l.stance !== "pain") continue;
    const ni = keyToNeed.get(l.key);
    if (ni === undefined) continue;
    const cur = top.get(ni);
    if (!cur || l.confidence > cur.confidence) top.set(ni, l);
  }
  return top;
}

export async function getNeedsGap(slug: string, locale: Locale): Promise<NeedsGapView | null> {
  const segment = getSegmentBySlug(slug, locale);
  const taxonomy = getTaxonomy(slug);
  if (!segment || !taxonomy) return null;

  const version = taxonomyVersion(slug);
  const needs = taxonomy.needs;
  const label = (n: ClassNeed) => (locale === "ru" ? n.ru : n.en);
  const keyToNeed = buildKeyToNeed(needs);

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
            select: { needs: true, text: true },
            take: REVIEWS_PER_APP,
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });

  const perNeed: Map<string, NeedAppStat>[] = needs.map(() => new Map());
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
    // A review stored verbatim under several ids is one complaint: dedupe by
    // text per need so it neither inflates the count nor (later) shows up twice.
    const appSeen: Set<string>[] = needs.map(() => new Set<string>());

    for (const r of reviews) {
      for (const [ni, top] of topPainPerNeed(r.needs, keyToNeed)) {
        const c = clean(r.text);
        const dedupable = c.length > 12;
        if (dedupable) {
          const k = c.toLowerCase();
          if (appSeen[ni].has(k)) continue;
          appSeen[ni].add(k);
        }
        appComplaints[ni]++;
        forkCounts[ni].set(top.key, (forkCounts[ni].get(top.key) ?? 0) + 1);
        appForks[ni].set(top.key, (appForks[ni].get(top.key) ?? 0) + 1);
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

    return { key: n.key, label: label(n), complaintMentions, failApps: failApps[i], totalApps, verdict, forks, apps };
  });

  // Gaps first: the most widely-shared pains float to the top.
  gaps.sort((a, b) => b.failApps - a.failApps || b.complaintMentions - a.complaintMentions);

  const maxFail = Math.max(1, ...gaps.map((g) => g.failApps));

  return { slug, needs: gaps, maxFail, reviewsScanned };
}

// ── Per-app semantic needs (product detail page) ──────────────────────────────
// The single-app cousin of getNeedsGap: instead of breadth across a genre, it
// just ranks an app's own pains by how many of its reviews hit each need.

export type AppNeed = {
  key: string;
  label: string;
  mentions: number;
  forks: NeedForkStat[];
};

export type AppNeedsView = {
  needs: AppNeed[];
  maxMentions: number;
  reviewsClassified: number;
};

export async function getAppNeeds(productId: string, locale: Locale): Promise<AppNeedsView | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      listings: {
        select: {
          reviews: {
            where: { needsVersion: { not: null } },
            select: { needs: true, needsVersion: true, text: true },
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
  const keyToNeed = buildKeyToNeed(needs);

  const mentions = needs.map(() => 0);
  const forkCounts: Map<string, number>[] = needs.map(() => new Map());
  const seen: Set<string>[] = needs.map(() => new Set<string>()); // dedupe verbatim duplicate reviews
  let reviewsClassified = 0;

  for (const r of reviews) {
    if (r.needsVersion !== version) continue;
    reviewsClassified++;
    for (const [ni, top] of topPainPerNeed(r.needs, keyToNeed)) {
      const c = clean(r.text);
      const dedupable = c.length > 12;
      if (dedupable) {
        const k = c.toLowerCase();
        if (seen[ni].has(k)) continue;
        seen[ni].add(k);
      }
      mentions[ni]++;
      forkCounts[ni].set(top.key, (forkCounts[ni].get(top.key) ?? 0) + 1);
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
      return { key: n.key, label: label(n), mentions: mentions[i], forks };
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

// ── On-demand evidence ────────────────────────────────────────────────────────
// The reviews behind a count, resolved with the SAME primary-fork assignment and
// per-app dedupe as the aggregation above — so the number of reviews returned
// always equals the count shown on the chip. Optional fork/app filters narrow it
// (fork === the need's own key means the "Other" catch-all bucket). Newest first.

// On the RU UI a non-Russian review is shown in its Russian translation (with a
// "translated" badge) when one exists; the highlight is dropped because the
// matched trigger is a verbatim span of the ORIGINAL text. Dedupe always keys on
// the original so it stays stable whether or not a translation is present.
function display(
  r: { text: string; title: string | null; textRu: string | null; titleRu: string | null },
  match: string,
  locale: Locale,
): { title: string | null; text: string; match: string; translated: boolean } {
  if (locale === "ru" && r.textRu) {
    return { title: r.titleRu?.trim() || null, text: clean(r.textRu), match: "", translated: true };
  }
  return { title: r.title?.trim() || null, text: clean(r.text), match, translated: false };
}

export async function getSegmentEvidence(
  slug: string,
  needKey: string,
  forkKey: string | null,
  appId: string | null,
  locale: Locale,
): Promise<EvidencePage> {
  const segment = getSegmentBySlug(slug, "en");
  const taxonomy = getTaxonomy(slug);
  if (!segment || !taxonomy) return { reviews: [], total: 0 };

  const version = taxonomyVersion(slug);
  const keyToNeed = buildKeyToNeed(taxonomy.needs);
  const ni = keyToNeed.get(needKey);
  if (ni === undefined) return { reviews: [], total: 0 };

  const ids = appId ? (segment.appIds.includes(appId) ? [appId] : []) : segment.appIds;
  if (ids.length === 0) return { reviews: [], total: 0 };

  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    select: {
      name: true,
      icon: true,
      listings: {
        select: {
          reviews: {
            where: { needsVersion: version },
            select: { needs: true, text: true, textRu: true, rating: true, title: true, titleRu: true, postedAt: true },
            take: REVIEWS_PER_APP,
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });

  const out: { r: EvidenceReview; at: number }[] = [];
  for (const p of products) {
    const reviews = p.listings.flatMap((l) => l.reviews);
    const seen = new Set<string>();
    for (const r of reviews) {
      const top = topPainPerNeed(r.needs, keyToNeed).get(ni);
      if (!top) continue;
      if (forkKey && top.key !== forkKey) continue;
      const c = clean(r.text);
      if (c.length > 12) {
        const k = c.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
      }
      const d = display(r, top.trigger, locale);
      out.push({
        r: { app: p.name, icon: p.icon, rating: r.rating, ...d },
        at: r.postedAt?.getTime() ?? 0,
      });
    }
  }
  out.sort((a, b) => b.at - a.at);
  const reviews = out.map((o) => o.r);
  return { reviews, total: reviews.length };
}

export async function getAppEvidence(
  productId: string,
  needKey: string,
  forkKey: string | null,
  locale: Locale,
): Promise<EvidencePage> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      listings: {
        select: {
          reviews: {
            where: { needsVersion: { not: null } },
            select: {
              needs: true,
              needsVersion: true,
              text: true,
              textRu: true,
              rating: true,
              title: true,
              titleRu: true,
              postedAt: true,
            },
            orderBy: { postedAt: "desc" },
          },
        },
      },
    },
  });
  if (!product) return { reviews: [], total: 0 };

  const reviews = product.listings.flatMap((l) => l.reviews);
  const version = reviews.find((r) => r.needsVersion)?.needsVersion;
  const taxonomy = Object.values(TAXONOMIES).find((t) => t.version === version);
  if (!taxonomy) return { reviews: [], total: 0 };

  const keyToNeed = buildKeyToNeed(taxonomy.needs);
  const ni = keyToNeed.get(needKey);
  if (ni === undefined) return { reviews: [], total: 0 };

  const out: { r: EvidenceReview; at: number }[] = [];
  const seen = new Set<string>();
  for (const r of reviews) {
    if (r.needsVersion !== version) continue;
    const top = topPainPerNeed(r.needs, keyToNeed).get(ni);
    if (!top) continue;
    if (forkKey && top.key !== forkKey) continue;
    const c = clean(r.text);
    if (c.length > 12) {
      const k = c.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
    }
    const d = display(r, top.trigger, locale);
    out.push({
      r: { app: "", icon: null, rating: r.rating, ...d },
      at: r.postedAt?.getTime() ?? 0,
    });
  }
  out.sort((a, b) => b.at - a.at);
  const reviews2 = out.map((o) => o.r);
  return { reviews: reviews2, total: reviews2.length };
}
