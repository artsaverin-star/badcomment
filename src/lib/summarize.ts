import { createHash } from "node:crypto";
import type { IdeaCard } from "./queries";

// A single concrete, buildable gap mined from the reviews — the core insight.
export type IdeaGap = {
  title: string; // short, app-specific (e.g. "No offline mode for saved recipes")
  evidence: string; // synthesized: how often / in what context users ask
  quote: string; // one representative real quote (RU, lightly cleaned)
};

// The primary kind of opening an indie could exploit. Drives the deck's
// opportunity-type filter chips. One per app — the dominant angle.
export type OpportunityType =
  | "design" // UX/visual quality is the weak point — a better-designed clone wins
  | "features" // missing capabilities users keep asking for
  | "reliability" // works badly: stability, accuracy, performance
  | "pricing" // value/monetization is the sore spot — fairer model wins
  | "content" // thin/poor content, data, or catalog
  | "support"; // trust, support, moderation, safety gaps

// LLM-generated idea-card analysis. Cached on Product.summary as JSON.
export type IdeaSummary = {
  tagline: string; // one line, RU: what this app actually is (plain language)
  verdict: string; // one-line take on the opportunity
  opportunity: string; // the unique unmet-need angle, 1-2 sentences
  opportunityType?: OpportunityType; // dominant angle for filtering (optional on legacy summaries)
  gaps: IdeaGap[]; // 3-5 specific, app-unique, fixable gaps
  loved: string[]; // what genuinely works and must be kept
  monetization: string | null; // ads/price gripe, quarantined out of `gaps`
  wedge: string[]; // concrete moves to beat the incumbent
  cloneable: boolean; // is this a real standalone app an indie can rebuild?
  buildNote: string | null; // why (not) cloneable — brand/network/infra lock-in
  // Authored (hand-judged, not a formula) deck-curation scores, 1-5. Optional on
  // legacy summaries. buildability: how realistically a small team ships a real
  // rival (5 = weekend project, 1 = needs billion-$ infra/network/data like Grok
  // or Uber). profit: how much WE could actually earn (5 = clear paying demand we
  // can capture; 1 = users only want it free, nothing left to monetize). The deck
  // ranks by buildability*profit and only shows cards strong on both.
  buildability?: number;
  profit?: number;
};

const ENDPOINT = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

// Stable fingerprint of the review signal: if unchanged we skip the model call
// entirely (the dominant cost lever). Includes the raw sample so switching the
// extraction engine forces regeneration.
export function summaryHash(card: IdeaCard): string {
  const sig = JSON.stringify({
    v: 3, // bump when the engine/prompt changes
    cons: card.conSamples.map((t) => t.slice(0, 60)),
    pros: card.proSamples.map((t) => t.slice(0, 40)),
    n: card.negativeCount,
    clone: card.cloneLabel,
  });
  return createHash("sha1").update(sig).digest("hex");
}

