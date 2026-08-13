import type { SessionUser } from "@/lib/session";
import { getApp, getNiche, getNichePatterns, listNiches, listReviewCatalogue, readReviews, split, progress as reviewProgress, type ReviewTheme } from "@/lib/reviews";
import reviewsIndex from "@/data/reviewsIndex.json";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { DOSSIER_BY_SLUG } from "@/data/dossier";
import channelsData from "@/data/channels.json";
import { getNicheThesis } from "@/lib/nicheThesis";
import { marketFor, scoreFor } from "@/lib/ideaScores";
import { listIdeas, getIdea } from "@/lib/ideas";
import { categoryCards } from "@/lib/regenCards";
import { FRIEND_PRICE_RUB } from "@/lib/tokenConfig";
import { accessForUser, ownsIdea } from "./access";
import { prisma } from "@/lib/prisma";

// Usage log for the admin page: one row per authenticated call, fire-and-forget
// so a logging hiccup can never fail the tool itself.
function logCall(userId: string, tool: string, status: "ok" | "denied") {
  prisma.mcpCall.create({ data: { userId, tool, status } }).catch(() => {});
}

// Tool surface of the inApp MCP server. Everything here answers one question an
// agent has while building an app: what do real users of this kind of app
// actually say, and where does the category leave them hanging.
//
// All numbers trace back to review texts we read — no tool invents a figure.

export const SERVER_INSTRUCTIONS = `inApp turns real App Store reviews into product research: 72 app categories, 4400+ apps, 1.4M reviews read.

Use it when you are designing, positioning or improving an app and want evidence instead of guesses: what users of a category praise, what they complain about, which competitor is genuinely liked versus propped up by fake ratings, where the money and the users come from, and which gaps keep coming up.

Typical flow: list_niches to find the category, get_niche_brief for the market and the audience, get_niche_rating to see who really leads, search_themes for recurring topics, then get_app_reviews to read and quote the exact reviews behind a theme.

Every count traces to reviews we actually read, and quotes are verbatim. Nothing here is generated from a model's guess about the market.

The server is part of the paid tier: one lifetime payment on the site opens everything, MCP included. Connect via your client's OAuth flow (sign in in the browser when prompted), or pass the personal key from https://inapp.pro/ru/mcp as an Authorization: Bearer header.`;

type Idx = Record<string, { name: string; nameEn?: string; apps: { id: string; title: string; total: number; themes: ReviewTheme[]; icon?: string }[] }>;
const IDX = reviewsIndex as unknown as Idx;

type RatingApp = {
  id: string;
  title: string;
  storeAvg?: number;
  ratings?: number;
  nrev?: number;
  realScore?: number;
  authenticity?: string;
  authNote?: string;
  verdict?: string;
  loved?: string;
  weak?: string;
  whoFor?: string;
};
type RatingSet = { slug: string; name: string; nameEn?: string; apps: RatingApp[]; totalReviews?: number; count?: number; inflated?: number };
const RATING = RATING_BY_SLUG as Record<string, RatingSet>;

type Segment = { name: string; job: string; payLevel: string; payNote?: string; servedBy: string[]; gap: string };
type Dossier = { audience: { segments: Segment[]; takeaway?: string }; market: { money?: string; marketLead?: string } };
const DOSSIER = DOSSIER_BY_SLUG as Record<string, Dossier>;

type Channel = { name: string; note: string; count: number; quotes: { app: string; quote: string }[] };
const CHANNELS = channelsData as unknown as Record<string, { channels: Channel[] }>;

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: "object"; properties?: Record<string, unknown>; required?: string[]; additionalProperties: false };
  annotations: { readOnlyHint: true; openWorldHint: false };
};

const RO = { readOnlyHint: true, openWorldHint: false } as const;
const str = (d: string) => ({ type: "string", description: d });
const num = (d: string) => ({ type: "integer", description: d });

