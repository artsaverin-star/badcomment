// The semantic classification taxonomy for the language-LEARNING group, derived
// from reading ~1800 real reviews by meaning (not keywords). This is the closed
// set a classifier (Claude in-session, or you in a Sonnet window) maps each
// review onto: it may only emit keys that exist here, may emit several, or may
// emit none ("classified, nothing fit"). Forks are sub-threads inside a need —
// shown explicitly, never collapsed.
//
// Keys are dotted: a bare need key ("speak") or a fork ("speak.recognition").
// Both are valid labels; validKeys() is the allow-list apply-classify enforces.
//
// This is the source of truth for: the classification prompt (dump-classify),
// label validation (apply-classify), and — once reviews are labeled — the gap
// view and popup. The keyword-based src/lib/needs.ts stays in use for the live
// page until enough reviews are classified to switch over.

export const TAXONOMY_VERSION = "lang-learning-1";

export type Fork = { key: string; en: string; ru: string };
export type ClassNeed = { key: string; en: string; ru: string; forks: Fork[] };
export type GenreTaxonomy = { slug: string; en: string; ru: string; needs: ClassNeed[] };

export const TAXONOMIES: Record<string, GenreTaxonomy> = {
  "language-learning": {
    slug: "language-learning",
    en: "Language-learning apps",
    ru: "Приложения для изучения языка",
    needs: [
      {
        key: "method",
        en: "Actually teaches the language",
        ru: "Реально учит языку",
        forks: [
          { key: "method.no-grammar", en: "No grammar, structure or explanation", ru: "Нет грамматики, структуры, объяснений" },
          { key: "method.flashcards", en: "Flashcard drilling without real context", ru: "Зубрёжка карточек без контекста" },
          { key: "method.useless-phrases", en: "Nonsensical / made-up / useless phrases", ru: "Бессмысленные, выдуманные, бесполезные фразы" },
          { key: "method.too-basic", en: "Too basic, no path to fluency", ru: "Слишком базово, нет пути к свободному владению" },
        ],
      },
      {
        key: "speak",
        en: "Speak and be understood",
        ru: "Заговорить и быть понятым",
        forks: [
          { key: "speak.practice", en: "Speaking / conversation practice itself", ru: "Сама разговорная практика" },
          { key: "speak.recognition", en: "Speech recognition marks correct as wrong / can't hear", ru: "Распознавание речи: верное считает ошибкой / не слышит" },
          { key: "speak.not-read", en: "Wants to speak, app is reading/tapping", ru: "Хочет говорить, а не читать/тапать" },
          { key: "speak.feedback", en: "No actionable pronunciation feedback", ru: "Нет внятной обратной связи по произношению" },
        ],
      },
      {
        key: "ai-tutor",
        en: "AI tutor / conversation partner",
        ru: "AI-собеседник / разговорный партнёр",
        forks: [
          { key: "ai-tutor.no-adapt", en: "Doesn't adapt, repeats the same question", ru: "Не подстраивается, повторяет один вопрос" },
          { key: "ai-tutor.fake-approval", en: "Fake approval — says 'perfect' to anything", ru: "Фальшивое одобрение — на всё «perfect»" },
          { key: "ai-tutor.unnatural", en: "Unnatural, obviously AI / voiced ChatGPT", ru: "Неестественно, слышно что AI / озвученный ChatGPT" },
          { key: "ai-tutor.push-to-talk", en: "Tap-to-talk, not hands-free", ru: "Тап-чтобы-говорить, нет hands-free" },
          { key: "ai-tutor.mispronounce", en: "AI itself mispronounces words", ru: "Сам AI неверно произносит слова" },
          { key: "ai-tutor.replaced-humans", en: "AI replaced humans / ad promised a real native", ru: "AI вместо людей / реклама обещала живого носителя" },
          { key: "ai-tutor.text-only", en: "Text only, ignores fluency and tone", ru: "Только текст, игнорирует беглость и тон" },
        ],
      },
      {
        key: "level",
        en: "Right level and adaptivity",
        ru: "Правильный уровень и адаптивность",
        forks: [
          { key: "level.says-advanced", en: "Says advanced, gives basics", ru: "Заявлен advanced — даёт базу" },
          { key: "level.too-fast", en: "Too fast for a beginner", ru: "Слишком быстро для новичка" },
          { key: "level.starts-too-low", en: "Starts too low / drills the trivial", ru: "Стартует слишком низко / гоняет элементарное" },
          { key: "level.no-test", en: "No placement test / no CEFR level", ru: "Нет теста уровня / нет уровня по CEFR" },
          { key: "level.no-customize", en: "Can't customize lessons to self", ru: "Нельзя настроить уроки под себя" },
        ],
      },
      {
        key: "retention",
        en: "Remember it, not just cram",
        ru: "Запомнить, а не зазубрить",
        forks: [
          { key: "retention.forget", en: "Forget what was learned, no built-in review", ru: "Забываешь пройденное, нет встроенного повторения" },
          { key: "retention.broken-repeat", en: "Broken repeat / review mechanic", ru: "Сломанный механизм повторения" },
          { key: "retention.removed-srs", en: "Removed mnemonics / SRS, users leave for Anki", ru: "Убрали мнемоники / интервалки, уходят в Anki" },
          { key: "retention.saved-words", en: "Can't practice saved / already-learned words", ru: "Нельзя тренировать сохранённые / выученные слова" },
        ],
      },
      {
        key: "content-accuracy",
        en: "Correct, trustworthy content",
        ru: "Достоверный, выверенный контент",
        forks: [
          { key: "content-accuracy.wrong-definitions", en: "Wrong definitions / translations taught", ru: "Неверные определения / переводы" },
          { key: "content-accuracy.misspelled", en: "Misspelled words", ru: "Слова с опечатками" },
          { key: "content-accuracy.mispronounce", en: "App mispronounces words", ru: "Приложение неправильно произносит слова" },
          { key: "content-accuracy.ai-slop", en: "Unreviewed AI-generated content (slop)", ru: "Невыверенный AI-контент (слоп)" },
          { key: "content-accuracy.teaching-errors", en: "Outright teaching / factual errors", ru: "Прямые учебные / фактические ошибки" },
        ],
      },
      {
        key: "coverage",
        en: "Language and dialect coverage",
        ru: "Покрытие языков и диалектов",
        forks: [
          { key: "coverage.missing-language", en: "Missing the language wanted", ru: "Нет нужного языка" },
          { key: "coverage.wrong-dialect", en: "Wrong dialect / penalized for mixing variants", ru: "Не тот диалект / штрафует за смешение вариантов" },
          { key: "coverage.not-from-native", en: "Can't learn from my native language", ru: "Нельзя учить со своего родного языка" },
        ],
      },
      {
        key: "gamification",
        en: "Manipulative gamification",
        ru: "Манипулятивная геймификация",
        forks: [
          { key: "gamification.energy", en: "Energy / hearts gate learning", ru: "Энергия / жизни блокируют учёбу" },
          { key: "gamification.gems", en: "Chests / gems distract from learning", ru: "Сундуки / гемы отвлекают" },
          { key: "gamification.streak", en: "Streak pressure / stress", ru: "Давление стриков / стресс" },
          { key: "gamification.app-blocking", en: "Forced attention / app-blocking", ru: "Навязчивый перехват внимания / блокировка" },
        ],
      },
      { key: "motivation", en: "Stay motivated, not bored", ru: "Не бросить, не заскучать", forks: [] },
      {
        key: "billing",
        en: "Honest billing, no trial traps",
        ru: "Честный биллинг, без ловушек",
        forks: [
          { key: "billing.trial-trap", en: "'Free trial' charges immediately", ru: "«Бесплатный период» списывает сразу" },
          { key: "billing.charged-full", en: "Charged a full year unexpectedly", ru: "Неожиданно списали за год" },
          { key: "billing.cant-cancel", en: "Can't cancel the subscription", ru: "Нельзя отменить подписку" },
          { key: "billing.after-cancel", en: "Charged after cancelling", ru: "Списали после отмены" },
          { key: "billing.no-refund", en: "No refund given", ru: "Не возвращают деньги" },
          { key: "billing.price-mismatch", en: "Price doesn't match the ad", ru: "Цена не совпадает с рекламой" },
        ],
      },
      {
        key: "try-before-pay",
        en: "Try before you pay",
        ru: "Попробовать до оплаты",
        forks: [
          { key: "try-before-pay.paywall-lesson-1", en: "Paywalled from the first lesson", ru: "Пейволл с первого урока" },
          { key: "try-before-pay.no-free-eval", en: "No free way to evaluate it", ru: "Нет бесплатного способа оценить" },
          { key: "try-before-pay.all-locked", en: "Everything locked behind subscription", ru: "Всё заперто за подпиской" },
        ],
      },
      { key: "ads", en: "Ads don't interrupt lessons", ru: "Реклама не рвёт урок", forks: [] },
      {
        key: "reliability",
        en: "The app just works",
        ru: "Приложение просто работает",
        forks: [
          { key: "reliability.updates-break", en: "Updates break it / lessons disappear", ru: "Обновления ломают / уроки исчезают" },
          { key: "reliability.crashes", en: "Crashes / won't open / stuck loading", ru: "Крэши / не открывается / зависает на загрузке" },
          { key: "reliability.dead-buttons", en: "Dead buttons, can't continue", ru: "Мёртвые кнопки, нельзя продолжить" },
          { key: "reliability.forced-logout", en: "Forced logout", ru: "Принудительный выход из аккаунта" },
        ],
      },
      {
        key: "progress",
        en: "Don't lose my progress or access",
        ru: "Не терять прогресс и доступ",
        forks: [
          { key: "progress.reverted", en: "Progress reverted / reset", ru: "Прогресс откатился / сбросился" },
          { key: "progress.purchase-not-recognized", en: "Lifetime / purchase not recognized", ru: "Lifetime / покупка не признаётся" },
          { key: "progress.cant-login-paid", en: "Can't log in despite paying", ru: "Не пускает, хотя оплачено" },
        ],
      },
      { key: "support", en: "Support that responds", ru: "Поддержка, которая отвечает", forks: [] },
      {
        key: "offline",
        en: "Learn offline and on the go",
        ru: "Учить оффлайн и в дороге",
        forks: [
          { key: "offline.removed", en: "Offline mode removed", ru: "Убрали оффлайн-режим" },
          { key: "offline.logs-out", en: "Logs out / breaks without a connection", ru: "Разлогинивает / ломается без сети" },
          { key: "offline.none", en: "No offline support at all", ru: "Оффлайна нет вообще" },
        ],
      },
      { key: "notifications", en: "No notification spam", ru: "Без спама уведомлений", forks: [] },
      { key: "accessibility", en: "Accessible (text size, sight-impaired)", ru: "Доступность (размер текста, слабовидящие)", forks: [] },
    ],
  },
};

export function getTaxonomy(slug: string): GenreTaxonomy | null {
  return TAXONOMIES[slug] ?? null;
}

// The allow-list of every emittable label key (bare needs + forks). apply-classify
// rejects anything outside this set, so the model can never invent a category.
export function validKeys(slug: string): Set<string> {
  const tax = TAXONOMIES[slug];
  if (!tax) return new Set();
  const keys = new Set<string>();
  for (const n of tax.needs) {
    keys.add(n.key);
    for (const f of n.forks) keys.add(f.key);
  }
  return keys;
}

// Renders the taxonomy as a compact, bilingual reference block for the
// classification prompt — every need with its forks, EN and RU labels.
export function renderTaxonomy(slug: string): string {
  const tax = TAXONOMIES[slug];
  if (!tax) return "";
  const lines: string[] = [];
  for (const n of tax.needs) {
    lines.push(`${n.key} — ${n.en} / ${n.ru}`);
    for (const f of n.forks) lines.push(`  · ${f.key} — ${f.en} / ${f.ru}`);
  }
  return lines.join("\n");
}
