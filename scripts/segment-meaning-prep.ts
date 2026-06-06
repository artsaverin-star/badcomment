import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

// Cross-app meaning clustering: take every per-app insight in a segment and
// group them by SEMANTIC MEANING (not by the artificial 7-theme buckets). Each
// emergent cluster gets a natural-language name describing what it's about,
// e.g. "Людям нравится голос знаменитых рассказчиков" or "Sleep stories
// обрываются среди ночи". Sentiment is tagged per-insight: praise / criticism
// / suggestion.
//
// Usage: npx tsx scripts/segment-meaning-prep.ts <segmentSlug>

const SLUG = process.argv[2];
if (!SLUG) { console.error("usage: <segmentSlug>"); process.exit(1); }

const cats = JSON.parse(readFileSync("src/data/categories.json", "utf8")) as Array<{ slug: string; ru: { name: string }; categories: Array<{ slug: string; ru: { name: string; kicker: string }; apps: string[] }> }>;
const meta = JSON.parse(readFileSync("src/data/categories-meta.json", "utf8")) as Record<string, { productId?: string; name: string }>;
const insightsData = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Array<{ productId: string; insights: Array<{ id: string; title: string; observationCount?: number; evidence: Array<{ quote: string; rating: number; date: string }>; theme?: string }> }>;

// Find the category and resolve its productIds
let category: { slug: string; ru: { name: string }; apps: string[] } | null = null;
let segName = "";
for (const dom of cats) {
  for (const c of dom.categories) {
    if (c.slug === SLUG) {
      category = c;
      segName = dom.ru.name + " / " + c.ru.name;
      break;
    }
  }
  if (category) break;
}
if (!category) { console.error(`category ${SLUG} not found`); process.exit(1); }

const productIdByApp: Record<string, { productId: string; name: string }> = {};
for (const appQuery of category.apps) {
  const m = meta[`${SLUG}:${appQuery}`];
  if (m?.productId) productIdByApp[m.productId] = { productId: m.productId, name: m.name };
}

const inScope = insightsData.filter((p) => productIdByApp[p.productId]);
console.log(`scope: ${inScope.length}/${category.apps.length} apps in ${SLUG} have insights`);

type FlatInsight = {
  ref: string; // <productId>:<insightId>
  app: string;
  title: string;
  obs: number;
  sample?: string;
};

const flat: FlatInsight[] = [];
for (const p of inScope) {
  const appName = productIdByApp[p.productId]?.name ?? p.productId;
  for (const ins of p.insights) {
    flat.push({
      ref: `${p.productId}:${ins.id}`,
      app: appName,
      title: ins.title,
      obs: ins.observationCount ?? ins.evidence.length,
      sample: ins.evidence[0]?.quote?.slice(0, 140),
    });
  }
}
console.log(`total insights: ${flat.length}`);

const PROMPT = `You are clustering ${flat.length} per-app insights from ${inScope.length} apps in the "${segName}" segment by **semantic meaning** — NOT by surface category. Two insights from different apps that describe the same idea (e.g. "людям нравится Гарри Стайлс как рассказчик в Calm" + "знаменитый narrator — главная причина retention в Headspace") belong to the SAME cluster.

YOUR JOB

1) Read every insight (title + sample quote where present).
2) Group them by what they're ACTUALLY ABOUT — the underlying user observation, not the originating app or product theme.
3) Name each cluster in plain Russian with a natural-language description of WHAT IT'S ABOUT. Examples:
   ✅ "Людям нравится голос знаменитых рассказчиков"
   ✅ "Sleep stories обрываются среди ночи и будят пользователя"
   ✅ "Биллинг: триал сразу превращается в годовую подписку без предупреждения"
   ✅ "Поиск по конкретному narrator не работает"
   ❌ "Стратегия и сегменты" (это была моя искусственная категория — НЕ ИСПОЛЬЗОВАТЬ)
   ❌ "Подписка и оплата" (слишком абстрактно)
4) Aim for 25-50 clusters. Don't collapse orthogonal meanings even if they're in the same "domain" (billing-trap and feature-gone-paywall are different things).
5) Tag each insight with sentiment:
   - "praise" = пользователь хвалит, что-то нравится
   - "criticism" = ломается / раздражает / тёмные паттерны / поломанные функции
   - "suggestion" = просьба добавить / улучшить / "было бы здорово если..."

SENTIMENT RULES
- Если инсайт описывает ПОЛОМКУ/проблему/раздражение → criticism
- Если инсайт описывает ЛЮБОВЬ/благодарность/ритуал, который работает → praise
- Если инсайт описывает ОТСУТСТВУЮЩУЮ функцию / запрос фичи → suggestion
- Спорные кейсы (например "не хватает Z" = и criticism и suggestion) → выбирай suggestion если основное — запрос на новую функцию; criticism если основное — текущая поломка

OUTPUT SCHEMA — ONE JSON OBJECT, no markdown fences, no prose:

{
  "clusters": [
    {
      "id": "<short-kebab-slug>",
      "name": "<natural-language Russian name of what the cluster is about>",
      "sentiment": "praise" | "criticism" | "suggestion",
      "insightRefs": ["<ref>", "<ref>", ...]
    }
  ],
  "sentimentByRef": {
    "<ref>": "praise" | "criticism" | "suggestion"
  }
}

Every ref from INSIGHTS below MUST appear in EXACTLY ONE cluster (insightRefs total = ${flat.length}). It must also appear in sentimentByRef.

Cluster sentiment = the dominant sentiment of the insights it contains. If mixed (e.g. cluster about "narrator voices" has both praise and complaints), choose the majority sentiment.

Sort clusters by total observation-count desc.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool to: /Users/artsaverin/projects/badcomment/segment-meaning/out/${SLUG}.json
- Do NOT write helper scripts. Do NOT use Python or Bash. Read → think → write → stop.

INSIGHTS:
${JSON.stringify(flat, null, 1)}
`;

mkdirSync("segment-meaning/in", { recursive: true });
mkdirSync("segment-meaning/out", { recursive: true });
writeFileSync(`segment-meaning/in/${SLUG}.txt`, PROMPT);
console.log(`wrote segment-meaning/in/${SLUG}.txt (${(PROMPT.length/1024).toFixed(0)} KB)`);