export const TOOLS: Tool[] = [
  {
    name: "list_niches",
    title: "List app niches",
    description:
      "List all 72 app categories inApp has researched, each with how many apps and reviews back it, its estimated annual revenue, and whether per-review theme data is available. Start here to get the niche slug every other tool takes.",
    inputSchema: {
      type: "object",
      properties: { withReviewThemes: { type: "boolean", description: "Only niches whose reviews are broken into themes (needed by search_themes and get_app_reviews)." } },
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_niche_brief",
    title: "Get a niche brief",
    description:
      "The market read on one category: the governing thesis drawn from its reviews, money (annual revenue estimate, the prices users actually mention, install scale), and the audience broken into segments with the job each one hires an app for and the gap left open for it.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug from list_niches.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "list_niche_findings",
    title: "List a niche's findings",
    description:
      "The findings of the niche breakdown: each recurring product pattern, what works and what breaks, and how many review observations sit behind it. Verbatim user quotes come with a personal key on an account that owns the niche.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), limit: num("Max findings, default 20.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_distribution_channels",
    title: "Where a niche's users come from",
    description:
      "The acquisition channels users of this category name in their own reviews, with how often each is mentioned and example quotes. Useful for planning launch and ASO.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), limit: num("Max channels, default 8.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "list_ideas",
    title: "List app ideas for a niche",
    description:
      "The buildable product ideas inApp derived from this category's reviews, each with the recurring mechanisms behind it and scores for demand, money and simplicity. Titles and scoring are open; the pitch, feature set and monetization come from get_idea.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), limit: num("Max ideas, default 10.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_idea",
    title: "Get a full idea",
    description:
      "The full payload of one idea: the gap it exploits, the pitch, what to build, what to deliberately leave out, how to charge, and the verbatim review quotes it was derived from. Paid layer — needs an Authorization: Bearer key from an account that owns this idea or its niche.",
    inputSchema: {
      type: "object",
      properties: { idea: str("Idea slug, e.g. 'sobriety-1', from list_ideas.") },
      required: ["idea"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "find_apps",
    title: "Find apps",
    description:
      "Find apps by name across every niche. Returns the niche slug and app id you need for the other tools, plus how many of that app's reviews we read.",
    inputSchema: {
      type: "object",
      properties: { query: str("Part of an app name, case-insensitive."), limit: num("Max results, default 20.") },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "list_niche_apps",
    title: "List apps in a niche",
    description:
      "Every app in one niche with its review count and its three loudest themes. Use it to see the competitive field before reading individual reviews.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug from list_niches."), limit: num("Max apps, default 40.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "search_themes",
    title: "Search recurring themes",
    description:
      "Search the topics people actually write about, across every app we read. Each hit is one app's own theme with its real review count and whether it is praise, pain or mixed. This is the fastest way to answer 'what do users of X complain about'.",
    inputSchema: {
      type: "object",
      properties: {
        query: str("Words to match in the theme, e.g. 'подписка', 'paywall', 'offline', 'sync'. Matches Russian and English theme names."),
        niche: str("Optional niche slug to restrict the search."),
        polarity: { type: "string", enum: ["love", "pain", "mixed"], description: "Optional: only praise, only pain, or only mixed themes." },
        minCount: num("Only themes with at least this many reviews. Default 10."),
        limit: num("Max results, default 30."),
      },
      required: ["query"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_app_themes",
    title: "Get one app's themes",
    description: "The full theme breakdown of a single app: every theme, its review count, its polarity, and its share of the app's reviews.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), appId: str("App Store id, from find_apps or list_niche_apps.") },
      required: ["niche", "appId"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_app_reviews",
    title: "Read an app's reviews",
    description:
      "The actual review texts for one app, optionally narrowed to one theme and a star range. Use it to quote real users rather than paraphrasing.",
    inputSchema: {
      type: "object",
      properties: {
        niche: str("Niche slug."),
        appId: str("App Store id."),
        theme: str("Optional theme name, exactly as returned by get_app_themes."),
        minRating: num("Lowest star rating to include, 1-5."),
        maxRating: num("Highest star rating to include, 1-5."),
        contains: str("Optional substring the review text must contain."),
        limit: num("Max reviews, default 25, hard cap 200."),
      },
      required: ["niche", "appId"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_app_verdict",
    title: "Get an app's honest rating",
    description:
      "inApp's people's-rating entry for one app: a score computed from what reviewers actually wrote, a review-inflation check against the store average, what users love, what they call weak, and who the app is for.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), appId: str("App Store id.") },
      required: ["niche", "appId"],
      additionalProperties: false,
    },
    annotations: RO,
  },
  {
    name: "get_niche_rating",
    title: "Rank a niche by real quality",
    description:
      "The whole niche ranked by the people's rating, which is built from review texts rather than store stars, with the inflation check on every app. Shows which leaders are genuinely liked and which are propped up.",
    inputSchema: {
      type: "object",
      properties: { niche: str("Niche slug."), limit: num("Max apps, default 25.") },
      required: ["niche"],
      additionalProperties: false,
    },
    annotations: RO,
  },
];

const LOCK_NOTE = "locked — MCP is part of the paid tier, see https://inapp.pro/ru/mcp";

const json = (v: unknown) => JSON.stringify(v, null, 1);
const clamp = (n: unknown, def: number, max: number) => {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.floor(n) : def;
  return Math.max(1, Math.min(max, v));
};
const s = (v: unknown) => (typeof v === "string" ? v : "");

const themeShare = (t: ReviewTheme, total: number) => Math.round((t.count / Math.max(1, total)) * 100);

export type McpCaller = { user: SessionUser | null; keyPresent: boolean };

export async function callTool(name: string, args: Record<string, unknown>, caller: McpCaller): Promise<string> {
  const { user } = caller;

  // The whole server is part of the paid tier: one lifetime payment on the
  // site opens every tool. Old per-niche unlocks keep working on the site but
  // do not include MCP.
  const gate = await accessForUser(user);
  if (!gate.unlimited) {
    if (!user && caller.keyPresent) {
      throw new Error("The key sent is not valid. Copy the current one from https://inapp.pro/ru/mcp.");
    }
    if (!user) {
      throw new Error(
        `The inApp MCP server is part of the paid tier: one payment of ${FRIEND_PRICE_RUB} RUB opens the whole site and MCP forever. Sign in and buy at https://inapp.pro/ru/mcp, then pass the personal key as an Authorization: Bearer header.`,
      );
    }
    logCall(user.id, name, "denied");
    throw new Error(
      `This account has no lifetime access yet. One payment of ${FRIEND_PRICE_RUB} RUB opens the whole site and MCP forever: https://inapp.pro/ru/mcp`,
    );
  }
  if (user) logCall(user.id, name, "ok");

  switch (name) {
    case "list_niches": {
      const themed = new Map(listNiches("ru").map((n) => [n.slug, n]));
      const reviewCatalogue = new Map(listReviewCatalogue("ru").map((n) => [n.slug, n]));
      const onlyThemed = args.withReviewThemes === true;
      const niches = Object.entries(RATING)
        .map(([slug, set]) => {
          const t = themed.get(slug);
          const research = reviewCatalogue.get(slug);
          const mkt = marketFor(slug);
          return {
            niche: slug,
            name: set.name,
            nameEn: set.nameEn,
            appsRated: set.count ?? set.apps?.length ?? 0,
            reviewsRead: set.totalReviews ?? 0,
            inflatedApps: set.inflated ?? 0,
            annualRevenueEstimate: mkt?.revenue ? `${mkt.revenue.low} .. ${mkt.revenue.high}` : null,
            ideas: listIdeas().filter((i) => i.category === slug).length,
            nichePatterns: research ? { patterns: research.patterns, apps: research.appsPlanned, reviews: research.sourceReviews } : null,
            reviewThemes: t ? { apps: t.apps, reviews: t.reviews, themes: t.themes, praisePct: Math.round(t.split.lovePct), complaintPct: Math.round(t.split.painPct) } : null,
          };
        })
        .filter((n) => !onlyThemed || n.reviewThemes)
        .sort((a, b) => b.reviewsRead - a.reviewsRead);
      return json({
        niches,
        total: niches.length,
        themeCoverage: {
          niches: `${reviewProgress.nichesDone} of ${reviewProgress.nichesPlanned}`,
          apps: `${reviewProgress.appsDone} of ${reviewProgress.appsPlanned}`,
          note: "Theme-level review tools (search_themes, get_app_themes, get_app_reviews) only cover niches where reviewThemes is not null. Every other tool covers all niches.",
        },
      });
    }

    case "get_niche_brief": {
      const slug = s(args.niche);
      const set = RATING[slug];
      if (!set) throw new Error(`Unknown niche "${slug}". Call list_niches for valid slugs.`);
      const thesis = getNicheThesis(slug);
      const mkt = marketFor(slug);
      const d = DOSSIER[slug];
      const acc = await accessForUser(user);
      const paid = acc.unlimited || acc.has("category", slug) || acc.has("chapter", slug);
      return json({
        niche: slug,
        name: set.name,
        appsRated: set.count ?? set.apps?.length ?? 0,
        reviewsRead: set.totalReviews ?? 0,
        inflatedApps: set.inflated ?? 0,
        thesis: thesis?.governing ?? null,
        competitorRead: thesis?.competitorRead ?? null,
        pillars: thesis?.pillars?.map((p) => ({ title: p.title, dek: p.dek })) ?? [],
        market: mkt
          ? {
              annualRevenueEstimate: mkt.revenue ? { low: mkt.revenue.low, high: mkt.revenue.high, annualPricePerUser: mkt.revenue.annualPrice, note: mkt.revenue.note } : null,
              storeRatingsTotal: mkt.ratingsTotal,
              pricesUsersMention: mkt.pricesTop?.slice(0, 6) ?? [],
              paymentSignals: mkt.signals,
              installs: mkt.installs ? { totalMin: mkt.installs.totalMin, totalMax: mkt.installs.totalMax, paidApps: mkt.installs.paidApps, iapApps: mkt.installs.iapApps } : null,
            }
          : null,
        audience:
          d?.audience?.segments?.map((sg) => ({
            segment: sg.name,
            job: sg.job,
            paysHow: sg.payLevel,
            gap: sg.gap,
            servedBy: sg.servedBy,
            ...(paid && sg.payNote ? { whyItPays: sg.payNote } : {}),
          })) ?? [],
        ...(paid ? { audienceTakeaway: d?.audience?.takeaway ?? null, whereTheMoneyIs: d?.market?.money ?? null } : { paidLayer: LOCK_NOTE }),
        marketLead: d?.market?.marketLead ?? null,
      });
    }

    case "list_niche_findings": {
      const slug = s(args.niche);
      if (!RATING[slug]) throw new Error(`Unknown niche "${slug}". Call list_niches for valid slugs.`);
      const cards = categoryCards(slug);
      const patterns = getNichePatterns(slug, "ru");
      if (!patterns.length && !cards) throw new Error(`No breakdown for niche "${slug}".`);
      const limit = clamp(args.limit, 20, 100);
      const acc = await accessForUser(user);
      const paid = acc.unlimited || acc.has("category", slug) || acc.has("chapter", slug);
      const list = patterns.length ? patterns.slice(0, limit) : (cards?.product ?? []).slice(0, limit);
      return json({
        niche: slug,
        findings: list.map((c) => ({
          finding: c.title,
          works: c.plus || null,
          breaks: c.minus || null,
          observations: c.count,
          apps: c.apps,
          ...(paid ? { quotes: (c.evidence ?? []).slice(0, 5).map((e) => ({ app: e.app, rating: e.rating, quote: e.quote })) } : {}),
        })),
        findingsTotal: patterns.length || cards?.product.length || 0,
        ...(paid ? {} : { quotes: LOCK_NOTE }),
      });
    }

    case "get_distribution_channels": {
      const slug = s(args.niche);
      if (!RATING[slug]) throw new Error(`Unknown niche "${slug}". Call list_niches for valid slugs.`);
      const ch = CHANNELS[slug]?.channels;
      if (!ch?.length) throw new Error(`No channel data for niche "${slug}" yet.`);
      const limit = clamp(args.limit, 8, 40);
      return json({
        niche: slug,
        channels: ch.slice(0, limit).map((c) => ({
          channel: c.name,
          note: c.note,
          mentions: c.count,
          quotes: (c.quotes ?? []).slice(0, 2).map((q) => ({ app: q.app, quote: q.quote })),
        })),
        channelsTotal: ch.length,
      });
    }

    case "list_ideas": {
      const slug = s(args.niche);
      if (!RATING[slug]) throw new Error(`Unknown niche "${slug}". Call list_niches for valid slugs.`);
      const limit = clamp(args.limit, 10, 40);
      const ideas = listIdeas().filter((i) => i.category === slug).slice(0, limit);
      if (!ideas.length) throw new Error(`No ideas published for niche "${slug}".`);
      const acc = await accessForUser(user);
      return json({
        niche: slug,
        ideas: ideas.map((i) => {
          const sc = scoreFor(i.slug);
          return {
            idea: i.slug,
            title: i.title,
            oneLiner: i.oneLiner,
            derivedFrom: i.stats,
            mechanisms: i.mechanisms?.map((m) => ({ mechanism: m.title, observations: m.obsCount, polarity: m.polarity })) ?? [],
            scores: sc ? { demand: sc.demand, money: sc.money, simplicity: sc.simplicity, composite: sc.composite } : null,
            whoPays: sc?.targetSegment ?? null,
            pricePoint: sc?.pricePoint ?? null,
            unlocked: ownsIdea(acc, i.slug, i.category),
          };
        }),
        fullPayload: "Call get_idea with an idea slug. Locked ideas need a personal key.",
      });
    }

    case "get_idea": {
      const slug = s(args.idea);
      const i = getIdea(slug);
      if (!i) throw new Error(`Unknown idea "${slug}". Call list_ideas for valid slugs.`);
      const acc = await accessForUser(user);
      const sc = scoreFor(i.slug);
      const base = {
        idea: i.slug,
        niche: i.category,
        nicheName: i.categoryName,
        title: i.title,
        oneLiner: i.oneLiner,
        derivedFrom: i.stats,
        mechanisms: i.mechanisms?.map((m) => ({ mechanism: m.title, observations: m.obsCount, apps: m.apps, polarity: m.polarity })) ?? [],
        scores: sc ? { demand: sc.demand, money: sc.money, simplicity: sc.simplicity, composite: sc.composite } : null,
      };
      if (!ownsIdea(acc, i.slug, i.category)) {
        return json({
          ...base,
          locked: true,
          missing: ["gap", "pitch", "features", "antiFeatures", "monetization", "reviewQuotes"],
          howToUnlock: `One payment of ${FRIEND_PRICE_RUB} RUB opens the whole site and MCP forever: https://inapp.pro/ru/mcp`,
        });
      }
      return json({
        ...base,
        gap: i.gap,
        pitch: i.idea?.pitch,
        features: i.idea?.features,
        antiFeatures: i.idea?.antiFeatures,
        monetization: i.idea?.monetization,
        reviewQuotes: (i.reviewGrid ?? []).map((q) => ({ app: q.app, rating: q.rating, quote: q.quote })),
      });
    }

    case "find_apps": {
      const q = s(args.query).toLowerCase().trim();
      if (!q) throw new Error("query is required");
      const limit = clamp(args.limit, 20, 100);
      const hits: unknown[] = [];
      for (const [slug, n] of Object.entries(IDX)) {
        for (const a of n.apps) {
          if (!a.title.toLowerCase().includes(q)) continue;
          hits.push({ niche: slug, nicheName: n.name, appId: a.id, title: a.title, reviewsRead: a.total });
          if (hits.length >= limit) break;
        }
        if (hits.length >= limit) break;
      }
      return json({ query: q, hits, note: hits.length >= limit ? `truncated at ${limit}` : undefined });
    }

    case "list_niche_apps": {
      const slug = s(args.niche);
      const n = getNiche(slug);
      if (!n) throw new Error(`Unknown niche "${slug}". Call list_niches for valid slugs.`);
      const limit = clamp(args.limit, 40, 200);
      const apps = n.apps.slice(0, limit).map((a) => {
        const sp = split(a.themes);
        return {
          appId: a.id,
          title: a.title,
          reviewsRead: a.total,
          praisePct: Math.round(sp.lovePct),
          complaintPct: Math.round(sp.painPct),
          topThemes: a.themes.filter((t) => !t.fallback).slice(0, 3).map((t) => ({ theme: t.name, en: t.nameEn, polarity: t.polarity, reviews: t.count })),
        };
      });
      return json({
        niche: slug,
        name: n.name,
        appsShown: apps.length,
        appsTotal: n.apps.length,
        apps,
        note: n.apps.length > apps.length ? `showing the ${apps.length} apps with the most reviews out of ${n.apps.length}` : undefined,
      });
    }

    case "search_themes": {
      const q = s(args.query).toLowerCase().trim();
      if (!q) throw new Error("query is required");
      const only = s(args.niche);
      const pol = s(args.polarity);
      const minCount = clamp(args.minCount, 10, 10000);
      const limit = clamp(args.limit, 30, 200);
      const hits: { niche: string; nicheName: string; appId: string; app: string; theme: string; en: string; polarity: string; reviews: number; sharePct: number }[] = [];
      for (const [slug, n] of Object.entries(IDX)) {
        if (only && slug !== only) continue;
        for (const a of n.apps) {
          for (const t of a.themes) {
            if (t.fallback) continue;
            if (t.count < minCount) continue;
            if (pol && t.polarity !== pol) continue;
            if (!`${t.name} ${t.nameEn}`.toLowerCase().includes(q)) continue;
            hits.push({
              niche: slug,
              nicheName: n.name,
              appId: a.id,
              app: a.title,
              theme: t.name,
              en: t.nameEn,
              polarity: t.polarity,
              reviews: t.count,
              sharePct: themeShare(t, a.total),
            });
          }
        }
      }
      hits.sort((x, y) => y.reviews - x.reviews);
      const shown = hits.slice(0, limit);
      return json({
        query: q,
        matches: hits.length,
        reviewsBehindMatches: hits.reduce((n2, h) => n2 + h.reviews, 0),
        hits: shown,
        note: hits.length > shown.length ? `showing the ${shown.length} largest of ${hits.length} matching themes` : undefined,
      });
    }

    case "get_app_themes": {
      const slug = s(args.niche);
      const id = s(args.appId);
      const a = getApp(slug, id);
      if (!a) throw new Error(`No app ${id} in niche "${slug}". Use find_apps first.`);
      return json({
        niche: slug,
        appId: a.id,
        title: a.title,
        reviewsRead: a.total,
        themes: a.themes.map((t) => ({ theme: t.name, en: t.nameEn, polarity: t.polarity, reviews: t.count, sharePct: themeShare(t, a.total), kind: t.fallback ? "fallback" : "specific" })),
      });
    }

    case "get_app_reviews": {
      const slug = s(args.niche);
      const id = s(args.appId);
      const a = getApp(slug, id);
      if (!a) throw new Error(`No app ${id} in niche "${slug}". Use find_apps first.`);
      const limit = clamp(args.limit, 25, 200);
      const theme = s(args.theme);
      const contains = s(args.contains).toLowerCase();
      const min = clamp(args.minRating, 1, 5);
      const max = clamp(args.maxRating, 5, 5);
      let list = readReviews(slug, id);
      if (!list.length) throw new Error(`Review texts for ${id} are not on this server.`);
      if (theme) {
        const known = a.themes.some((t) => t.name === theme);
        if (!known) throw new Error(`Unknown theme "${theme}". Call get_app_themes for the exact names.`);
        list = list.filter((r) => r.theme === theme);
      }
      list = list.filter((r) => r.rating >= min && r.rating <= max);
      if (contains) list = list.filter((r) => r.text.toLowerCase().includes(contains));
      const matched = list.length;
      const shown = list.sort((x, y) => x.rating - y.rating).slice(0, limit);
      return json({
        niche: slug,
        appId: a.id,
        title: a.title,
        filter: { theme: theme || null, minRating: min, maxRating: max, contains: contains || null },
        matched,
        reviews: shown.map((r) => ({ rating: r.rating, theme: r.theme, text: r.text })),
        note: matched > shown.length ? `showing ${shown.length} of ${matched} matching reviews, worst-rated first` : undefined,
      });
    }

    case "get_app_verdict": {
      const slug = s(args.niche);
      const id = s(args.appId);
      const set = RATING[slug];
      const app = set?.apps?.find((x) => String(x.id) === id);
      if (!app) throw new Error(`No people's-rating entry for app ${id} in niche "${slug}".`);
      return json({
        niche: slug,
        appId: String(app.id),
        title: app.title,
        realScore: app.realScore,
        storeAverage: app.storeAvg,
        storeRatings: app.ratings,
        reviewsRead: app.nrev,
        inflationCheck: app.authenticity,
        inflationNote: app.authNote,
        verdict: app.verdict,
        loved: app.loved,
        weak: app.weak,
        whoFor: app.whoFor,
      });
    }

    case "get_niche_rating": {
      const slug = s(args.niche);
      const set = RATING[slug];
      if (!set) throw new Error(`No people's rating for niche "${slug}". Call list_niches for valid slugs.`);
      const limit = clamp(args.limit, 25, 100);
      const apps = [...(set.apps || [])].sort((x, y) => (y.realScore ?? 0) - (x.realScore ?? 0)).slice(0, limit);
      return json({
        niche: slug,
        name: set.name,
        appsRanked: set.apps?.length ?? 0,
        reviewsRead: set.totalReviews,
        apps: apps.map((a, i) => ({
          rank: i + 1,
          appId: String(a.id),
          title: a.title,
          realScore: a.realScore,
          storeAverage: a.storeAvg,
          inflationCheck: a.authenticity,
          loved: a.loved,
          weak: a.weak,
        })),
        note: (set.apps?.length ?? 0) > apps.length ? `top ${apps.length} of ${set.apps.length}` : undefined,
      });
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
