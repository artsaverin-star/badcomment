import crypto from "node:crypto";
import type { SessionUser } from "@/lib/session";
import {
  getApp,
  getNichePatterns,
  listNiches,
  listReviewCatalogue,
  listSourceApps,
  readReviews,
  split,
  totals,
  progress as reviewProgress,
  type Polarity,
  type ReviewTheme,
} from "@/lib/reviews";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { DOSSIER_BY_SLUG } from "@/data/dossier";
import channelsData from "@/data/channels.json";
import { getNicheThesis } from "@/lib/nicheThesis";
import { marketFor, scoreFor } from "@/lib/ideaScores";
import { listIdeas, getIdea } from "@/lib/ideas";
import { categoryCards } from "@/lib/regenCards";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import { accessForUser } from "./access";

// The MCP surface is deliberately workflow-shaped: start with one compact
// niche report, then drill into competitors, themes and the exact reviews.

const CORPUS = totals();
export const SAMPLE_NICHE = "dating-apps";

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

const SUPPORTED_SLUGS = new Set(listReviewCatalogue("ru").map((niche) => niche.slug).filter((slug) => listSourceApps(slug).length > 0 && RATING[slug]));
const DEEP_SLUGS = new Set(listNiches("ru").map((niche) => niche.slug));

type JsonSchema = Record<string, unknown>;
type ToolInputSchema = { type: "object"; properties: Record<string, JsonSchema>; required?: string[]; additionalProperties: false };

export type Tool = {
  name: string;
  title: string;
  description: string;
  inputSchema: ToolInputSchema;
  outputSchema: JsonSchema;
  annotations: { readOnlyHint: true; destructiveHint: false; idempotentHint: true; openWorldHint: false };
};

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false } as const;
const str = (description: string, extra: JsonSchema = {}) => ({ type: "string", description, ...extra });
const num = (description: string, minimum = 1, maximum = 200) => ({ type: "integer", description, minimum, maximum });
const cursor = str("Opaque nextCursor returned by the previous call.");
const input = (properties: Record<string, JsonSchema> = {}, required?: string[]): ToolInputSchema => ({ type: "object", properties, ...(required?.length ? { required } : {}), additionalProperties: false });
const output = (properties: Record<string, JsonSchema>, required: string[]): JsonSchema => ({ type: "object", properties, required, additionalProperties: true });
const arr = (description: string) => ({ type: "array", description, items: { type: "object", additionalProperties: true } });

