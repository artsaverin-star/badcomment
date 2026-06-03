import type { Locale } from "./i18n";

// A genre's "jobs to be done": the needs people hire these apps to satisfy,
// hand-authored the same way segments and idea cards are. Each need carries a
// keyword set (EN + RU, matched case-insensitively against review text) so the
// gap view can score — from real reviews — how badly the genre serves it.
//
// `whitespace` is different in kind: needs that (we think) NO app attempts. Those
// can't be measured from reviews of existing apps, so they are explicitly
// labeled as hypotheses in the UI, never as data.
export type Need = {
  key: string;
  keywords: string[];
  en: { label: string; desc: string };
  ru: { label: string; desc: string };
};

export type GenreNeeds = {
  needs: Need[];
  whitespace: { en: string; ru: string }[];
};

export const GENRE_NEEDS: Record<string, GenreNeeds> = {
  "language-learning": {
    needs: [
      {
        key: "speak",
        keywords: [
          "speak", "speaking", "conversation", "conversational", "pronunciation",
          "pronounce", "accent", "talking", "speech recognition", "listening",
          "говор", "разговор", "произнош", "акцент", "речь", "распозна", "послуша", "аудир",
        ],
        en: { label: "Actually speak and be understood", desc: "Real conversation and pronunciation practice, not just tapping the right word." },
        ru: { label: "Реально заговорить и быть понятым", desc: "Живая разговорная практика и произношение, а не выбор правильного слова." },
      },
      {
        key: "motivation",
        keywords: [
          "motivat", "demotivat", "streak", "boring", "bored", "repetitive", "monoton",
          "addictive", "engaging", "lose interest", "give up", "gave up",
          "мотивац", "скучн", "надоел", "однообраз", "повтор", "заброс", "бросил", "втян",
        ],
        en: { label: "Keep going without burning out", desc: "Stay motivated past the first week instead of quietly dropping off." },
        ru: { label: "Не бросить через неделю", desc: "Удержать мотивацию, а не тихо забросить после первых уроков." },
      },
      {
        key: "depth",
        keywords: [
          "too basic", "basic", "beginner only", "advanced", "grammar", "fluent", "fluency",
          "plateau", "made-up", "made up word", "useless phrase", "not useful", "difficulty level", "levels",
          "грамматик", "поверхностн", "базов", "продвинут", "уровень сложн", "бедн", "выдуман",
          "бесполезн фраз", "прогресс", "свободн владе",
        ],
        en: { label: "Get past the basics to real fluency", desc: "Depth, grammar and harder levels — not the same beginner phrases on a loop." },
        ru: { label: "Дойти до реального уровня, а не топтаться", desc: "Глубина, грамматика и сложные уровни вместо одних и тех же фраз по кругу." },
      },
      {
        key: "offline",
        keywords: [
          "offline", "no internet", "without internet", "download lesson", "on the go",
          "connection required", "needs internet",
          "оффлайн", "офлайн", "без интернета", "без сети", "скача урок", "в дороге", "требует подключ", "нужен интернет",
        ],
        en: { label: "Learn offline and on the go", desc: "Lessons that work on a plane or subway without a connection." },
        ru: { label: "Учить оффлайн и в дороге", desc: "Уроки, которые работают в самолёте или метро без сети." },
      },
      {
        key: "pricing",
        keywords: [
          "paywall", "energy system", "hearts", "ran out of", "run out of", "free lessons", "trial",
          "auto-renew", "renew", "subscription", "expensive", "refund", "locked behind", "without paying",
          "подписк", "энерги", "жизн закончил", "пробн", "продлил", "бесплатн урок", "дорог",
          "развод", "возврат денег", "заперт", "без оплаты",
        ],
        en: { label: "Fair price without traps", desc: "Learning that isn't throttled by an energy meter or a silently-renewing trial." },
        ru: { label: "Честная цена без ловушек", desc: "Учёба без счётчика «энергии» и молча продлевающейся подписки." },
      },
      {
        key: "translation",
        keywords: [
          "translation", "translate", "accurate translation", "inaccurate", "wrong translation",
          "mistranslat", "voice translat", "photo translat", "camera translat", "offline translat",
          "перевод", "неточн перевод", "неправильн перевод", "ошиб перевод", "голосов перевод",
          "перевод по фото", "перевод с камер",
        ],
        en: { label: "Translate accurately and instantly", desc: "Fast, correct translation — by text, voice or camera — that isn't locked behind an ad." },
        ru: { label: "Перевести точно и сразу", desc: "Быстрый и верный перевод текстом, голосом или камерой — не за рекламой." },
      },
    ],
    whitespace: [
      {
        en: "A verifiable level you can show an employer or for a visa — apps teach, but none certify a result anyone recognizes.",
        ru: "Подтверждаемый уровень для работодателя или визы — приложения учат, но не дают признаваемого результата.",
      },
      {
        en: "Practice with a real native speaker on your own schedule, not a bot — everywhere it's either costly or clumsy.",
        ru: "Практика с живым носителем под твой график, а не с ботом — у всех либо дорого, либо неудобно.",
      },
      {
        en: "Learning inside what you already watch and read (video, news, social in the language) instead of a separate app.",
        ru: "Учёба внутри того, что ты и так смотришь и читаешь (видео, новости, соцсети на языке), а не в отдельном приложении.",
      },
    ],
  },
};

export type ResolvedNeed = { key: string; label: string; desc: string; keywords: string[] };

export function resolveNeeds(slug: string, locale: Locale): ResolvedNeed[] | null {
  const g = GENRE_NEEDS[slug];
  if (!g) return null;
  return g.needs.map((n) => ({ key: n.key, keywords: n.keywords, ...(locale === "ru" ? n.ru : n.en) }));
}

export function resolveWhitespace(slug: string, locale: Locale): string[] {
  const g = GENRE_NEEDS[slug];
  if (!g) return [];
  return g.whitespace.map((w) => (locale === "ru" ? w.ru : w.en));
}
