import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Natural (theme-free) clustering for a single app. Instead of forcing into 7
// predefined themes, the agent names each cluster in plain Russian based on
// WHAT IT'S ACTUALLY ABOUT — the same approach as segment-meaning-prep.ts but
// for a single app's observations.
//
// Usage: npx tsx scripts/app-natural-prep.ts <slug>

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-natural-prep.ts <slug>  (slug = app-context/<slug>.json)");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath}`);
  process.exit(1);
}
const ctx = JSON.parse(readFileSync(contextPath, "utf8")) as {
  productId: string;
  name: string;
  domain: string;
};
const PRODUCT_ID = ctx.productId;

type Observation = {
  review_id: string;
  rating: number;
  observation: string;
  trigger: string;
  jtbd?: string;
  is_commodity?: boolean;
};

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as {
  flat: Observation[];
};
const nonCommodity = obsData.flat.filter((o) => !o.is_commodity);
const obsForAgent = nonCommodity.map((o, i) => ({
  obs_id: i,
  rating: o.rating,
  observation: o.observation,
  jtbd: o.jtbd ?? null,
}));

const PROMPT = `You are clustering ${obsForAgent.length} qualitative observations from ${ctx.name} (${ctx.domain}) into groups by SEMANTIC MEANING.

INPUT
Each observation is a 1-2 sentence note describing a specific product mechanism as described by a real user. Commodity complaints (generic billing/paywall/ads noise) have already been filtered out — what remains is substantive.

YOUR JOB
1) Read every observation (obs_id + observation + jtbd).
2) Group obs_ids by what they're ACTUALLY ABOUT — the underlying user experience, not the surface vocabulary.
3) Name each group in plain Russian with a natural-language description of WHAT IT'S ABOUT at mechanism level.
4) Tag each group's dominant sentiment.
5) Aim for 25-50 groups. Don't collapse orthogonal mechanisms. Single-obs groups are fine.

GROUP NAME STYLE

The name is what shows on the page. Write it like a short Russian sentence describing the mechanism, not a category label.

✅ GOOD names:
- Sleep Stories используются как совместный ритуал — муж и жена слушают вместе перед сном
- Кнопка «7 дней бесплатно» сразу списывает годовую подписку без пробного периода
- Любое прерывание — звонок, переключение приложения — сбрасывает медитацию в начало
- Поиск по конкретному рассказчику не работает или удалён
- Большинство пользователей пришли через работодателя или страховку, а не самостоятельно
- Знаменитости-рассказчики — главная причина почему люди остаются в приложении
- После обновления виджет перестаёт работать и требует повторной авторизации

❌ BAD names (would force a hand-rewrite):
- "Подписка и оплата" → слишком абстрактно, это категория, не механизм
- "Стратегия" → моя искусственная категория — НЕ ИСПОЛЬЗОВАТЬ
- "Контент и каталог" → снова категория, не наблюдение
- "sleep-timer глохнет" → английский жаргон
- "Retention через B2B/employer" → английские слова

Rules:
- Plain Russian only. Brand names (Calm, Apple, Harry Styles) ok where load-bearing.
- One mechanism per name. If you'd write "X / Y / Z", split into separate groups.
- Present tense. Active voice.
- Max ~120 characters.
- No version numbers in names.

SENTIMENT
- "praise" = пользователь хвалит или описывает ценность
- "criticism" = проблема, баг, тёмный паттерн, сломанная функция
- "suggestion" = запрос новой функции / улучшения

If a group has mixed sentiment, choose the majority.

NOVELTY
- "high" = редкая, нетривиальная механика; PM не скажет "ну конечно"
- "medium" = реальная и конкретная, но предсказуемая
- "low" = общеизвестная закономерность

OUTPUT SCHEMA — exactly this shape, no extra keys, no markdown fences

{
  "groups": [
    {
      "id": "<short-kebab-slug>",
      "name": "<natural Russian name of what this group is about>",
      "sentiment": "praise" | "criticism" | "suggestion",
      "novelty": "high" | "medium" | "low",
      "observation_ids": [<obs_id>, ...]
    }
  ]
}

Every obs_id from 0 to ${obsForAgent.length - 1} MUST appear in EXACTLY ONE group.
Sort groups by observation count desc.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool to: /Users/artsaverin/projects/badcomment/cluster-natural/out/${PRODUCT_ID}.json
- Do NOT write helper scripts. Do NOT use Python or Bash.
- Read → think → write → stop.

OBSERVATIONS:
${JSON.stringify(obsForAgent)}
`;

mkdirSync("cluster-natural/in", { recursive: true });
mkdirSync("cluster-natural/out", { recursive: true });
writeFileSync(`cluster-natural/in/${PRODUCT_ID}.txt`, PROMPT);
console.log(`wrote cluster-natural/in/${PRODUCT_ID}.txt`);
console.log(`  app: ${ctx.name} (${SLUG})`);
console.log(`  ${obsForAgent.length} non-commodity observations`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