export const TOOLS: Tool[] = [
  {
    name: "account_status",
    title: "Check inApp access",
    description: "Confirm that the MCP connection works and see whether this account has full access. Free after sign-in.",
    inputSchema: input(),
    outputSchema: output({ connected: { type: "boolean" }, fullAccess: { type: "boolean" }, freeTools: { type: "array", items: { type: "string" } }, sampleNiche: { type: "string" } }, ["connected", "fullAccess", "freeTools", "sampleNiche"]),
    annotations: RO,
  },
  {
    name: "list_niches",
    title: "Find researched app niches",
    description: `Search and page through the ${CORPUS.sourceNiches} app categories backed by inApp's review corpus. Free after sign-in; use the returned niche slug in every other research tool.`,
    inputSchema: input({ query: str("Optional words from the Russian name, English name or slug."), deepEditorialOnly: { type: "boolean", description: "Only niches with the additional app-specific editorial theme layer." }, limit: num("Page size, default 30.", 1, 100), cursor }),
    outputSchema: output({ niches: arr("Niche summaries."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] }, coverage: { type: "object", additionalProperties: true } }, ["niches", "total", "nextCursor", "coverage"]),
    annotations: RO,
  },
  {
    name: "research_niche",
    title: "Research a niche in one call",
    description: `A compact first-pass report: market thesis, audience, top pains and praise, genuinely liked competitors and the strongest product ideas. The ${SAMPLE_NICHE} sample is free; other niches require full access.`,
    inputSchema: input({ niche: str("Niche slug from list_niches.") }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, thesis: { type: ["string", "null"] }, audience: arr("Audience segments."), topPains: arr("Largest complaint themes."), topPraise: arr("Largest praise themes."), leaders: arr("Top review-based competitors."), ideas: arr("Top product ideas.") }, ["niche", "audience", "topPains", "topPraise", "leaders", "ideas"]),
    annotations: RO,
  },
  {
    name: "get_niche_brief",
    title: "Get a niche brief",
    description: "The complete market thesis, revenue and install estimates, prices users mention, and audience segments with their jobs, gaps and willingness to pay. Requires full access.",
    inputSchema: input({ niche: str("Niche slug from list_niches.") }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, name: { type: "string" }, thesis: { type: ["string", "null"] }, market: { type: ["object", "null"], additionalProperties: true }, audience: arr("Audience segments.") }, ["niche", "name", "audience"]),
    annotations: RO,
  },
  {
    name: "list_niche_findings",
    title: "Page through a niche's findings",
    description: "Recurring product patterns, what works and breaks, observation counts, apps and verbatim evidence. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), limit: num("Page size, default 20.", 1, 100), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, findings: arr("Research findings."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "findings", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "get_distribution_channels",
    title: "Find a niche's acquisition channels",
    description: "Channels users explicitly mention in reviews, with mention counts and verbatim examples. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), limit: num("Page size, default 8.", 1, 40), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, channels: arr("Acquisition channels."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "channels", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "find_apps",
    title: "Find apps by name",
    description: "Search all apps by name and return the niche slug, App Store id and review count needed by the app tools. Requires full access.",
    inputSchema: input({ query: str("Part of an app name, case-insensitive."), limit: num("Page size, default 20.", 1, 100), cursor }, ["query"]),
    outputSchema: output({ query: { type: "string" }, apps: arr("Matching apps."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["query", "apps", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "list_niche_apps",
    title: "Page through apps in a niche",
    description: "The competitive field with review counts, labelling depth, praise/pain assignment shares and loudest themes. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), limit: num("Page size, default 30.", 1, 100), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, apps: arr("Apps in the niche."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "apps", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "get_app_verdict",
    title: "Get an app's review-based verdict",
    description: "The people's-rating score, storefront comparison, inflation check, verdict, strengths, weaknesses and best-fit audience. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), appId: str("Numeric App Store id from find_apps or list_niche_apps.") }, ["niche", "appId"]),
    outputSchema: output({ niche: { type: "string" }, appId: { type: "string" }, title: { type: "string" }, realScore: { type: ["number", "null"] }, verdict: { type: ["string", "null"] } }, ["niche", "appId", "title"]),
    annotations: RO,
  },
  {
    name: "get_niche_rating",
    title: "Page through a niche's real-quality ranking",
    description: "Apps ranked by what review texts say rather than storefront stars, including the inflation check. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), limit: num("Page size, default 25.", 1, 100), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, apps: arr("Ranked apps."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "apps", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "list_niche_themes",
    title: "List the loudest themes in a niche",
    description: "Answer broad questions such as 'what do users complain about?' without knowing a keyword first. Aggregates matching theme assignments across apps. Requires full access except inside the free sample report.",
    inputSchema: input({ niche: str("Niche slug."), polarity: { type: "string", enum: ["love", "pain", "mixed"], description: "Optional praise, complaint or mixed filter." }, includeFallback: { type: "boolean", description: "Include honest nonspecific remainder themes; default false." }, limit: num("Page size, default 30.", 1, 100), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, themes: arr("Aggregated niche themes."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] }, countingNote: { type: "string" } }, ["niche", "themes", "total", "nextCursor", "countingNote"]),
    annotations: RO,
  },
  {
    name: "search_themes",
    title: "Search recurring review themes",
    description: "Search Russian and English theme names across the corpus, optionally inside one niche and by polarity. A niche alone is enough for a broad search. Requires full access.",
    inputSchema: input({ query: str("Optional words to match, e.g. subscription, offline, sync."), niche: str("Optional niche slug. Required when query is empty."), polarity: { type: "string", enum: ["love", "pain", "mixed"] }, minCount: num("Minimum theme assignments, default 10.", 1, 1000000), limit: num("Page size, default 30.", 1, 100), cursor }),
    outputSchema: output({ query: { type: ["string", "null"] }, themes: arr("Matching themes aggregated inside each niche."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] }, countingNote: { type: "string" } }, ["themes", "total", "nextCursor", "countingNote"]),
    annotations: RO,
  },
  {
    name: "get_app_themes",
    title: "Page through one app's themes",
    description: "Every topic assigned to an app's reviews, with polarity, assignment count, review share, specificity and labelling scope. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), appId: str("Numeric App Store id."), includeFallback: { type: "boolean" }, limit: num("Page size, default 50.", 1, 100), cursor }, ["niche", "appId"]),
    outputSchema: output({ niche: { type: "string" }, appId: { type: "string" }, title: { type: "string" }, themes: arr("App themes."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "appId", "title", "themes", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "get_app_reviews",
    title: "Page through an app's labelled reviews",
    description: "Exact review texts with stable ids, App Store link, rating and every assigned theme. Filter by theme, stars and text; paginate through every match. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), appId: str("Numeric App Store id."), theme: str("Exact theme name from get_app_themes."), minRating: num("Lowest rating, default 1.", 1, 5), maxRating: num("Highest rating, default 5.", 1, 5), contains: str("Optional case-insensitive substring."), sort: { type: "string", enum: ["source", "rating_asc", "rating_desc"], description: "Default rating_asc." }, limit: num("Page size, default 25.", 1, 100), cursor }, ["niche", "appId"]),
    outputSchema: output({ niche: { type: "string" }, appId: { type: "string" }, title: { type: "string" }, reviews: arr("Exact reviews."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] }, sourceNote: { type: "string" } }, ["niche", "appId", "title", "reviews", "total", "nextCursor", "sourceNote"]),
    annotations: RO,
  },
  {
    name: "list_ideas",
    title: "Page through product ideas for a niche",
    description: "Buildable ideas derived from recurring review evidence, with mechanisms and demand, money and simplicity scores. Requires full access.",
    inputSchema: input({ niche: str("Niche slug."), limit: num("Page size, default 10.", 1, 40), cursor }, ["niche"]),
    outputSchema: output({ niche: { type: "string" }, ideas: arr("Product ideas."), total: { type: "integer" }, nextCursor: { type: ["string", "null"] } }, ["niche", "ideas", "total", "nextCursor"]),
    annotations: RO,
  },
  {
    name: "get_idea",
    title: "Get a complete product idea",
    description: "The gap, pitch, feature set, deliberate exclusions, monetization and verbatim evidence behind one idea. Requires full access.",
    inputSchema: input({ idea: str("Idea slug from list_ideas.") }, ["idea"]),
    outputSchema: output({ idea: { type: "string" }, niche: { type: "string" }, title: { type: "string" }, gap: { type: ["string", "null"] }, features: { type: "array" }, monetization: { type: ["string", "object", "array", "null"] }, reviewQuotes: arr("Verbatim evidence.") }, ["idea", "niche", "title", "reviewQuotes"]),
    annotations: RO,
  },
];

export const SERVER_INSTRUCTIONS = `inApp turns real App Store reviews into product research: ${CORPUS.sourceNiches} supported app categories, ${CORPUS.sourceApps.toLocaleString("en-US")} apps and ${CORPUS.sourceReviews.toLocaleString("en-US")} individually labelled reviews.

Start with account_status, then list_niches and research_niche. For a broad question such as "what do people complain about in this niche?", call list_niche_themes with polarity "pain". Use find_apps, get_app_themes and get_app_reviews to drill down to exact verbatim evidence. Use nextCursor until it is null when the user asks for exhaustive coverage.

Every review has a corpus-topic or an honest nonspecific remainder. ${CORPUS.reviews.toLocaleString("en-US")} reviews across ${CORPUS.niches} niches also have the deeper app-specific editorial layer. Theme totals count assignments; one review can carry more than one theme.

account_status and list_niches are free after sign-in. research_niche is also free for the ${SAMPLE_NICHE} sample. All other research requires lifetime access. OAuth connections are short-lived, resource-bound and individually revocable at https://inapp.pro/ru/mcp.`;

export class McpToolError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "McpToolError";
  }
}

const s = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const clamp = (value: unknown, fallback: number, maximum: number) => {
  const parsed = typeof value === "number" && Number.isInteger(value) ? value : fallback;
  return Math.max(1, Math.min(maximum, parsed));
};

function encodeCursor(offset: number): string {
  return `c_${Buffer.from(String(offset)).toString("base64url")}`;
}

function decodeCursor(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value !== "string" || !value.startsWith("c_")) throw new McpToolError("invalid_cursor", "cursor is invalid; use nextCursor exactly as returned by the previous call.");
  const decoded = Number(Buffer.from(value.slice(2), "base64url").toString());
  if (!Number.isSafeInteger(decoded) || decoded < 0) throw new McpToolError("invalid_cursor", "cursor is invalid; use nextCursor exactly as returned by the previous call.");
  return decoded;
}

