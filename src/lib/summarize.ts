import { createHash } from "node:crypto";
import type { IdeaCard } from "./queries";

// LLM-generated idea-card summary. Cached on Product.summary as JSON.
export type IdeaSummary = {
  verdict: string; // one-line take on whether it's worth cloning
  whyClone: string; // proven-demand argument
  loved: string[]; // what genuinely works, synthesized from reviews
  painPoints: string[]; // what's bad, ranked
  howToWin: string[]; // concrete moves to beat the incumbent
};

const ENDPOINT = "https://llm.api.cloud.yandex.net/foundationModels/v1/completion";

// Stable fingerprint of the review signal: if this is unchanged we skip the
// model call entirely (the dominant cost lever).
export function summaryHash(card: IdeaCard): string {
  const sig = JSON.stringify({
    cons: card.cons.map((c) => `${c.key}:${c.count}`),
    pros: card.pros.map((p) => p.key),
    n: card.negativeCount,
    clone: card.cloneLabel,
  });
  return createHash("sha1").update(sig).digest("hex");
}

function buildDigest(card: IdeaCard): string {
  const cons = card.cons.map((c) => `${c.label} (${c.count})`).join(", ") || "—";
  const pros = card.pros.map((p) => p.label).join(", ") || "—";
  const lines = [
    `App: ${card.name}`,
    `Category: ${card.categoryLabel}`,
    `Popularity: ${card.demandLabel}${card.avgRating != null ? `, avg rating ${card.avgRating.toFixed(1)}` : ""}`,
    `How hard to rebuild: ${card.cloneLabel} — ${card.cloneReasons.join("; ")}`,
    `Top complaints (by frequency): ${cons}`,
    `What users love: ${pros}`,
  ];
  if (card.conQuote) lines.push(`Complaint quote: "${card.conQuote}"`);
  if (card.proQuote) lines.push(`Praise quote: "${card.proQuote}"`);
  return lines.join("\n");
}

const SYSTEM_PROMPT =
  "Ты продуктовый аналитик. По сводке об приложении (популярность, жалобы и похвалы из отзывов, сложность повторения) дай разбор для инди-разработчика, который думает сделать похожее приложение и перебить оригинал. " +
  "Отвечай СТРОГО валидным JSON без markdown и без обрамляющих кавычек, ровно с такими ключами: " +
  '{"verdict": строка, "whyClone": строка, "loved": [строки], "painPoints": [строки], "howToWin": [строки]}. ' +
  "verdict — одно предложение, стоит ли повторять. whyClone — 1–2 предложения о доказанном спросе. " +
  "loved — 3–5 пунктов, что реально хорошо. painPoints — 3–5 пунктов, что плохо, по убыванию боли. " +
  "howToWin — 3–5 конкретных, реализуемых шагов, чтобы перебить оригинал. Пиши по-русски, кратко и по делу.";

function parseSummary(text: string): IdeaSummary | null {
  // Model sometimes wraps JSON in ```json fences — strip them.
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
  const summary: IdeaSummary = {
    verdict: str(o.verdict),
    whyClone: str(o.whyClone),
    loved: arr(o.loved),
    painPoints: arr(o.painPoints),
    howToWin: arr(o.howToWin),
  };
  if (!summary.verdict && summary.howToWin.length === 0) return null;
  return summary;
}

// Call YandexGPT Lite once for one product. Returns null on any failure so the
// caller can gracefully fall back to keyword chips. Requires YAGPT_API_KEY and
// YAGPT_FOLDER_ID in the environment.
export async function generateSummary(card: IdeaCard): Promise<IdeaSummary | null> {
  const apiKey = process.env.YAGPT_API_KEY;
  const folderId = process.env.YAGPT_FOLDER_ID;
  if (!apiKey || !folderId) return null;

  const model = process.env.YAGPT_MODEL ?? "yandexgpt-lite";
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Api-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        modelUri: `gpt://${folderId}/${model}/latest`,
        completionOptions: { temperature: 0.3, maxTokens: 600 },
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
