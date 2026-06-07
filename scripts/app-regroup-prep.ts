import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Second-pass grouping: take an app's already-assembled mechanism-level
// insight clusters and group them into a SMALL set (5-8) of bespoke,
// app-specific parent themes with natural Russian names — derived from this
// app's actual content, not the generic 7-theme grid.
//
// Usage: npx tsx scripts/app-regroup-prep.ts <slug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-regroup-prep.ts <slug>");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath}`);
  process.exit(1);
}
const ctx = JSON.parse(readFileSync(contextPath, "utf8")) as { productId: string; name: string; domain: string };
const PRODUCT_ID = ctx.productId;

type Insight = { id: string; title: string; theme?: string; observationCount?: number; evidence: unknown[] };
type Product = { productId: string; insights: Insight[] };

const all = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Product[];
const product = all.find((p) => p.productId === PRODUCT_ID);
if (!product) {
  console.error(`no insights for ${PRODUCT_ID}`);
  process.exit(1);
}

const forAgent = product.insights.map((i) => ({
  id: i.id,
  title: i.title,
  obs: i.observationCount ?? i.evidence.length,
}));

const PROMPT = `You are grouping ${forAgent.length} mechanism-level insight clusters from ${ctx.name} (${ctx.domain}) into a SMALL set of bespoke parent themes.

These clusters are already clean and final — DO NOT rewrite, split, or merge them. Your only job is to sort them into parent themes that are SPECIFIC TO ${ctx.name}, derived from what's actually here — not a generic product-area grid.

YOUR JOB
1) Read all ${forAgent.length} insight titles.
2) Invent 5-8 parent themes that genuinely describe THIS app's landscape. Names must be natural Russian, concrete, and specific to ${ctx.name} — what a thoughtful person would title these clusters if they'd read all of them.
3) Assign every insight id to EXACTLY ONE parent theme.

THEME NAME STYLE
✅ GOOD (specific, natural, describes the actual content):
- "Биллинг-ловушки и навязчивый апсейл"
- "Голоса и рассказчики — на ком держится лояльность"
- "Ночной ритуал: сон, истории, переходы"
- "Как Calm используют на самом деле"
- "Поломки после обновлений"
❌ BAD (generic top-down grid — do NOT produce):
- "Стратегия и сегменты"
- "Подписка и оплата"
- "Контент и каталог"
- "Интерфейс"

Rules:
- 5-8 themes. Not more, not fewer.
- Plain Russian. Brand names ok where load-bearing.
- Each theme should hold a coherent set — if a theme would hold just 1-2 clusters, fold them into the nearest fitting theme.
- Order themes by total observation count desc (loudest first).

OUTPUT SCHEMA — exactly this shape, no extra keys, no markdown fences

{
  "groups": [
    {
      "id": "<short-kebab-slug>",
      "name": "<natural Russian theme name specific to ${ctx.name}>",
      "insight_ids": ["<id>", ...]
    }
  ]
}

Every id from the INSIGHTS list MUST appear in EXACTLY ONE group's insight_ids.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool to: /Users/artsaverin/projects/badcomment/regroup/out/${PRODUCT_ID}.json
- Do NOT write helper scripts. Do NOT use Python or Bash. Read → think → write → stop.

INSIGHTS:
${JSON.stringify(forAgent, null, 1)}
`;

mkdirSync("regroup/in", { recursive: true });
mkdirSync("regroup/out", { recursive: true });
writeFileSync(`regroup/in/${PRODUCT_ID}.txt`, PROMPT);
console.log(`wrote regroup/in/${PRODUCT_ID}.txt`);
console.log(`  app: ${ctx.name} (${SLUG})`);
console.log(`  ${forAgent.length} clusters to regroup`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