function page<T>(items: T[], args: Record<string, unknown>, fallback: number, maximum: number) {
  const offset = decodeCursor(args.cursor);
  const limit = clamp(args.limit, fallback, maximum);
  const values = items.slice(offset, offset + limit);
  return {
    values,
    total: items.length,
    shown: values.length,
    nextCursor: offset + values.length < items.length ? encodeCursor(offset + values.length) : null,
    offset,
  };
}

function assertNiche(slug: string): RatingSet {
  const rating = RATING[slug];
  if (!slug || !rating || !SUPPORTED_SLUGS.has(slug)) throw new McpToolError("unknown_niche", `Unknown niche "${slug}". Call list_niches for supported slugs.`);
  return rating;
}

function themeShare(theme: ReviewTheme, total: number) {
  return Math.round((theme.count / Math.max(1, total)) * 1000) / 10;
}

type AggregatedTheme = {
  theme: string;
  en: string;
  polarity: Polarity;
  assignments: number;
  apps: number;
  shareOfNicheReviewsPct: number;
  scopes: string[];
  topApps: { appId: string; app: string; assignments: number }[];
  fallback: boolean;
};

function aggregateNicheThemes(slug: string, options: { polarity?: string; includeFallback?: boolean } = {}): AggregatedTheme[] {
  const apps = listSourceApps(slug);
  const totalReviews = apps.reduce((sum, app) => sum + app.total, 0);
  const grouped = new Map<string, { theme: string; en: string; polarity: Polarity; assignments: number; scopes: Set<string>; appRows: { appId: string; app: string; assignments: number }[]; fallback: boolean }>();
  for (const app of apps) {
    for (const theme of app.themes) {
      if (!options.includeFallback && theme.fallback) continue;
      if (options.polarity && theme.polarity !== options.polarity) continue;
      const key = `${theme.name}\u0000${theme.polarity}`;
      const current = grouped.get(key) ?? { theme: theme.name, en: theme.nameEn, polarity: theme.polarity, assignments: 0, scopes: new Set<string>(), appRows: [], fallback: !!theme.fallback };
      current.assignments += theme.count;
      if (theme.scope) current.scopes.add(theme.scope);
      current.appRows.push({ appId: app.id, app: app.title, assignments: theme.count });
      grouped.set(key, current);
    }
  }
  return [...grouped.values()]
    .map((theme) => ({
      theme: theme.theme,
      en: theme.en,
      polarity: theme.polarity,
      assignments: theme.assignments,
      apps: theme.appRows.length,
      shareOfNicheReviewsPct: Math.round((theme.assignments / Math.max(1, totalReviews)) * 1000) / 10,
      scopes: [...theme.scopes],
      topApps: theme.appRows.sort((a, b) => b.assignments - a.assignments).slice(0, 5),
      fallback: theme.fallback,
    }))
    .sort((a, b) => b.assignments - a.assignments || a.theme.localeCompare(b.theme));
}

