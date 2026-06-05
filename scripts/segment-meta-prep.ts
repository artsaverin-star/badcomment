import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Build a single mapping prompt asking an agent to assign each insight from
// every app in a segment to ONE of the segment's pre-authored meta-themes (or
// null if nothing fits). Output is a flat JSON keyed by "<productId>:<insightId>"
// so apply-segment-meta.ts can deterministically reduce it to the aggregations
// shown on /?seg=<slug>.
//
// Usage: npx tsx scripts/segment-meta-prep.ts <segmentSlug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: segment-meta-prep.ts <segmentSlug>");
  process.exit(1);
}

const themesFile = JSON.parse(readFileSync("src/data/segment-insight-themes.json", "utf8")) as Record<
  string,
  { name: string; themes: { key: string; label: string; desc: string }[] }
>;
const seg = themesFile[SLUG];
if (!seg) {
  console.error(`segment ${SLUG} not in src/data/segment-insight-themes.json`);
  process.exit(1);
}

const segments = JSON.parse(readFileSync("src/data/segments.json", "utf8")) as Array<{
  slug: string;
  appIds: string[];
  ru: { name: string };
}>;
const segmentDef = segments.find((s) => s.slug === SLUG);
if (!segmentDef) {
  console.error(`segment ${SLUG} not in src/data/segments.json`);
  process.exit(1);
}

type Insight = {
  id: string;
  title: string;
  theme?: string;
  observationCount?: number;
  evidence: { quote: string }[];
};
type ProductInsights = { productId: string; insights: Insight[] };

const allInsights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as ProductInsights[];
const inScope = allInsights.filter((p) => segmentDef.appIds.includes(p.productId));

type FlatInsight = {
  ref: string; // "<productId>:<insightId>"
  app: string; // product name
  title: string;
  theme?: string;
  obs: number;
  sample?: string; // one short quote for context
};

const productNames = new Map<string, string>();
for (const ctx of getContexts()) productNames.set(ctx.productId, ctx.name);

function getContexts(): { productId: string; name: string }[] {
  const out: { productId: string; name: string }[] = [];
  const files = ["calm", "headspace", "sleepcycle", "rise", "endel", "bettersleep", "pliability", "mindvalley", "insight-timer", "alarmy", "sleepwatch"];
  for (const f of files) {
    const path = `app-context/${f}.json`;
    if (!existsSync(path)) continue;
    const ctx = JSON.parse(readFileSync(path, "utf8")) as { productId: string; name: string };
    out.push({ productId: ctx.productId, name: ctx.name });
  }
  return out;
}

const flat: FlatInsight[] = [];
for (const p of inScope) {
  const appName = productNames.get(p.productId) ?? p.productId;
  for (const i of p.insights) {
    flat.push({
      ref: `${p.productId}:${i.id}`,
      app: appName,
      title: i.title,
      theme: i.theme,
      obs: i.observationCount ?? i.evidence.length,
      sample: i.evidence[0]?.quote?.slice(0, 140),
    });
  }
}

const themesBlock = seg.themes
  .map((t, i) => `${i + 1}. "${t.key}" — ${t.label}\n   ${t.desc}`)
  .join("\n\n");

const PROMPT = `You are mapping per-app product insights to a fixed set of segment-wide meta-themes for the "${seg.name}" segment.

INPUT
${flat.length} insights from ${inScope.length} apps. Each insight is a mechanism-level observation about ONE app, already clustered and titled. Many of these mechanisms repeat across apps in different vocabulary — your job is to recognise that and label them with a shared meta-theme so the segment page can show "this problem appears in N of ${inScope.length} apps".

META-THEMES (fixed list — assign exactly one per insight, or null if nothing fits)

${themesBlock}

RULES
- One meta-theme per insight. If genuinely orthogonal, pick the dominant mechanism.
- Use \`null\` if the insight is too app-specific, too niche, or doesn't substantively match any meta-theme. Don't force-fit.
- Read the insight's title AND the sample quote (where present). The title is sometimes shorthand; the quote is ground truth.
- Pricing-only ("too expensive") shouldn't have ended up here at all — the upstream filter dropped commodity rage. But if it slipped through, set null, do not map to paywall-coverage. paywall-coverage = a specific feature/content moved behind a paywall.
- billing-traps = the user describes a specific deceptive mechanism (charge after cancel, day-zero charge, ghost subscription). Generic "hard to cancel" is null.
- fails-at-night = the failure mode is specifically audio/playback/alarm at sleep time. Generic crash is null. Update-induced playback regression goes to update-broke-things.
- update-broke-things = the user explicitly attributes the loss to an update / version change.
- ads-before-sleep = upsell popups, in-app ads, full-screen interrupts (even outside literal bedtime). Includes ads in paid tier.
- support-ignores = explicit support unresponsiveness, AI-bot loops, broken contact forms.
- tracking-inaccurate = the sleep/energy algorithm reports something the user can't reconcile with reality (and it's not an update-attributed regression).
- content-not-calming = the content itself fails its purpose (story too short, voice annoying, AI flat, depth missing).
- missing-feature = "add X" or "would be nice if". Not a complaint about a broken existing feature.

OUTPUT
A single JSON object, no markdown fences, no prose. Schema:

{
  "mappings": {
    "<ref>": "<meta-theme-key>" | null
  }
}

Every insight ref from the input MUST appear as a key in mappings, exactly once.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool. Nothing else.
- Do NOT write helper scripts. Do NOT use Python or Bash. Read once, think, write once.

INSIGHTS:
${JSON.stringify(flat, null, 2)}
`;

mkdirSync("segment-meta/in", { recursive: true });
writeFileSync(`segment-meta/in/${SLUG}.txt`, PROMPT);
console.log(`wrote segment-meta/in/${SLUG}.txt`);
console.log(`  segment: ${seg.name} (${SLUG})`);
console.log(`  apps: ${inScope.length} / segment defined for ${segmentDef.appIds.length}`);
console.log(`  insights to map: ${flat.length}`);
console.log(`  meta-themes: ${seg.themes.length}`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
