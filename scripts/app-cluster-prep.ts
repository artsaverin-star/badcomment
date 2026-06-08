import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

// Cluster non-commodity observations into mechanism-level themes AND assign
// each cluster to one of the 7 wellness-app themes used by the page. Improved
// over the original calm-cluster-prep based on lessons from Calm:
//
//   - Russian-only titles, no English words / version numbers / proper nouns
//   - One mechanism per title, no slashes/em-dashes packing ideas
//   - Plain-Russian GOOD/BAD examples (not the PM-shorthand the first pass
//     produced, which then had to be hand-rewritten 90 times)
//   - Theme assignment from a fixed list, with worked examples
//
// Usage: npx tsx scripts/app-cluster-prep.ts <slug>
//   slug = the app-context filename (without .json), e.g. "calm"

const SLUG = process.argv[2];
if (!SLUG) {
  console.error("usage: app-cluster-prep.ts <slug>  (slug = app-context/<slug>.json)");
  process.exit(1);
}

const contextPath = `app-context/${SLUG}.json`;
if (!existsSync(contextPath)) {
  console.error(`missing ${contextPath} — copy app-context/_template.json and fill in`);
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

const PROMPT = `You are clustering qualitative observations from ${ctx.name} (${ctx.domain}) reviews into mechanism-level insight cards. The page surfaces specific product mechanisms, not commodity complaints.

INPUT
${obsForAgent.length} observations. Each is a 1-2 sentence note about how a user described a specific product mechanism — POSITIVE (what works, what earns loyalty) as well as negative. Commodity rage (generic billing/paywall/ads complaints) is already filtered out — what remains should be substantive.

POLARITY — preserve the positives. The observations include both strengths and failures. Do NOT drop or under-cluster the positive mechanisms; they deserve their own clusters and their own groups. A page that is all complaints is a failure of this step. Make sure at least a few clusters (and at least one group) capture what genuinely works and why people stay.

YOUR JOB
1) Group obs_ids by the SAME UNDERLYING MECHANISM (not surface vocabulary). Two observations describing the same product mechanism in different words → one cluster.
2) Aim for 25-50 clusters. Lean toward MORE clusters, not fewer. Don't collapse orthogonal mechanisms even if they share a feature area.
3) Single-obs clusters are fine. So are 30-obs clusters.
4) For each cluster, write a one-line plain-Russian title at MECHANISM LEVEL.
5) For each cluster, assign exactly one theme from the fixed list below.

TITLE STYLE — read carefully, this is the most-missed rule

The title is what shows on the page. Imagine someone outside the team reading it. They've never used ${ctx.name}. Will they understand?

✅ GOOD TITLES (plain Russian, one mechanism, no jargon):
- Apple и банк подтверждают оплату — внутри приложения подписка не активна, поддержка не отвечает
- Кнопка «7 дней бесплатно» сразу списывает полную годовую подписку, без пробного периода
- В поддержке отвечает бот — описывает кнопки которых нет в приложении и не передаёт живому оператору
- Поиск по конкретному рассказчику не работает или удалён — нельзя найти все его записи
- Любое прерывание — звонок, переключение приложения, переподключение наушников — сбрасывает медитацию в начало
- Большинство постоянных пользователей пришли через работодателя или медицинскую страховку, а не сами

❌ BAD TITLES (would force a hand-rewrite — do NOT produce these):
- "Apple/банк подтверждают оплату, но в Calm Premium не активируется и тикет молчит" → English/Russian frankenstein, no
- "EMDR/бинауральный квиз обещает clinical-план" → English-word stuffing
- "Free-трек глохнет после N прослушиваний — счётчик listens вместо честной free-границы" → English+jargon
- "Streak считается midnight-to-midnight, ломается у sleep-юзеров и trivially gameable" → multiple ideas, jargon
- "После апдейта 6.93/6.94 Sleep Story зацикливается" → version numbers + brand-name in title
- "B2B/insurer/employer (Kaiser, Wells Fargo, county, BCBS-MI, gift) — главный канал retention" → too many proper nouns crammed in

Rules to enforce yourself before emitting each title:
- No English words. Brand names (${ctx.name}, Apple, Google, конкретный знаменитый) ok where load-bearing.
- No version numbers in the title (move that detail into the cluster's observation set, not the title).
- One mechanism per title. If you'd write "X / Y / Z" or "X — and also Y", split into two clusters.
- Present tense. Active voice.
- Length: aim for one readable sentence. ≤120 characters is a fine ceiling.

THEMES (fixed list — assign exactly one per cluster)

These 7 keys are a COARSE internal tag only — they are NOT the visible structure of the page (the bespoke groups below are). Pick the closest fit for ${ctx.name}'s domain; if a key sounds audio-specific, read it by its general meaning.
- "payment" — оплата, подписки, отмены, возвраты, цена, trial, lifetime, семейный доступ, промокоды
- "content" — основное наполнение/материал продукта и его качество, глубина, новизна, повторяемость (для ${ctx.name} — то, ИЗ ЧЕГО состоит ценность: записи, ответы бота, уроки, треки, шаблоны и т.п.)
- "playback" — поведение ядра во время использования: как идёт основной сценарий, прерывания, переходы, тайминг, автоповтор (для не-аудио приложений сюда попадает поведение основного «движка» в моменте)
- "ui" — поиск, главный экран, фильтры, онбординг, настройки, поп-апы, доступность, навигация
- "reliability" — крашы, регрессии после апдейта, проблемы на конкретных устройствах, виджеты, синхронизация, интеграции
- "support" — поддержка, скрытые кнопки помощи, восстановление доступа, общение с командой
- "strategy" — стратегические наблюдения: use cases, каналы дистрибуции, конкуренты, паттерны конверсии, сегменты пользователей, побочные эффекты, расхождение маркетинга и продукта

Worked theme assignments:
- "Apple и банк подтверждают оплату — внутри приложения подписка не активна" → payment
- "Поиск по рассказчику не работает" → ui (это про навигацию)
- "Знаменитости-рассказчики — главная причина почему люди остаются" → content (это про сам контент)
- "Большинство пользователей пришли через работодателя" → strategy (канал дистрибуции)
- "Видео в Daily Move сломано на Android и Windows 11" → reliability (баг на конкретных платформах)
- "Любое прерывание сбрасывает медитацию в начало" → playback (поведение плеера)
- "AI-бот вместо человека в поддержке" → support

6) After clustering, invent 5-8 BESPOKE PARENT THEMES (groups) specific to ${ctx.name} and assign every cluster id to EXACTLY ONE group.

GROUP NAME STYLE — these are the magazine-style section headings on the page

Each group name must be natural Russian, concrete, and SPECIFIC TO ${ctx.name}, derived from what's actually in the clusters — not a generic product-area grid. Think like a magazine editor titling the sections of a feature about THIS app.

NOTE: the examples just below are from an audio/meditation app to show the STYLE only. Do NOT reuse them — ${ctx.name} is in "${ctx.domain}", so your group names must come from ITS reality (its own features, jobs, user types), and must NOT mention sleep/stories/narrators unless ${ctx.name} actually has them.
✅ GOOD STYLE (specific, natural, describes the actual content):
- "Биллинг-ловушки и навязчивый апсейл"
- "Голоса и рассказчики — на ком держится лояльность"
- "Ночной ритуал: сон, истории, переходы"
- "Как ${ctx.name} используют на самом деле"
- "Поломки после обновлений"
❌ BAD (generic top-down grid — do NOT produce):
- "Стратегия и сегменты"
- "Подписка и оплата"
- "Контент и каталог"
- "Интерфейс"

Group rules:
- 5-8 groups. Not more, not fewer.
- Plain Russian. Brand names ok where load-bearing. No English words.
- Each group should hold a coherent set — if a group would hold just 1-2 clusters, fold them into the nearest fitting group.
- Order groups by total observation count desc (loudest first).
- Every cluster id MUST appear in EXACTLY ONE group's cluster_ids.

OUTPUT SCHEMA — exactly this shape, no extra keys, no markdown fences

{
  "clusters": [
    {
      "id": "<short-kebab-case-slug>",
      "title": "<plain Russian one-line title, mechanism-level>",
      "theme": "payment" | "content" | "playback" | "ui" | "reliability" | "support" | "strategy",
      "novelty": "high" | "medium" | "low",
      "observation_ids": [<obs_id>, ...]
    }
  ],
  "groups": [
    {
      "id": "<short-kebab-slug>",
      "name": "<natural Russian theme name specific to ${ctx.name}>",
      "cluster_ids": ["<cluster id>", ...]
    }
  ]
}

SORT clusters by theme (in the order listed above), then within theme by observation count desc.

CRITICAL OPERATING RULES
- Output ONE JSON object via the Write tool. Nothing else.
- Do NOT write helper scripts. Do NOT use Python or Bash for "verification". Read the input once; write the output once.
- Read → think → write → stop.

OBSERVATIONS:
${JSON.stringify(obsForAgent)}
`;

mkdirSync("cluster/in", { recursive: true });
writeFileSync(`cluster/in/${PRODUCT_ID}.txt`, PROMPT);
console.log(`wrote cluster/in/${PRODUCT_ID}.txt`);
console.log(`  app: ${ctx.name} (${SLUG})`);
console.log(`  ${obsForAgent.length} non-commodity observations`);
console.log(`  prompt size: ${(PROMPT.length / 1024).toFixed(0)} KB`);