function ideaSummary(niche: string) {
  return listIdeas()
    .filter((idea) => idea.category === niche)
    .map((idea) => {
      const scores = scoreFor(idea.slug);
      return {
        idea: idea.slug,
        title: idea.title,
        oneLiner: idea.oneLiner,
        derivedFrom: idea.stats,
        mechanisms: idea.mechanisms?.map((mechanism) => ({ mechanism: mechanism.title, observations: mechanism.obsCount, polarity: mechanism.polarity })) ?? [],
        scores: scores ? { demand: scores.demand, money: scores.money, simplicity: scores.simplicity, composite: scores.composite } : null,
        whoPays: scores?.targetSegment ?? null,
        pricePoint: scores?.pricePoint ?? null,
      };
    });
}

function briefFor(slug: string) {
  const set = assertNiche(slug);
  const thesis = getNicheThesis(slug);
  const market = marketFor(slug);
  const dossier = DOSSIER[slug];
  return {
    niche: slug,
    name: set.name,
    nameEn: set.nameEn ?? null,
    appsRated: set.count ?? set.apps?.length ?? 0,
    reviewsRead: set.totalReviews ?? 0,
    inflatedApps: set.inflated ?? 0,
    thesis: thesis?.governing ?? null,
    competitorRead: thesis?.competitorRead ?? null,
    pillars: thesis?.pillars?.map((pillar) => ({ title: pillar.title, dek: pillar.dek })) ?? [],
    market: market
      ? {
          annualRevenueEstimate: market.revenue ? { low: market.revenue.low, high: market.revenue.high, annualPricePerUser: market.revenue.annualPrice, note: market.revenue.note } : null,
          storeRatingsTotal: market.ratingsTotal,
          pricesUsersMention: market.pricesTop?.slice(0, 6) ?? [],
          paymentSignals: market.signals,
          installs: market.installs ? { totalMin: market.installs.totalMin, totalMax: market.installs.totalMax, paidApps: market.installs.paidApps, iapApps: market.installs.iapApps } : null,
        }
      : null,
    audience:
      dossier?.audience?.segments?.map((segment) => ({ segment: segment.name, job: segment.job, paysHow: segment.payLevel, whyItPays: segment.payNote ?? null, gap: segment.gap, servedBy: segment.servedBy })) ?? [],
    audienceTakeaway: dossier?.audience?.takeaway ?? null,
    whereTheMoneyIs: dossier?.market?.money ?? null,
    marketLead: dossier?.market?.marketLead ?? null,
  };
}

function ratingRows(slug: string) {
  return [...(assertNiche(slug).apps || [])].sort((a, b) => (b.realScore ?? 0) - (a.realScore ?? 0));
}

