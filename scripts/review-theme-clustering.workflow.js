export const meta = {
  name: "review-theme-clustering-v2",
  description: "Two-pass app-specific review themes with stable IDs and validation",
  phases: [{ title: "Load" }, { title: "Discover themes" }, { title: "Assign reviews" }],
};

const CHUNKS = (args && args.chunks) || [(args && args.manifest) || "gen/rev-manifest.json"];
const ENTRY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["apps"],
  properties: {
    apps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "id"],
        properties: { slug: { type: "string" }, id: { type: "string" } },
      },
    },
  },
};

phase("Load");
const loaded = await parallel(
  CHUNKS.map((chunk) => () =>
    agent(`Read ${chunk}. Return every {slug,id} entry verbatim, with id as a string.`, {
      label: `load:${chunk.split("/").pop()}`,
      phase: "Load",
      schema: ENTRY_SCHEMA,
      model: "haiku",
      effort: "low",
    }),
  ),
);
const seen = new Set();
const APPS = [];
for (const result of loaded) {
  for (const app of (result && result.apps) || []) {
    const key = `${app.slug}/${app.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      APPS.push(app);
    }
  }
}

phase("Discover themes");
await parallel(
  APPS.map((app) => () =>
    agent(
      `Прочитай gen/rev-src/${app.slug}/${app.id}.json целиком. Выдели повторяющиеся СОБСТВЕННЫЕ темы этого приложения.

Качество темы:
- тема описывает объект + механизм + результат: «триал обещает бесплатно, но списывает сразу», а не «оплата»;
- разные причины не смешиваются в один ярлык;
- похвала и жалоба на один механизм — разные темы, если вывод противоположный;
- тема нужна при 8+ содержательных отзывах; для 300–500 отзывов обычно получается 6–10 тем;
- не создавай «прочее», «общее впечатление», «удобство», «качество» и другие корзины;
- name по-русски строчными, nameEn по-английски, без длинного тире и точки с запятой;
- id — стабильный короткий kebab-case идентификатор смысла, не номер.

Запиши компактный JSON в gen/rev-themes/${app.slug}/${app.id}.json:
{"id":"${app.id}","title":"<title>","themes":[{"id":"stable-id","name":"...","nameEn":"...","polarity":"love|pain|mixed"}]}
Верни только количество тем.`,
      { label: `themes:${app.slug}/${String(app.id).slice(-5)}`, phase: "Discover themes", model: "sonnet" },
    ),
  ),
);

phase("Assign reviews");
const assigned = await parallel(
  APPS.map((app) => () =>
    agent(
      `Прочитай gen/rev-src/${app.slug}/${app.id}.json и gen/rev-themes/${app.slug}/${app.id}.json.
Для КАЖДОГО отзыва по порядку выбери одну главную тему и верни её СТРОКОВЫЙ id. Никогда не используй номер позиции темы.

Если ни одна конкретная тема не подтверждается текстом, используй ровно один честный fallback:
- other-love для 4–5★ без конкретного сюжета;
- other-mixed для 3★ без конкретного сюжета;
- other-pain для 1–2★ без конкретного сюжета.
Не отправляй отзыв в конкретную тему только из-за его звезды. Сначала должен совпасть смысл текста.

Перед записью проверь: tags.length РОВНО равен числу reviews, каждый tag — id из файла тем или один из трёх fallback id. Проверь первые и последние 10 позиций второй раз.
Запиши компактный JSON в gen/rev-out/${app.slug}/${app.id}.json:
{"id":"${app.id}","title":"<title>","themes":[...темы без изменений...],"tags":["stable-id",...]}
Верни строку с числом тегов и тем.`,
      { label: `tags:${app.slug}/${String(app.id).slice(-5)}`, phase: "Assign reviews", model: "sonnet" },
    ),
  ),
);

return { done: assigned.filter(Boolean).length, total: APPS.length };