function buildDigest(card: IdeaCard): string {
  const lines = [
    `Приложение: ${card.name}`,
    `Категория: ${card.categoryLabel}`,
    `Популярность: ${card.demandLabel}${
      card.avgRating != null ? `, средняя оценка ${card.avgRating.toFixed(1)}` : ""
    }`,
    `Сложность повторения (грубая эвристика): ${card.cloneLabel} — ${card.cloneReasons.join("; ")}`,
    "",
    "НЕГАТИВНЫЕ ОТЗЫВЫ (выборка, изучи их внимательно):",
    ...card.conSamples.map((t) => `- ${t}`),
  ];
  if (card.proSamples.length) {
    lines.push("", "ПОЗИТИВНЫЕ ОТЗЫВЫ (что хвалят):", ...card.proSamples.map((t) => `- ${t}`));
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Ты продуктовый аналитик. На входе — данные о приложении и ВЫБОРКА реальных отзывов. Твоя задача: найти КОНКРЕТНЫЕ, уникальные для этого приложения пробелы, которые инди-разработчик мог бы закрыть и перебить оригинал.

Главное правило: НЕ выдавай общие банальности. КАТЕГОРИЧЕСКИ запрещено выносить в gaps такие вещи как «много рекламы», «навязчивая реклама», «дорого/подписка/цена», «вылеты», «баги», «тормозит», «неудобный интерфейс» — они есть у всех и не являются инсайтом. Жалобы на рекламу и цену идут ТОЛЬКО в поле monetization (и больше нигде), жалобы на стабильность/баги вообще не выноси. Если после этого конкретики не осталось — дай меньше gaps или пустой массив, но НЕ заполняй его банальностями.

Ищи СПЕЦИФИКУ: какой конкретной фичи не хватает, какой сценарий сломан, что пользователи постоянно просят и не получают именно в ЭТОМ приложении. Анализируй текст отзывов, а не общие темы. Каждый gap должен опираться на то, что реально написали люди.

Отвечай СТРОГО валидным JSON без markdown, ровно с такими ключами:
{
  "tagline": строка,
  "verdict": строка,
  "opportunity": строка,
  "gaps": [{"title": строка, "evidence": строка, "quote": строка}],
  "loved": [строки],
  "monetization": строка или null,
  "wedge": [строки],
  "cloneable": true/false,
  "buildNote": строка или null
}

- tagline — одна короткая фраза по-русски: что это за приложение простыми словами (например «Трекер артериального давления» или «Приложение для изучения слов по карточкам»). Без маркетинга, нейтрально.
- verdict — одно предложение: стоит ли за это браться и почему.
- opportunity — 1-2 предложения про незакрытую потребность, на которой можно выехать.
- gaps — 3-5 штук. title: 3-7 слов, конкретно. evidence: синтез — как часто и в каком контексте это всплывает в отзывах. quote: одна реальная цитата из отзывов, ОБЯЗАТЕЛЬНО на русском (если отзыв на другом языке — переведи) и слегка причеши. Если конкретики мало — дай меньше gaps, не выдумывай.
- loved — 2-4 пункта, что реально хорошо и это надо сохранить.
- monetization — если основная боль в рекламе/цене, опиши её одной строкой ЗДЕСЬ (не в gaps), иначе null.
- wedge — 3-5 конкретных шагов, как сделать лучше оригинала.
- cloneable — true только если это самостоятельный продукт, который небольшая команда реально может пересобрать. false, если приложение завязано на бренд/физическую сеть/инфраструктуру/сетевой эффект (например аппы ресторанных сетей, банков, операторов, YouTube/Pinterest) — такое в одиночку не повторить.
- buildNote — если cloneable=false, объясни почему одной фразой; иначе null.

Пиши по-русски, кратко и по делу.`;

function parseSummary(text: string): IdeaSummary | null {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }
  if (typeof obj !== "object" || obj === null) return null;
  const o = obj as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.map((x) => str(x)).filter(Boolean) : [];
  const gaps: IdeaGap[] = Array.isArray(o.gaps)
    ? o.gaps
        .map((g) => {
          const gg = (g ?? {}) as Record<string, unknown>;
          return { title: str(gg.title), evidence: str(gg.evidence), quote: str(gg.quote) };
        })
        .filter((g) => g.title)
    : [];
  const monetization = str(o.monetization);
  const buildNote = str(o.buildNote);
  const summary: IdeaSummary = {
    tagline: str(o.tagline),
    verdict: str(o.verdict),
    opportunity: str(o.opportunity),
    gaps,
    loved: arr(o.loved),
    monetization: monetization || null,
    wedge: arr(o.wedge),
    cloneable: o.cloneable !== false, // default true unless explicitly false
    buildNote: buildNote || null,
  };
  if (!summary.verdict && summary.gaps.length === 0) return null;
  return summary;
}

// Call YandexGPT once for one product. Returns null on any failure so the
// caller can gracefully fall back to keyword chips. Requires YAGPT_API_KEY and
// YAGPT_FOLDER_ID. Defaults to the Pro model for real insight extraction;
// override with YAGPT_MODEL.
export async function generateSummary(card: IdeaCard): Promise<IdeaSummary | null> {
  const apiKey = process.env.YAGPT_API_KEY;
  const folderId = process.env.YAGPT_FOLDER_ID;
  if (!apiKey || !folderId) return null;
  if (card.conSamples.length === 0) return null;

  const model = process.env.YAGPT_MODEL ?? "yandexgpt";
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/${model}/latest`,
        completionOptions: { temperature: 0.3, maxTokens: 2000 },
        messages: [
          { role: "system", text: SYSTEM_PROMPT },
          { role: "user", text: buildDigest(card) },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      result?: { alternatives?: { message?: { text?: string } }[] };
    };
    const text = data.result?.alternatives?.[0]?.message?.text;
    return text ? parseSummary(text) : null;
  } catch {
    return null;
  }
}