export function toolIsFree(name: string, args: Record<string, unknown>) {
  return name === "account_status" || name === "list_niches" || (name === "research_niche" && s(args.niche) === SAMPLE_NICHE);
}

export function validateToolArgs(name: string, args: unknown): Record<string, unknown> {
  const tool = TOOLS.find((candidate) => candidate.name === name);
  if (!tool) throw new McpToolError("unknown_tool", `Unknown tool: ${name}`);
  if (!args || typeof args !== "object" || Array.isArray(args)) throw new McpToolError("invalid_arguments", "Tool arguments must be an object.");
  const values = args as Record<string, unknown>;
  const allowed = new Set(Object.keys(tool.inputSchema.properties));
  const extra = Object.keys(values).filter((key) => !allowed.has(key));
  if (extra.length) throw new McpToolError("invalid_arguments", `Unknown argument${extra.length > 1 ? "s" : ""}: ${extra.join(", ")}.`);
  for (const required of tool.inputSchema.required ?? []) {
    if (!(required in values) || values[required] === "") throw new McpToolError("invalid_arguments", `${required} is required.`);
  }
  for (const [key, value] of Object.entries(values)) {
    if (value == null) continue;
    const schema = tool.inputSchema.properties[key];
    if (schema.type === "string" && typeof value !== "string") throw new McpToolError("invalid_arguments", `${key} must be a string.`);
    if (schema.type === "boolean" && typeof value !== "boolean") throw new McpToolError("invalid_arguments", `${key} must be a boolean.`);
    if (schema.type === "integer" && (!Number.isInteger(value) || typeof value !== "number")) throw new McpToolError("invalid_arguments", `${key} must be an integer.`);
    if (typeof value === "number" && typeof schema.minimum === "number" && value < schema.minimum) throw new McpToolError("invalid_arguments", `${key} must be at least ${schema.minimum}.`);
    if (typeof value === "number" && typeof schema.maximum === "number" && value > schema.maximum) throw new McpToolError("invalid_arguments", `${key} must be at most ${schema.maximum}.`);
    if (Array.isArray(schema.enum) && !schema.enum.includes(value)) throw new McpToolError("invalid_arguments", `${key} must be one of: ${schema.enum.join(", ")}.`);
  }
  if (name === "search_themes" && !s(values.query) && !s(values.niche)) throw new McpToolError("invalid_arguments", "Provide query, niche, or both. Use list_niche_themes for a broad niche question.");
  if (name === "get_app_reviews" && typeof values.minRating === "number" && typeof values.maxRating === "number" && values.minRating > values.maxRating) throw new McpToolError("invalid_arguments", "minRating cannot be greater than maxRating.");
  return values;
}

export type McpCaller = {
  user: SessionUser | null;
  connection?: { id: string; clientName: string; locale: string };
};

export async function callTool(name: string, rawArgs: Record<string, unknown>, caller: McpCaller): Promise<Record<string, unknown>> {
  const args = validateToolArgs(name, rawArgs);
  const access = await accessForUser(caller.user);
  if (!access.unlimited && !toolIsFree(name, args)) {
    throw new McpToolError(
      "payment_required",
      `Full inApp MCP research requires lifetime access. One payment of ${ACCESS_PRICE_RUB} RUB opens the whole site and every MCP research tool: https://inapp.pro/ru/mcp`,
    );
  }

  switch (name) {
    case "account_status":
      return {
        connected: true,
        client: caller.connection?.clientName ?? null,
        fullAccess: access.unlimited,
        freeTools: ["account_status", "list_niches", `research_niche(${SAMPLE_NICHE})`],
        sampleNiche: SAMPLE_NICHE,
        priceRub: ACCESS_PRICE_RUB,
        manageConnections: "https://inapp.pro/ru/mcp#connections",
      };

    case "list_niches": {
      const query = s(args.query).toLowerCase();
      const deepOnly = args.deepEditorialOnly === true;
      const rows = Object.entries(RATING)
        .filter(([slug]) => SUPPORTED_SLUGS.has(slug))
        .map(([slug, set]) => {
          const sourceApps = listSourceApps(slug);
          const sourceThemes = sourceApps.flatMap((app) => app.themes);
          const assignments = sourceApps.reduce((sum, app) => sum + app.themeAssignments, 0);
          const sourceSplit = split(sourceThemes);
          const market = marketFor(slug);
          const sourceReviews = sourceApps.reduce((sum, app) => sum + app.total, 0);
          const specificReviews = sourceApps.reduce((sum, app) => sum + app.specificReviews, 0);
          return {
            niche: slug,
            name: set.name,
            nameEn: set.nameEn,
            apps: sourceApps.length,
            reviews: sourceReviews,
            annualRevenueEstimate: market?.revenue ? { low: market.revenue.low, high: market.revenue.high } : null,
            ideas: listIdeas().filter((idea) => idea.category === slug).length,
            labelling: {
              corpusPerReview: true,
              deepEditorial: DEEP_SLUGS.has(slug),
              specificReviews,
              specificCoveragePct: Math.round((specificReviews / Math.max(1, sourceReviews)) * 1000) / 10,
              themeAssignments: assignments,
              praiseAssignmentPct: Math.round(sourceSplit.lovePct),
              complaintAssignmentPct: Math.round(sourceSplit.painPct),
            },
          };
        })
        .filter((row) => !deepOnly || row.labelling.deepEditorial)
        .filter((row) => !query || `${row.niche} ${row.name} ${row.nameEn ?? ""}`.toLowerCase().includes(query))
        .sort((a, b) => b.reviews - a.reviews);
      const paged = page(rows, args, 30, 100);
      return {
        niches: paged.values,
        total: paged.total,
        shown: paged.shown,
        nextCursor: paged.nextCursor,
        coverage: {
          corpus: { niches: SUPPORTED_SLUGS.size, apps: CORPUS.sourceApps, reviews: CORPUS.sourceReviews, individuallyLabelled: CORPUS.labelledReviews },
          deepEditorial: { niches: reviewProgress.nichesDone, apps: reviewProgress.appsDone, reviews: CORPUS.reviews },
          note: "Every review has corpus topics or an honest nonspecific remainder. The deep editorial layer adds app-specific themes to the stated subset.",
        },
      };
    }

    case "research_niche": {
      const slug = s(args.niche);
      const brief = briefFor(slug);
      const pains = aggregateNicheThemes(slug, { polarity: "pain" }).slice(0, 8);
      const praise = aggregateNicheThemes(slug, { polarity: "love" }).slice(0, 5);
      const leaders = ratingRows(slug).slice(0, 5).map((app, index) => ({ rank: index + 1, appId: String(app.id), title: app.title, realScore: app.realScore, storeAverage: app.storeAvg, loved: app.loved, weak: app.weak }));
      return { ...brief, sample: slug === SAMPLE_NICHE, topPains: pains, topPraise: praise, leaders, ideas: ideaSummary(slug).slice(0, 5), nextSteps: { exactThemeEvidence: "get_app_themes → get_app_reviews", exhaustiveThemes: "list_niche_themes with nextCursor", competitors: "get_niche_rating" } };
    }

    case "get_niche_brief":
      return briefFor(s(args.niche));

    case "list_niche_findings": {
      const slug = s(args.niche);
      assertNiche(slug);
      const cards = categoryCards(slug);
      const patterns = getNichePatterns(slug, "ru");
      if (!patterns.length && !cards) throw new McpToolError("not_available", `No breakdown for niche "${slug}".`);
      const rows = patterns.length
        ? patterns.map((finding) => ({
            finding: finding.title,
            works: finding.plus || null,
            breaks: finding.minus || null,
            observations: finding.count ?? null,
            apps: finding.apps,
            quotes: finding.evidence.slice(0, 5).map((evidence) => ({ app: evidence.app ?? "", rating: evidence.rating, quote: evidence.quote })),
          }))
        : (cards?.product ?? []).map((finding) => ({
            finding: finding.title,
            works: finding.plus || null,
            breaks: finding.minus || null,
            observations: finding.count,
            apps: finding.apps ?? [],
            quotes: finding.evidence.slice(0, 5).map((evidence) => ({ app: evidence.app ?? "", rating: evidence.rating, quote: evidence.quote })),
          }));
      const paged = page(rows, args, 20, 100);
      return {
        niche: slug,
        findings: paged.values,
        total: paged.total,
        shown: paged.shown,
        nextCursor: paged.nextCursor,
      };
    }

    case "get_distribution_channels": {
      const slug = s(args.niche);
      assertNiche(slug);
      const rows = CHANNELS[slug]?.channels;
      if (!rows?.length) throw new McpToolError("not_available", `No channel data for niche "${slug}" yet.`);
      const paged = page(rows, args, 8, 40);
      return { niche: slug, channels: paged.values.map((channel) => ({ channel: channel.name, note: channel.note, mentions: channel.count, quotes: channel.quotes?.slice(0, 3) ?? [] })), total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor };
    }

    case "find_apps": {
      const query = s(args.query).toLowerCase();
      if (!query) throw new McpToolError("invalid_arguments", "query is required.");
      const rows = listReviewCatalogue("ru").flatMap((niche) => listSourceApps(niche.slug).filter((app) => app.title.toLowerCase().includes(query)).map((app) => ({ niche: niche.slug, nicheName: niche.name, appId: app.id, title: app.title, reviewsRead: app.total, appStoreUrl: `https://apps.apple.com/app/id${app.id}` }))).sort((a, b) => b.reviewsRead - a.reviewsRead || a.title.localeCompare(b.title));
      const paged = page(rows, args, 20, 100);
      return { query, apps: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor };
    }

    case "list_niche_apps": {
      const slug = s(args.niche);
      const set = assertNiche(slug);
      const rows = listSourceApps(slug).map((app) => {
        const assignmentSplit = split(app.themes);
        return { appId: app.id, title: app.title, reviewsRead: app.total, appStoreUrl: `https://apps.apple.com/app/id${app.id}`, perReviewLabelling: "complete", labellingLayer: app.labelling, specificReviews: app.specificReviews, themeAssignments: app.themeAssignments, praiseAssignmentPct: Math.round(assignmentSplit.lovePct), complaintAssignmentPct: Math.round(assignmentSplit.painPct), topThemes: app.themes.filter((theme) => !theme.fallback).slice(0, 5).map((theme) => ({ theme: theme.name, en: theme.nameEn, polarity: theme.polarity, assignments: theme.count, shareOfReviewsPct: themeShare(theme, app.total), scope: theme.scope })) };
      });
      const paged = page(rows, args, 30, 100);
      return { niche: slug, name: set.name, apps: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor, countingNote: "Praise and complaint percentages use theme assignments; a multi-labelled review contributes to more than one assignment." };
    }

    case "get_app_verdict": {
      const slug = s(args.niche);
      const appId = s(args.appId);
      const set = assertNiche(slug);
      const app = set.apps?.find((candidate) => String(candidate.id) === appId);
      if (!app) throw new McpToolError("unknown_app", `No people's-rating entry for app ${appId} in niche "${slug}".`);
      return { niche: slug, appId: String(app.id), title: app.title, appStoreUrl: `https://apps.apple.com/app/id${app.id}`, realScore: app.realScore ?? null, storeAverage: app.storeAvg ?? null, storeRatings: app.ratings ?? null, reviewsRead: app.nrev ?? null, inflationCheck: app.authenticity ?? null, inflationNote: app.authNote ?? null, verdict: app.verdict ?? null, loved: app.loved ?? null, weak: app.weak ?? null, whoFor: app.whoFor ?? null };
    }

    case "get_niche_rating": {
      const slug = s(args.niche);
      const set = assertNiche(slug);
      const rows = ratingRows(slug);
      const paged = page(rows, args, 25, 100);
      return { niche: slug, name: set.name, apps: paged.values.map((app, index) => ({ rank: paged.offset + index + 1, appId: String(app.id), title: app.title, appStoreUrl: `https://apps.apple.com/app/id${app.id}`, realScore: app.realScore ?? null, storeAverage: app.storeAvg ?? null, inflationCheck: app.authenticity ?? null, loved: app.loved ?? null, weak: app.weak ?? null })), total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor };
    }

    case "list_niche_themes": {
      const slug = s(args.niche);
      assertNiche(slug);
      const rows = aggregateNicheThemes(slug, { polarity: s(args.polarity), includeFallback: args.includeFallback === true });
      const paged = page(rows, args, 30, 100);
      return { niche: slug, themes: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor, countingNote: "Counts are theme assignments, not unique reviews. One review can carry more than one explicit theme." };
    }

    case "search_themes": {
      const query = s(args.query).toLowerCase();
      const niche = s(args.niche);
      const polarity = s(args.polarity);
      if (niche) assertNiche(niche);
      const minimum = clamp(args.minCount, 10, 1000000);
      const niches = listReviewCatalogue("ru").filter((row) => SUPPORTED_SLUGS.has(row.slug) && (!niche || row.slug === niche));
      const rows = niches.flatMap((row) => aggregateNicheThemes(row.slug, { polarity }).filter((theme) => theme.assignments >= minimum && (!query || `${theme.theme} ${theme.en}`.toLowerCase().includes(query))).map((theme) => ({ niche: row.slug, nicheName: row.name, ...theme }))).sort((a, b) => b.assignments - a.assignments || a.theme.localeCompare(b.theme));
      const paged = page(rows, args, 30, 100);
      return { query: query || null, niche: niche || null, themes: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor, countingNote: "Counts are theme assignments aggregated inside each niche; a review may contribute to multiple explicit themes." };
    }

    case "get_app_themes": {
      const slug = s(args.niche);
      const appId = s(args.appId);
      assertNiche(slug);
      const app = getApp(slug, appId);
      if (!app) throw new McpToolError("unknown_app", `No app ${appId} in niche "${slug}". Use find_apps first.`);
      const rows = app.themes.filter((theme) => args.includeFallback === true || !theme.fallback).map((theme) => ({ theme: theme.name, en: theme.nameEn, polarity: theme.polarity, assignments: theme.count, shareOfReviewsPct: themeShare(theme, app.total), specificity: theme.fallback ? "nonspecific_remainder" : "specific", scope: theme.scope }));
      const paged = page(rows, args, 50, 100);
      return { niche: slug, appId: app.id, title: app.title, appStoreUrl: `https://apps.apple.com/app/id${app.id}`, reviewsRead: app.total, perReviewLabelling: "complete", labellingLayer: app.labelling, themes: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor };
    }

    case "get_app_reviews": {
      const slug = s(args.niche);
      const appId = s(args.appId);
      assertNiche(slug);
      const app = getApp(slug, appId);
      if (!app) throw new McpToolError("unknown_app", `No app ${appId} in niche "${slug}". Use find_apps first.`);
      const theme = s(args.theme);
      if (theme && !app.themes.some((candidate) => candidate.name === theme)) throw new McpToolError("unknown_theme", `Unknown theme "${theme}". Call get_app_themes for exact names.`);
      const contains = s(args.contains).toLowerCase();
      const minRating = clamp(args.minRating, 1, 5);
      const maxRating = clamp(args.maxRating, 5, 5);
      const sort = s(args.sort) || "rating_asc";
      let rows = readReviews(slug, appId).map((review, sourceIndex) => ({ review, sourceIndex }));
      if (!rows.length) throw new McpToolError("not_available", `Review texts for ${appId} are not on this server.`);
      if (theme) rows = rows.filter(({ review }) => (review.themes?.length ? review.themes.includes(theme) : review.theme === theme));
      rows = rows.filter(({ review }) => review.rating >= minRating && review.rating <= maxRating && (!contains || review.text.toLowerCase().includes(contains)));
      if (sort === "rating_asc") rows.sort((a, b) => a.review.rating - b.review.rating || a.sourceIndex - b.sourceIndex);
      if (sort === "rating_desc") rows.sort((a, b) => b.review.rating - a.review.rating || a.sourceIndex - b.sourceIndex);
      const paged = page(rows, args, 25, 100);
      const appStoreUrl = `https://apps.apple.com/app/id${app.id}`;
      return {
        niche: slug,
        appId: app.id,
        title: app.title,
        appStoreUrl,
        filter: { theme: theme || null, minRating, maxRating, contains: contains || null, sort },
        reviews: paged.values.map(({ review, sourceIndex }, index) => ({ reviewId: `rv_${crypto.createHash("sha256").update(`${slug}|${appId}|${sourceIndex}|${review.rating}|${review.text}`).digest("base64url").slice(0, 20)}`, position: paged.offset + index + 1, rating: review.rating, themes: review.themes?.length ? review.themes : review.theme ? [review.theme] : [], text: review.text, appStoreUrl })),
        total: paged.total,
        shown: paged.shown,
        nextCursor: paged.nextCursor,
        sourceNote: "The source archive preserves rating, text and topic assignments. App Store review date, country and author were not present in this shipped corpus, so they are not invented here.",
      };
    }

    case "list_ideas": {
      const slug = s(args.niche);
      assertNiche(slug);
      const rows = ideaSummary(slug);
      if (!rows.length) throw new McpToolError("not_available", `No ideas published for niche "${slug}".`);
      const paged = page(rows, args, 10, 40);
      return { niche: slug, ideas: paged.values, total: paged.total, shown: paged.shown, nextCursor: paged.nextCursor };
    }

    case "get_idea": {
      const slug = s(args.idea);
      const idea = getIdea(slug);
      if (!idea) throw new McpToolError("unknown_idea", `Unknown idea "${slug}". Call list_ideas for valid slugs.`);
      const scores = scoreFor(idea.slug);
      return { idea: idea.slug, niche: idea.category, nicheName: idea.categoryName, title: idea.title, oneLiner: idea.oneLiner, derivedFrom: idea.stats, mechanisms: idea.mechanisms?.map((mechanism) => ({ mechanism: mechanism.title, observations: mechanism.obsCount, apps: mechanism.apps, polarity: mechanism.polarity })) ?? [], scores: scores ? { demand: scores.demand, money: scores.money, simplicity: scores.simplicity, composite: scores.composite } : null, gap: idea.gap ?? null, pitch: idea.idea?.pitch ?? null, features: idea.idea?.features ?? [], antiFeatures: idea.idea?.antiFeatures ?? [], monetization: idea.idea?.monetization ?? null, reviewQuotes: (idea.reviewGrid ?? []).map((quote) => ({ app: quote.app, rating: quote.rating, quote: quote.quote })) };
    }

    default:
      throw new McpToolError("unknown_tool", `Unknown tool: ${name}`);
  }
}
