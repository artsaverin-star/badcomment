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

export type Fork = { key: string; en: string; ru: string };
export type ClassNeed = { key: string; en: string; ru: string; forks: Fork[] };
// Each genre carries its own taxonomy version: a re-run only re-touches rows whose
// needsVersion differs from its genre's version, so the two product types (learning
// vs translators) are classified and re-classified independently.
export type GenreTaxonomy = { slug: string; version: string; en: string; ru: string; needs: ClassNeed[] };

export const TAXONOMIES: Record<string, GenreTaxonomy> = {
  "language-learning": {
    slug: "language-learning",
    version: "lang-learning-1",
    en: "Language-learning apps",
    ru: "Приложения для изучения языка",
    needs: [
      {
        key: "method",
        en: "Doesn't actually teach",
        ru: "Не учит языку",
        forks: [
          { key: "method.no-grammar", en: "No grammar, structure or explanation", ru: "Нет грамматики, структуры, объяснений" },
          { key: "method.flashcards", en: "Flashcard drilling without real context", ru: "Зубрёжка карточек без контекста" },
          { key: "method.useless-phrases", en: "Nonsensical / made-up / useless phrases", ru: "Бессмысленные, выдуманные, бесполезные фразы" },
          { key: "method.too-basic", en: "Too basic, no path to fluency", ru: "Слишком базово, нет пути к свободному владению" },
        ],
      },
      {
        key: "speak",
        en: "Can't speak or be understood",
        ru: "Не заговорить, не понимают",
        forks: [
          { key: "speak.practice", en: "Speaking / conversation practice itself", ru: "Сама разговорная практика" },
          { key: "speak.recognition", en: "Speech recognition marks correct as wrong / can't hear", ru: "Распознавание речи: верное считает ошибкой / не слышит" },
          { key: "speak.not-read", en: "Wants to speak, app is reading/tapping", ru: "Хочет говорить, а не читать/тапать" },
          { key: "speak.feedback", en: "No actionable pronunciation feedback", ru: "Нет внятной обратной связи по произношению" },
        ],
      },
      {
        key: "ai-tutor",
        en: "AI tutor falls flat",
        ru: "AI-собеседник не тянет",
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
        en: "Wrong level, no adaptivity",
        ru: "Не тот уровень, нет адаптивности",
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
        en: "Forget it, just cramming",
        ru: "Всё забывается, только зубрёжка",
        forks: [
          { key: "retention.forget", en: "Forget what was learned, no built-in review", ru: "Забываешь пройденное, нет встроенного повторения" },
          { key: "retention.broken-repeat", en: "Broken repeat / review mechanic", ru: "Сломанный механизм повторения" },
          { key: "retention.removed-srs", en: "Removed mnemonics / SRS, users leave for Anki", ru: "Убрали мнемоники / интервалки, уходят в Anki" },
          { key: "retention.saved-words", en: "Can't practice saved / already-learned words", ru: "Нельзя тренировать сохранённые / выученные слова" },
        ],
      },
      {
        key: "content-accuracy",
        en: "Wrong, untrustworthy content",
        ru: "Ошибки в контенте, нельзя доверять",
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
        en: "Missing languages and dialects",
        ru: "Нет нужных языков и диалектов",
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
      { key: "motivation", en: "Boring, easy to quit", ru: "Скучно, легко бросить", forks: [] },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
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
        en: "Can't try before paying",
        ru: "Не попробовать до оплаты",
        forks: [
          { key: "try-before-pay.paywall-lesson-1", en: "Paywalled from the first lesson", ru: "Пейволл с первого урока" },
          { key: "try-before-pay.no-free-eval", en: "No free way to evaluate it", ru: "Нет бесплатного способа оценить" },
          { key: "try-before-pay.all-locked", en: "Everything locked behind subscription", ru: "Всё заперто за подпиской" },
        ],
      },
      { key: "ads", en: "Ads interrupt lessons", ru: "Реклама рвёт урок", forks: [] },
      {
        key: "reliability",
        en: "Broken and buggy",
        ru: "Не работает, глючит",
        forks: [
          { key: "reliability.updates-break", en: "Updates break it / lessons disappear", ru: "Обновления ломают / уроки исчезают" },
          { key: "reliability.crashes", en: "Crashes / won't open / stuck loading", ru: "Крэши / не открывается / зависает на загрузке" },
          { key: "reliability.dead-buttons", en: "Dead buttons, can't continue", ru: "Мёртвые кнопки, нельзя продолжить" },
          { key: "reliability.forced-logout", en: "Forced logout", ru: "Принудительный выход из аккаунта" },
        ],
      },
      {
        key: "progress",
        en: "Lost progress and access",
        ru: "Теряется прогресс и доступ",
        forks: [
          { key: "progress.reverted", en: "Progress reverted / reset", ru: "Прогресс откатился / сбросился" },
          { key: "progress.purchase-not-recognized", en: "Lifetime / purchase not recognized", ru: "Lifetime / покупка не признаётся" },
          { key: "progress.cant-login-paid", en: "Can't log in despite paying", ru: "Не пускает, хотя оплачено" },
        ],
      },
      { key: "support", en: "Support that ignores you", ru: "Поддержка не отвечает", forks: [] },
      {
        key: "offline",
        en: "No offline learning",
        ru: "Не работает оффлайн",
        forks: [
          { key: "offline.removed", en: "Offline mode removed", ru: "Убрали оффлайн-режим" },
          { key: "offline.logs-out", en: "Logs out / breaks without a connection", ru: "Разлогинивает / ломается без сети" },
          { key: "offline.none", en: "No offline support at all", ru: "Оффлайна нет вообще" },
        ],
      },
      { key: "notifications", en: "Notification spam", ru: "Спам уведомлений", forks: [] },
      { key: "accessibility", en: "Not accessible (text size, sight-impaired)", ru: "Проблемы с доступностью (размер текста, слабовидящие)", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  // Translator apps (text / voice / camera). A different product than learning:
  // the job is one accurate translation, not a course. Authored from reading real
  // reviews of iTranslate, Translate Now, Translator GO, Speak & Translate, etc.
  translators: {
    slug: "translators",
    version: "translator-1",
    en: "Translator apps",
    ru: "Приложения-переводчики",
    needs: [
      {
        key: "accuracy",
        en: "Inaccurate, wrong translation",
        ru: "Неточный, неверный перевод",
        forks: [
          { key: "accuracy.nonsense", en: "Output is nonsense / wrong meaning", ru: "На выходе бессмыслица / неверный смысл" },
          { key: "accuracy.voice-wrong", en: "Voice translation wrong (text may be ok)", ru: "Голосовой перевод врёт (текстовый может быть ок)" },
          { key: "accuracy.worse-than-free", en: "Worse than Google / just a wrapper, no added value", ru: "Хуже Google / просто обёртка, без ценности" },
        ],
      },
      {
        key: "speech",
        en: "Doesn't hear or transcribe speech",
        ru: "Не слышит и не распознаёт речь",
        forks: [
          { key: "speech.not-recognized", en: "Doesn't recognize / transcribe spoken words", ru: "Не распознаёт / не расшифровывает речь" },
          { key: "speech.conversation-broken", en: "Two-way conversation mode breaks", ru: "Двусторонний режим разговора ломается" },
        ],
      },
      {
        key: "camera",
        en: "Camera / photo translation broken",
        ru: "Не переводит по фото / с камеры",
        forks: [
          { key: "camera.no-translate", en: "OCR returns the same text / no translation", ru: "OCR возвращает тот же текст / без перевода" },
        ],
      },
      {
        key: "coverage",
        en: "Missing languages and directions",
        ru: "Нет нужных языков и направлений",
        forks: [
          { key: "coverage.missing-language", en: "Wanted language not available", ru: "Нужного языка нет" },
          { key: "coverage.one-direction", en: "Only one direction works (A→B but not B→A)", ru: "Работает только одно направление (A→B, но не B→A)" },
          { key: "coverage.wrong-dialect", en: "Wrong / unsupported dialect or variant", ru: "Не тот / неподдерживаемый диалект или вариант" },
        ],
      },
      {
        key: "reliability",
        en: "Broken and buggy",
        ru: "Не работает, глючит",
        forks: [
          { key: "reliability.errors", en: "Generic errors / does nothing / broke immediately", ru: "Общие ошибки / ничего не делает / сломалось сразу" },
          { key: "reliability.crashes", en: "Crashes / freezes", ru: "Крэши / зависает" },
          { key: "reliability.slow", en: "Slow to load", ru: "Долго грузится" },
          { key: "reliability.device", en: "Broken on a device (Watch, etc.)", ru: "Не работает на устройстве (часы и т.п.)" },
          { key: "reliability.not-as-advertised", en: "Works nothing like the demo / ad", ru: "Работает совсем не как в демо / рекламе" },
        ],
      },
      {
        key: "offline",
        en: "Doesn't work offline or abroad",
        ru: "Не работает оффлайн и в поездке",
        forks: [
          { key: "offline.fails-traveling", en: "Stops working while traveling / needs a connection", ru: "Перестаёт работать в поездке / нужен интернет" },
        ],
      },
      {
        key: "try-before-pay",
        en: "Can't try before paying",
        ru: "Не попробовать до оплаты",
        forks: [
          { key: "try-before-pay.core-locked", en: "The translation itself is paywalled (pay after N uses)", ru: "Сам перевод заперт (платить после N раз)" },
          { key: "try-before-pay.fake-free", en: "Listed as free but forces payment to use", ru: "Заявлен бесплатным, но заставляет платить" },
          { key: "try-before-pay.forced-sub", en: "Forced to subscribe before using (hidden X)", ru: "Заставляет подписаться до использования (спрятанный крестик)" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.trial-trap", en: "'Free trial' charges / auto-subscribes", ru: "«Бесплатный период» списывает / сам оформляет подписку" },
          { key: "billing.charged-full", en: "Charged a full year instead of month", ru: "Списали за год вместо месяца" },
          { key: "billing.cant-cancel", en: "Can't cancel the subscription / trial", ru: "Нельзя отменить подписку / пробный период" },
          { key: "billing.no-refund", en: "No refund given", ru: "Не возвращают деньги" },
          { key: "billing.price-mismatch", en: "Charged a different amount than advertised", ru: "Списали не ту сумму, что в рекламе" },
          { key: "billing.was-onetime", en: "One-time purchase turned into a subscription", ru: "Разовую покупку превратили в подписку" },
        ],
      },
      {
        key: "ads",
        en: "Ads bury the app",
        ru: "Реклама топит приложение",
        forks: [
          { key: "ads.gates-translation", en: "An ad before each translation", ru: "Реклама перед каждым переводом" },
        ],
      },
      { key: "support", en: "Support that ignores you", ru: "Поддержка не отвечает", forks: [] },
      { key: "notifications", en: "Notification spam", ru: "Спам уведомлений", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  // Period & cycle trackers (Flo, Clue, Natural Cycles, Stardust, Lively, etc.).
  // Authored from reading real 1-2 star reviews: the dominant pains are wrong
  // predictions, basic tracking locked behind a paywall, abusive billing,
  // endless-loading / crashes, lost data + lockouts, relentless upgrade nags,
  // broken partner sync, marathon onboarding, rigid logging, alienating tone,
  // no offline, dead support, and privacy worries in an intimate app.
  "period-trackers": {
    slug: "period-trackers",
    version: "period-trackers-1",
    en: "Period & cycle trackers",
    ru: "Трекеры месячных и цикла",
    needs: [
      {
        key: "predictions",
        en: "Predictions don't match reality",
        ru: "Прогнозы не сходятся с реальностью",
        forks: [
          { key: "predictions.dates-off", en: "Period dates are always off", ru: "Даты месячных всегда мимо" },
          { key: "predictions.ovulation", en: "Ovulation date wrong or missed", ru: "Овуляцию определяет неверно или пропускает" },
          { key: "predictions.ignores-cycle", en: "Forces a 28-day cycle, ignores mine", ru: "Навязывает 28-дневный цикл, игнорирует мой" },
          { key: "predictions.irregular", en: "Useless for irregular cycles", ru: "Бесполезно при нерегулярном цикле" },
          { key: "predictions.changed-after", en: "Quietly changes the prediction after the fact", ru: "Задним числом меняет прогноз" },
        ],
      },
      {
        key: "paywall",
        en: "Can't track without paying",
        ru: "Не потрекать без оплаты",
        forks: [
          { key: "paywall.basics-locked", en: "Basic period tracking is behind premium", ru: "Базовый трекинг заперт за премиумом" },
          { key: "paywall.setup-then-pay", en: "Long setup, then a surprise paywall at the end", ru: "Долгая настройка, а в конце внезапный пейволл" },
          { key: "paywall.no-free", en: "No free way to actually use it", ru: "Нет бесплатного способа реально пользоваться" },
          { key: "paywall.was-free", en: "Used to be free, now locked", ru: "Раньше было бесплатно, теперь заперто" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.trial-trap", en: "'Free trial' charges anyway", ru: "«Бесплатный период» всё равно списывает" },
          { key: "billing.cant-cancel", en: "Can't cancel the subscription", ru: "Нельзя отменить подписку" },
          { key: "billing.after-cancel", en: "Charged after cancelling", ru: "Списывают после отмены" },
          { key: "billing.no-refund", en: "No refund, even the same day", ru: "Не возвращают деньги, даже в тот же день" },
          { key: "billing.price-hike", en: "Sudden, steep price increase", ru: "Резкое повышение цены" },
          { key: "billing.charged-unexpected", en: "Charged a full year / an unexpected charge", ru: "Списали за год / неожиданное списание" },
        ],
      },
      {
        key: "reliability",
        en: "Broken and buggy",
        ru: "Не работает, глючит",
        forks: [
          { key: "reliability.wont-open", en: "Endless loading screen / won't open", ru: "Бесконечная загрузка / не открывается" },
          { key: "reliability.crashes", en: "Crashes, especially after an update", ru: "Крэшится, особенно после обновления" },
          { key: "reliability.slow", en: "Slow and laggy", ru: "Тормозит, лагает" },
          { key: "reliability.update-broke", en: "An update broke it", ru: "Обновление сломало" },
        ],
      },
      {
        key: "data-loss",
        en: "Loses your data, locks you out",
        ru: "Теряет данные, не пускает",
        forks: [
          { key: "data-loss.data-gone", en: "Logged data disappeared or reset", ru: "Введённые данные пропали или сбросились" },
          { key: "data-loss.cant-login", en: "Can't log in / locked out on a new phone", ru: "Не войти / заблокировало на новом телефоне" },
          { key: "data-loss.lapse-wipes", en: "Letting premium lapse deletes everything", ru: "Кончилась подписка — всё стёрло" },
          { key: "data-loss.account-gone", en: "Account suddenly gone", ru: "Аккаунт внезапно исчез" },
        ],
      },
      {
        key: "upsell",
        en: "Buried in upgrade nags",
        ru: "Завалено попапами «купи премиум»",
        forks: [
          { key: "upsell.popups", en: "A premium popup on every tap", ru: "Попап про премиум на каждый тап" },
          { key: "upsell.ads", en: "Third-party ads in a tracker", ru: "Сторонняя реклама в трекере" },
        ],
      },
      {
        key: "partner",
        en: "Partner tracking is broken",
        ru: "Парный трекинг сломан",
        forks: [
          { key: "partner.desync", en: "Partner sync keeps breaking", ru: "Синхронизация с партнёром постоянно рвётся" },
          { key: "partner.mirror-broken", en: "Can't see a partner's cycle details", ru: "Не видно деталей цикла партнёра" },
        ],
      },
      {
        key: "onboarding",
        en: "Endless setup before you can start",
        ru: "Бесконечная настройка до старта",
        forks: [
          { key: "onboarding.too-many-questions", en: "A barrage of questions before you can use it", ru: "Гора вопросов, прежде чем начать" },
          { key: "onboarding.rate-too-early", en: "Asks you to rate it before you've used it", ru: "Просит оценить ещё до использования" },
        ],
      },
      {
        key: "logging",
        en: "Can't log or fix what you need",
        ru: "Нельзя внести или исправить нужное",
        forks: [
          { key: "logging.cant-edit", en: "Can't fix or remove a wrong entry", ru: "Нельзя исправить или удалить ошибочную запись" },
          { key: "logging.missing-fields", en: "Missing what you need (postpartum, etc.)", ru: "Нет нужного (постпартум и т.п.)" },
          { key: "logging.removed-feature", en: "Removed or changed a feature you relied on", ru: "Убрали или изменили нужную функцию" },
        ],
      },
      {
        key: "notifications",
        en: "Notifications out of control",
        ru: "Уведомления вышли из-под контроля",
        forks: [
          { key: "notifications.spam", en: "Way too many notifications", ru: "Слишком много уведомлений" },
          { key: "notifications.embarrassing", en: "Exposes private info at the wrong moment", ru: "Светит личное в неподходящий момент" },
          { key: "notifications.cant-control", en: "Can't control timing or turn them off", ru: "Нельзя настроить время или отключить" },
        ],
      },
      { key: "tone", en: "Preachy, unhelpful messaging", ru: "Поучает вместо пользы", forks: [] },
      { key: "offline", en: "Won't work offline", ru: "Не работает оффлайн", forks: [] },
      { key: "support", en: "Support that ignores you", ru: "Поддержка не отвечает", forks: [] },
      {
        key: "privacy",
        en: "Privacy worries in an intimate app",
        ru: "Тревога за приватность в интимном приложении",
        forks: [
          { key: "privacy.partner-notify", en: "Tells a partner you peeked", ru: "Сообщает партнёру, что ты заглянул" },
          { key: "privacy.forced-link", en: "Forces a Google / account link to use", ru: "Заставляет привязать Google / аккаунт" },
        ],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  // Document scanner apps (CamScanner, Adobe Scan, Microsoft Lens, Scanner Pro, etc.).
  // Authored from the dominant pains: OCR garbles text, auto-crop/edge-detection fails,
  // fax never arrives, PDF export locked or corrupt, ads on top of document,
  // billing traps, and subscription can't be cancelled inside the app.
  "scanners-docs": {
    slug: "scanners-docs",
    version: "scanners-docs-1",
    en: "Document scanner apps",
    ru: "Сканеры документов",
    needs: [
      {
        key: "ocr",
        en: "OCR / text recognition fails",
        ru: "OCR не читает текст",
        forks: [
          { key: "ocr.garbled", en: "Garbled characters or wrong words", ru: "Каракули или неверные слова" },
          { key: "ocr.wrong-language", en: "Wrong language detected / letters scrambled", ru: "Не тот язык / перепутал буквы" },
          { key: "ocr.formatting", en: "Destroys layout / columns / tables", ru: "Ломает разметку / колонки / таблицы" },
        ],
      },
      {
        key: "camera",
        en: "Scan / capture quality broken",
        ru: "Качество сканирования сломано",
        forks: [
          { key: "camera.blurry", en: "Output is blurry, dark, or pixelated", ru: "На выходе размытость, темно или пиксели" },
          { key: "camera.auto-broken", en: "Auto-capture / edge detection misfires", ru: "Авто-захват / определение краёв мажет" },
          { key: "camera.shadow", en: "Can't handle shadows, glare, or curved pages", ru: "Не справляется с тенями, бликами, изогнутыми страницами" },
        ],
      },
      {
        key: "pdf",
        en: "PDF export or handling broken",
        ru: "Экспорт в PDF или работа с ним сломана",
        forks: [
          { key: "pdf.corrupt", en: "Exported PDF is corrupt or won't open", ru: "Экспортированный PDF повреждён или не открывается" },
          { key: "pdf.quality", en: "Image quality in the PDF is terrible", ru: "Качество изображения в PDF ужасное" },
          { key: "pdf.merge-broken", en: "Merging pages into one PDF fails", ru: "Объединение страниц в PDF не работает" },
        ],
      },
      {
        key: "fax",
        en: "Fax delivery fails",
        ru: "Факс не доходит",
        forks: [
          { key: "fax.undelivered", en: "Shows sent but the recipient never got it", ru: "Показывает «отправлено», но адресат не получил" },
          { key: "fax.credits", en: "Credits consumed without successful delivery", ru: "Кредиты списаны, но факс не дошёл" },
        ],
      },
      {
        key: "try-before-pay",
        en: "Can't try before paying",
        ru: "Не попробовать до оплаты",
        forks: [
          { key: "try-before-pay.core-locked", en: "Scan or export locked after N free uses", ru: "Сканирование или экспорт заперты после N бесплатных" },
          { key: "try-before-pay.fake-free", en: "Listed as free but forces payment to use", ru: "Заявлен бесплатным, но заставляет платить" },
          { key: "try-before-pay.forced-sub", en: "Forced to subscribe before scanning anything", ru: "Заставляет подписаться до первого сканирования" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.trial-trap", en: "'Free trial' charges immediately or auto-subscribes", ru: "«Бесплатный период» сразу списывает или сам оформляет подписку" },
          { key: "billing.cant-cancel", en: "Can't find where to cancel or cancel button is broken", ru: "Не найти, как отменить, или кнопка отмены сломана" },
          { key: "billing.no-refund", en: "No refund given", ru: "Не возвращают деньги" },
          { key: "billing.was-onetime", en: "One-time purchase turned into a subscription", ru: "Разовую покупку превратили в подписку" },
          { key: "billing.charged-full", en: "Charged a full year instead of the expected amount", ru: "Списали за год вместо ожидаемой суммы" },
        ],
      },
      {
        key: "ads",
        en: "Ads bury the app",
        ru: "Реклама топит приложение",
        forks: [
          { key: "ads.gates-export", en: "Ad shown before every scan or export", ru: "Реклама перед каждым сканом или экспортом" },
        ],
      },
      {
        key: "reliability",
        en: "Broken and buggy",
        ru: "Не работает, глючит",
        forks: [
          { key: "reliability.crashes", en: "Crashes or freezes during scan", ru: "Крэш или зависание во время сканирования" },
          { key: "reliability.slow", en: "Very slow to process", ru: "Очень долго обрабатывает" },
          { key: "reliability.errors", en: "Generic errors / stops working after update", ru: "Общие ошибки / перестало работать после обновления" },
        ],
      },
      {
        key: "cloud",
        en: "Cloud sync or storage broken",
        ru: "Облачная синхронизация сломана",
        forks: [
          { key: "cloud.lost", en: "Scanned documents disappeared from cloud", ru: "Отсканированные документы исчезли из облака" },
          { key: "cloud.no-sync", en: "Sync with Google Drive / Dropbox / iCloud stopped working", ru: "Синхронизация с Google Drive / Dropbox / iCloud не работает" },
        ],
      },
      { key: "support", en: "Support that ignores you", ru: "Поддержка не отвечает", forks: [] },
      { key: "notifications", en: "Notification spam", ru: "Спам уведомлений", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "fitness-workout": {
    slug: "fitness-workout",
    version: "fitness-workout-1",
    en: "Fitness & workout apps",
    ru: "Фитнес и тренировки",
    needs: [
      {
        key: "false-claims",
        en: "False advertising / can't do what it claims",
        ru: "Ложная реклама — не делает то, что обещает",
        forks: [
          { key: "false-claims.camera-bp", en: "Claims to measure BP/heart rate via camera — it can't", ru: "Заявляет измерение давления/пульса через камеру — это невозможно" },
          { key: "false-claims.cortisol", en: "Claims to detect cortisol / hormones — it can't", ru: "Заявляет определение кортизола / гормонов — это невозможно" },
          { key: "false-claims.fake-discount", en: "Fake discount — the 'sale' price is the real price", ru: "Фейковая скидка — «акционная» цена и есть настоящая" },
        ],
      },
      {
        key: "paywall",
        en: "Paywall before you can evaluate",
        ru: "Платный барьер до того, как можно оценить",
        forks: [
          { key: "paywall.no-trial", en: "No free trial / must pay to see anything", ru: "Нет пробного периода — нужно платить, чтобы вообще что-то увидеть" },
          { key: "paywall.rate-first", en: "Forces rating before unlocking features", ru: "Заставляет оценить приложение до разблокировки функций" },
          { key: "paywall.locked-basic", en: "Basic features (workouts, logging) paywalled", ru: "Базовые функции (тренировки, дневник) за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps and unauthorized charges",
        ru: "Биллинг-ловушки и несанкционированные списания",
        forks: [
          { key: "billing.charged-on-trial", en: "Charged immediately on free trial", ru: "Списали сразу при оформлении пробного периода" },
          { key: "billing.cant-cancel", en: "Can't find cancel button / cancellation is a nightmare", ru: "Нет кнопки отмены / отменить — настоящий кошмар" },
          { key: "billing.charged-after-cancel", en: "Charged after cancellation", ru: "Списывают после отмены" },
          { key: "billing.dual-subscription", en: "Charged for two subscriptions at once", ru: "Списывают за две подписки одновременно" },
          { key: "billing.lifetime-betrayal", en: "Lifetime purchase revoked — now subscription required", ru: "Пожизненная покупка аннулирована — теперь нужна подписка" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes, freezes, won't load",
        ru: "Вылетает, зависает, не загружается",
        forks: [
          { key: "reliability.crashes", en: "App crashes or force-closes", ru: "Приложение вылетает" },
          { key: "reliability.wont-load", en: "Stuck on loading / white screen", ru: "Зависает на загрузке / белый экран" },
          { key: "reliability.workout-gen", en: "Fails to generate workout / plan", ru: "Не генерирует тренировку / план" },
          { key: "reliability.login", en: "Can't log in / account issues", ru: "Не войти / проблемы с аккаунтом" },
        ],
      },
      {
        key: "ai-data",
        en: "AI metrics are wrong or unreliable",
        ru: "AI-метрики неверны или ненадёжны",
        forks: [
          { key: "ai-data.absurd", en: "Shows absurd data (24h of cardio, impossible readings)", ru: "Показывает абсурдные данные (24ч кардио, нереальные показатели)" },
          { key: "ai-data.no-adapt", en: "Doesn't adapt to my actual fitness level", ru: "Не подстраивается под реальный уровень физподготовки" },
          { key: "ai-data.conflict", en: "Data conflicts with wearable / other health sources", ru: "Данные расходятся с носимым устройством / другими источниками" },
          { key: "ai-data.generic", en: "AI gives generic advice, not personalized", ru: "AI даёт обобщённые советы без персонализации" },
        ],
      },
      {
        key: "ads",
        en: "Overwhelming ads",
        ru: "Реклама буквально везде",
        forks: [
          { key: "ads.fullscreen", en: "Full-screen ads you can't skip", ru: "Полноэкранная реклама без возможности пропустить" },
          { key: "ads.even-paid", en: "Ads persist even after paying", ru: "Реклама продолжается даже после оплаты" },
          { key: "ads.upsell-nag", en: "Constant upsell popups inside the app", ru: "Постоянные попапы с предложением купить больше" },
        ],
      },
      {
        key: "sync",
        en: "Sync and data loss",
        ru: "Синхронизация и потеря данных",
        forks: [
          { key: "sync.broken", en: "Sync with wearable or health app broken", ru: "Синхронизация с устройством или Health-приложением сломана" },
          { key: "sync.lost-progress", en: "Progress / workout history lost after update or reinstall", ru: "История / прогресс потеряны после обновления или переустановки" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke what worked before",
        ru: "Обновление сломало то, что работало",
        forks: [],
      },
      {
        key: "support",
        en: "Support doesn't respond",
        ru: "Поддержка не отвечает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "calorie-diet": {
    slug: "calorie-diet",
    version: "calorie-diet-1",
    en: "Calorie counting & diet apps",
    ru: "Счёт калорий и диеты",
    needs: [
      {
        key: "database",
        en: "Food database is wrong or missing",
        ru: "База еды неверная или неполная",
        forks: [
          { key: "database.wrong-calories", en: "Wrong calorie / macro counts for common foods", ru: "Неверные калории / макросы для обычных продуктов" },
          { key: "database.missing-foods", en: "Missing local / regional / branded foods", ru: "Нет местных / региональных / брендовых продуктов" },
          { key: "database.barcode-fail", en: "Barcode scanner fails or shows wrong product", ru: "Сканер штрих-кода не работает или показывает не тот продукт" },
          { key: "database.duplicates", en: "Duplicate entries with conflicting data", ru: "Дубли с противоречивыми данными" },
        ],
      },
      {
        key: "paywall",
        en: "Core features locked behind subscription",
        ru: "Основные функции за подпиской",
        forks: [
          { key: "paywall.macro-tracking", en: "Macro / nutrient tracking requires premium", ru: "Отслеживание макросов / питательных веществ — только в премиуме" },
          { key: "paywall.logging", en: "Basic food logging limited or locked", ru: "Базовый дневник еды ограничен или заблокирован" },
          { key: "paywall.recipes", en: "Recipe logging / meal plans paywalled", ru: "Рецепты / планы питания за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on 'free' trial without warning", ru: "Списали на «бесплатном» пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation impossible or ignored", ru: "Отмена невозможна или игнорируется" },
          { key: "billing.price-hike", en: "Subscription price raised without notice", ru: "Подписку подняли без предупреждения" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes, sync failures, data loss",
        ru: "Сбои, потеря данных, вылеты",
        forks: [
          { key: "reliability.crashes", en: "App crashes or freezes during logging", ru: "Вылетает или зависает при внесении данных" },
          { key: "reliability.sync", en: "Doesn't sync across devices or with wearables", ru: "Не синхронизируется между устройствами или с трекерами" },
          { key: "reliability.lost-data", en: "Logged food / streaks / history disappears", ru: "Внесённые данные / стрики / история исчезают" },
        ],
      },
      {
        key: "ai-goals",
        en: "AI goal setting is harmful or absurd",
        ru: "AI-цели вредные или абсурдные",
        forks: [
          { key: "ai-goals.too-low", en: "Sets dangerously low calorie targets", ru: "Ставит опасно низкие целевые калории" },
          { key: "ai-goals.no-adapt", en: "Doesn't adjust as weight / activity changes", ru: "Не корректирует при изменении веса / активности" },
        ],
      },
      {
        key: "ads",
        en: "Excessive ads",
        ru: "Слишком много рекламы",
        forks: [
          { key: "ads.upsell", en: "Constant upsell nags", ru: "Постоянные предложения купить больше" },
          { key: "ads.fullscreen", en: "Full-screen ads interrupt logging", ru: "Полноэкранная реклама прерывает работу" },
        ],
      },
      {
        key: "ux",
        en: "Tedious, confusing UX",
        ru: "Неудобный, запутанный интерфейс",
        forks: [
          { key: "ux.too-many-taps", en: "Too many taps to log a meal", ru: "Слишком много нажатий чтобы внести приём пищи" },
          { key: "ux.broken-search", en: "Food search broken or slow", ru: "Поиск еды сломан или медленный" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke working features",
        ru: "Обновление сломало рабочие функции",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "photo-editors": {
    slug: "photo-editors",
    version: "photo-editors-1",
    en: "Photo editing apps",
    ru: "Фоторедакторы",
    needs: [
      {
        key: "paywall",
        en: "Paywall on basic edits",
        ru: "Пейволл на базовые правки",
        forks: [
          { key: "paywall.filters", en: "Most filters / tools locked", ru: "Большинство фильтров / инструментов заблокированы" },
          { key: "paywall.export", en: "Export / save without watermark requires subscription", ru: "Экспорт / сохранение без водяного знака — только по подписке" },
          { key: "paywall.basic-edits", en: "Crop, brightness, basic edits are paywalled", ru: "Обрезка, яркость, базовые правки — за пейволлом" },
        ],
      },
      {
        key: "watermark",
        en: "Forced watermark on saved photos",
        ru: "Принудительный водяной знак на сохранённых фото",
        forks: [
          { key: "watermark.free", en: "Watermark stamped on free-tier output", ru: "Водяной знак на результате в бесплатной версии" },
          { key: "watermark.cant-remove", en: "No way to remove watermark even by paying", ru: "Нет способа убрать водяной знак даже за деньги" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged immediately on trial", ru: "Списали сразу при пробном периоде" },
          { key: "billing.cant-cancel", en: "Cancellation hidden or broken", ru: "Отмена скрыта или не работает" },
          { key: "billing.price-hike", en: "Price raised without notice", ru: "Цену подняли без предупреждения" },
          { key: "billing.accidental", en: "Accidental one-tap purchase, no refund", ru: "Случайная покупка в один клик, возврат отказан" },
        ],
      },
      {
        key: "quality",
        en: "Output quality is bad",
        ru: "Плохое качество результата",
        forks: [
          { key: "quality.ai-artifacts", en: "AI edits leave artifacts / unnatural look", ru: "AI-правки оставляют артефакты / неестественный вид" },
          { key: "quality.lossy-save", en: "Saves at lower resolution / quality than original", ru: "Сохраняет с меньшим разрешением / качеством, чем оригинал" },
          { key: "quality.bg-removal", en: "Background removal cuts out wrong parts", ru: "Удаление фона вырезает не то" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes and data loss",
        ru: "Вылеты и потеря работы",
        forks: [
          { key: "reliability.crashes", en: "Crashes mid-edit, losing work", ru: "Вылетает в середине редактирования, работа теряется" },
          { key: "reliability.slow", en: "Extremely slow / laggy on common devices", ru: "Очень медленно / тормозит на обычных устройствах" },
          { key: "reliability.import", en: "Can't import from gallery / camera roll", ru: "Нельзя импортировать из галереи / фотоплёнки" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt editing",
        ru: "Реклама прерывает редактирование",
        forks: [
          { key: "ads.between-edits", en: "Full-screen ad after every edit action", ru: "Полноэкранная реклама после каждого действия" },
          { key: "ads.even-paid", en: "Ads shown even in paid tier", ru: "Реклама показывается даже в платной версии" },
        ],
      },
      {
        key: "broken-update",
        en: "Update removed / broke features",
        ru: "Обновление убрало / сломало функции",
        forks: [],
      },
      {
        key: "privacy",
        en: "Privacy and data concerns",
        ru: "Приватность и передача данных",
        forks: [
          { key: "privacy.requires-account", en: "Account required just to edit a photo", ru: "Аккаунт нужен просто чтобы отредактировать фото" },
          { key: "privacy.uploads-photos", en: "Uploads photos to cloud without clear consent", ru: "Загружает фото в облако без явного согласия" },
        ],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "recipes-cooking": {
    slug: "recipes-cooking",
    version: "recipes-cooking-1",
    en: "Recipe & cooking apps",
    ru: "Рецепты и кулинария",
    needs: [
      {
        key: "paywall",
        en: "Recipes paywalled",
        ru: "Рецепты за пейволлом",
        forks: [
          { key: "paywall.most-recipes", en: "Majority of recipes require subscription", ru: "Большинство рецептов — только по подписке" },
          { key: "paywall.save", en: "Can't save or bookmark recipes without paying", ru: "Нельзя сохранить или добавить в закладки без оплаты" },
          { key: "paywall.shopping-list", en: "Shopping list / meal planning paywalled", ru: "Список покупок / планирование питания за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on free trial without clear warning", ru: "Списали на бесплатном пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation is impossible or ignored", ru: "Отмена невозможна или игнорируется" },
        ],
      },
      {
        key: "content-quality",
        en: "Recipes don't work or are wrong",
        ru: "Рецепты не работают или содержат ошибки",
        forks: [
          { key: "content-quality.wrong-times", en: "Cook times / temperatures are wrong", ru: "Неверное время / температура приготовления" },
          { key: "content-quality.missing-steps", en: "Missing steps or ingredients in instructions", ru: "Пропущены шаги или ингредиенты" },
          { key: "content-quality.ai-slop", en: "AI-generated recipes that taste terrible or are unsafe", ru: "AI-рецепты, которые невкусные или небезопасны" },
          { key: "content-quality.metric", en: "Units wrong or not convertible", ru: "Неверные или неконвертируемые единицы измерения" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes or loses data",
        ru: "Вылеты или потеря данных",
        forks: [
          { key: "reliability.crashes", en: "Crashes during cooking / timer use", ru: "Вылетает во время готовки / при использовании таймера" },
          { key: "reliability.sync", en: "Recipes / lists don't sync across devices", ru: "Рецепты / списки не синхронизируются между устройствами" },
          { key: "reliability.lost-data", en: "Saved recipes / grocery lists disappear", ru: "Сохранённые рецепты / списки покупок пропадают" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt cooking",
        ru: "Реклама мешает готовке",
        forks: [
          { key: "ads.mid-recipe", en: "Ad appears while following recipe steps", ru: "Реклама появляется в процессе следования рецепту" },
          { key: "ads.upsell", en: "Constant upgrade nags", ru: "Постоянные предложения купить больше" },
        ],
      },
      {
        key: "search",
        en: "Search and discovery broken",
        ru: "Поиск и навигация не работают",
        forks: [
          { key: "search.filters", en: "Can't filter by dietary restrictions / ingredients", ru: "Нельзя фильтровать по диете / ингредиентам" },
          { key: "search.irrelevant", en: "Search returns wrong results", ru: "Поиск возвращает нерелевантные результаты" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke saved recipes or layout",
        ru: "Обновление сломало сохранённые рецепты или интерфейс",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "ai-chat": {
    slug: "ai-chat",
    version: "ai-chat-1",
    en: "AI chat & companion apps",
    ru: "AI-чат и компаньоны",
    needs: [
      {
        key: "paywall",
        en: "Everything meaningful is paywalled",
        ru: "Всё значимое за пейволлом",
        forks: [
          { key: "paywall.memory", en: "Memory / context requires subscription", ru: "Память / контекст только по подписке" },
          { key: "paywall.persona", en: "Custom personas / characters paywalled", ru: "Кастомные персонажи за пейволлом" },
          { key: "paywall.model", en: "Better AI model locked behind paywall", ru: "Более умная модель — только за деньги" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on free trial without warning", ru: "Списали на бесплатном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation hidden or broken", ru: "Отмена скрыта или не работает" },
          { key: "billing.price-hike", en: "Subscription price suddenly raised", ru: "Цену подписки резко подняли" },
          { key: "billing.tokens-gone", en: "Paid credits / tokens disappear", ru: "Оплаченные кредиты / токены исчезают" },
        ],
      },
      {
        key: "quality",
        en: "AI responses are bad",
        ru: "AI отвечает плохо",
        forks: [
          { key: "quality.repetitive", en: "Gives same answers, stuck in a loop", ru: "Повторяет одни и те же ответы, зависает в цикле" },
          { key: "quality.forgets", en: "Forgets context within same conversation", ru: "Забывает контекст внутри одного разговора" },
          { key: "quality.personality-lost", en: "Persona / character changed or dumbed down after update", ru: "Персонаж изменился или поглупел после обновления" },
          { key: "quality.hallucinations", en: "Makes up facts / gives dangerous advice", ru: "Выдумывает факты / даёт опасные советы" },
        ],
      },
      {
        key: "censorship",
        en: "Over-censorship breaks use cases",
        ru: "Чрезмерная цензура ломает сценарии использования",
        forks: [
          { key: "censorship.creative", en: "Refuses creative writing / roleplay without reason", ru: "Отказывается от творческих историй / ролевых игр без причины" },
          { key: "censorship.jailbreak-ban", en: "Account banned for normal prompts", ru: "Аккаунт заблокирован за обычные запросы" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes and server errors",
        ru: "Вылеты и ошибки сервера",
        forks: [
          { key: "reliability.crashes", en: "App crashes or freezes", ru: "Вылетает или зависает" },
          { key: "reliability.server-down", en: "Server errors / can't connect", ru: "Ошибки сервера / нет соединения" },
        ],
      },
      {
        key: "privacy",
        en: "Privacy and data concerns",
        ru: "Приватность и данные",
        forks: [
          { key: "privacy.data-sharing", en: "Conversation data sold / shared with third parties", ru: "Данные разговоров продаются / передаются третьим сторонам" },
          { key: "privacy.forced-account", en: "Account / personal data required just to chat", ru: "Нужны аккаунт / личные данные просто чтобы поговорить" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke features or changed personality",
        ru: "Обновление сломало функции или изменило персонажа",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "phone-utilities": {
    slug: "phone-utilities",
    version: "phone-utilities-1",
    en: "Phone utility apps",
    ru: "Утилиты для телефона",
    needs: [
      {
        key: "false-claims",
        en: "Doesn't do what it advertises",
        ru: "Не делает того, что рекламирует",
        forks: [
          { key: "false-claims.cleaner", en: "Cleaner / optimizer doesn't free real space", ru: "Очиститель / оптимизатор не освобождает реальное место" },
          { key: "false-claims.battery", en: "Battery saver doesn't improve battery life", ru: "Экономия батареи не улучшает жизнь от аккумулятора" },
          { key: "false-claims.antivirus", en: "Claims to find viruses on clean device", ru: "Заявляет о найденных вирусах на чистом устройстве" },
        ],
      },
      {
        key: "paywall",
        en: "Everything useful is locked",
        ru: "Всё полезное заблокировано",
        forks: [
          { key: "paywall.core-function", en: "Core advertised function requires subscription", ru: "Основная рекламируемая функция требует подписки" },
          { key: "paywall.results", en: "Shows findings but requires payment to fix/remove them", ru: "Показывает находки, но требует оплаты чтобы исправить" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена сломана или скрыта" },
          { key: "billing.auto-renew", en: "Auto-renewal not disclosed upfront", ru: "Автопродление не раскрыто заранее" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes, slows device, causes problems",
        ru: "Вылеты, тормозит устройство, создаёт проблемы",
        forks: [
          { key: "reliability.crashes", en: "App itself crashes", ru: "Само приложение вылетает" },
          { key: "reliability.slows-phone", en: "Makes phone slower or drains battery", ru: "Замедляет телефон или разряжает батарею" },
          { key: "reliability.breaks-system", en: "Caused other apps to stop working", ru: "Из-за него другие приложения перестали работать" },
        ],
      },
      {
        key: "ads",
        en: "Excessive ads and notification spam",
        ru: "Навязчивая реклама и спам уведомлений",
        forks: [
          { key: "ads.fullscreen", en: "Full-screen ads interrupt use", ru: "Полноэкранная реклама прерывает работу" },
          { key: "ads.notifications", en: "Notification spam to get you back in the app", ru: "Спам уведомлений, чтобы вернуть в приложение" },
        ],
      },
      {
        key: "privacy",
        en: "Privacy violations",
        ru: "Нарушение приватности",
        forks: [
          { key: "privacy.excess-permissions", en: "Requests excessive permissions unrelated to function", ru: "Запрашивает избыточные разрешения без связи с функцией" },
          { key: "privacy.data-harvest", en: "Sells or shares personal data", ru: "Продаёт или передаёт личные данные" },
        ],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "smb-invoicing": {
    slug: "smb-invoicing",
    version: "smb-invoicing-1",
    en: "Small business invoicing & accounting apps",
    ru: "Счета и учёт для малого бизнеса",
    needs: [
      {
        key: "paywall",
        en: "Basic business features paywalled",
        ru: "Базовые бизнес-функции за пейволлом",
        forks: [
          { key: "paywall.invoices", en: "Invoice limit or PDF export requires subscription", ru: "Лимит счетов или экспорт в PDF требуют подписки" },
          { key: "paywall.reports", en: "Reports and analytics locked", ru: "Отчёты и аналитика заблокированы" },
          { key: "paywall.clients", en: "Client / contact limit on free tier", ru: "Лимит клиентов / контактов на бесплатном уровне" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or ignored", ru: "Отмена не работает или игнорируется" },
          { key: "billing.price-hike", en: "Price raised significantly without notice", ru: "Цена резко поднята без уведомления" },
          { key: "billing.lost-data", en: "Data lost or locked when subscription lapses", ru: "Данные пропадают или блокируются при истечении подписки" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes, sync failures, calculation errors",
        ru: "Сбои, ошибки синхронизации, ошибки расчётов",
        forks: [
          { key: "reliability.crashes", en: "App crashes during invoicing / data entry", ru: "Вылетает при создании счёта / вводе данных" },
          { key: "reliability.sync", en: "Bank sync or cloud sync broken", ru: "Синхронизация с банком или облаком сломана" },
          { key: "reliability.calc-errors", en: "Tax or total calculation errors", ru: "Ошибки в расчёте налогов или итогов" },
        ],
      },
      {
        key: "tax-compliance",
        en: "Tax rules are wrong or outdated",
        ru: "Налоговые правила неверны или устарели",
        forks: [
          { key: "tax-compliance.wrong-rates", en: "Wrong tax rates for jurisdiction", ru: "Неверные налоговые ставки для юрисдикции" },
          { key: "tax-compliance.missing-country", en: "Doesn't support my country / currency", ru: "Не поддерживает мою страну / валюту" },
        ],
      },
      {
        key: "usability",
        en: "Confusing or unusable interface",
        ru: "Непонятный или неудобный интерфейс",
        forks: [
          { key: "usability.complex", en: "Too complex / steep learning curve for small business", ru: "Слишком сложно для малого бизнеса" },
          { key: "usability.mobile-broken", en: "Mobile version broken or missing key features", ru: "Мобильная версия сломана или лишена ключевых функций" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke working features",
        ru: "Обновление сломало то, что работало",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "kids-learning": {
    slug: "kids-learning",
    version: "kids-learning-1",
    en: "Kids learning & education apps",
    ru: "Обучение для детей",
    needs: [
      {
        key: "paywall",
        en: "Most content paywalled",
        ru: "Большинство контента за пейволлом",
        forks: [
          { key: "paywall.content", en: "Free version has too little content to be useful", ru: "В бесплатной версии слишком мало контента" },
          { key: "paywall.game-locked", en: "Educational games locked after short free preview", ru: "Обучающие игры закрываются после короткого бесплатного просмотра" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.child-purchase", en: "Child accidentally makes in-app purchase", ru: "Ребёнок случайно совершил покупку в приложении" },
          { key: "billing.charged-trial", en: "Charged on trial without clear warning", ru: "Списали на пробном периоде без чёткого предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "content-quality",
        en: "Content is wrong, low quality or age-inappropriate",
        ru: "Контент неверный, низкого качества или не по возрасту",
        forks: [
          { key: "content-quality.errors", en: "Factual errors in lessons", ru: "Фактические ошибки в уроках" },
          { key: "content-quality.too-easy", en: "Too easy / boring for child's age", ru: "Слишком легко / скучно для возраста ребёнка" },
          { key: "content-quality.ads-kids", en: "Ads or mature content shown to children", ru: "Реклама или взрослый контент показываются детям" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes or loses progress",
        ru: "Вылеты или потеря прогресса",
        forks: [
          { key: "reliability.crashes", en: "Crashes during lesson / game", ru: "Вылетает во время урока / игры" },
          { key: "reliability.progress-lost", en: "Child's progress / stars reset after update", ru: "Прогресс / звёздочки ребёнка сбрасываются после обновления" },
        ],
      },
      {
        key: "ads",
        en: "Ads shown to children",
        ru: "Реклама показывается детям",
        forks: [
          { key: "ads.kids", en: "Ads (including adult/inappropriate) appear in kids content", ru: "Реклама (включая взрослую) появляется в детском контенте" },
          { key: "ads.upsell-in-game", en: "In-game upsells disrupt learning", ru: "Upsell-предложения прерывают обучение" },
        ],
      },
      {
        key: "privacy",
        en: "COPPA / child privacy violations",
        ru: "Нарушения приватности детей",
        forks: [
          { key: "privacy.data-kids", en: "Collects child's data without parental consent", ru: "Собирает данные ребёнка без согласия родителей" },
          { key: "privacy.social-features", en: "Unmoderated chat or social features with strangers", ru: "Немодерируемый чат или соцфункции с незнакомцами" },
        ],
      },
      {
        key: "broken-update",
        en: "Update reset progress or broke features",
        ru: "Обновление сбросило прогресс или сломало функции",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores parents",
        ru: "Поддержка игнорирует родителей",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "sleep-meditation": {
    slug: "sleep-meditation",
    version: "sleep-meditation-1",
    en: "Sleep & meditation apps",
    ru: "Сон и медитация",
    needs: [
      {
        key: "paywall",
        en: "Almost everything paywalled",
        ru: "Почти всё за пейволлом",
        forks: [
          { key: "paywall.content", en: "All sleep sounds / meditations locked", ru: "Все звуки / медитации заблокированы" },
          { key: "paywall.sleep-tracking", en: "Sleep tracking requires subscription", ru: "Отслеживание сна только по подписке" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged immediately on free trial", ru: "Списали сразу на пробном периоде" },
          { key: "billing.cant-cancel", en: "Cancellation impossible or ignored", ru: "Отмена невозможна или игнорируется" },
          { key: "billing.price-hike", en: "Price raised significantly without notice", ru: "Цена резко поднята без уведомления" },
          { key: "billing.lifetime-betrayal", en: "Lifetime purchase revoked, subscription now required", ru: "Пожизненная покупка аннулирована, теперь нужна подписка" },
        ],
      },
      {
        key: "reliability",
        en: "App fails at night when needed most",
        ru: "Приложение отказывает ночью, когда нужнее всего",
        forks: [
          { key: "reliability.stops-playing", en: "Sleep sounds stop mid-night", ru: "Звуки сна замолкают посреди ночи" },
          { key: "reliability.alarm-fail", en: "Alarm doesn't go off", ru: "Будильник не срабатывает" },
          { key: "reliability.crashes", en: "App crashes or freezes", ru: "Приложение вылетает или зависает" },
          { key: "reliability.battery-drain", en: "Drains battery overnight", ru: "Разряжает батарею за ночь" },
        ],
      },
      {
        key: "sleep-tracking",
        en: "Sleep tracking is inaccurate",
        ru: "Отслеживание сна неточное",
        forks: [
          { key: "sleep-tracking.wrong", en: "Shows wrong sleep times / stages", ru: "Показывает неверное время / фазы сна" },
          { key: "sleep-tracking.no-wearable", en: "Doesn't work without wearable / extra purchase", ru: "Не работает без носимого устройства / доп. покупки" },
        ],
      },
      {
        key: "content",
        en: "Content is not calming or effective",
        ru: "Контент не успокаивает и не помогает",
        forks: [
          { key: "content.low-quality", en: "Low-quality audio / AI-generated voices", ru: "Низкое качество аудио / AI-голоса" },
          { key: "content.limited", en: "Very limited library after initial content", ru: "Очень ограниченная библиотека после базового контента" },
        ],
      },
      {
        key: "ads",
        en: "Ads at bedtime",
        ru: "Реклама перед сном",
        forks: [
          { key: "ads.bedtime", en: "Ads shown when opening app at bedtime", ru: "Реклама показывается при открытии перед сном" },
          { key: "ads.upsell", en: "Constant upsell nags in a relaxation app", ru: "Постоянные upsell-предложения в приложении для расслабления" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke sleep sounds or tracking",
        ru: "Обновление сломало звуки сна или трекинг",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "maps-navigation": {
    slug: "maps-navigation",
    version: "maps-navigation-1",
    en: "Maps & navigation apps",
    ru: "Карты и навигация",
    needs: [
      {
        key: "routing",
        en: "Directions are wrong or dangerous",
        ru: "Маршруты неверные или опасные",
        forks: [
          { key: "routing.wrong-route", en: "Routes through roads that don't exist / are closed", ru: "Маршруты через несуществующие / закрытые дороги" },
          { key: "routing.off-road", en: "Sends onto dirt tracks, dead ends, private roads", ru: "Отправляет на грунтовки, тупики, частные дороги" },
          { key: "routing.recalculate", en: "Constantly recalculates / changes route mid-trip", ru: "Постоянно пересчитывает / меняет маршрут в пути" },
          { key: "routing.avoidance", en: "Ignores avoid-tolls / avoid-highways setting", ru: "Игнорирует настройку объезда платных дорог / шоссе" },
        ],
      },
      {
        key: "map-data",
        en: "Map data is outdated or wrong",
        ru: "Данные карты устарели или неверны",
        forks: [
          { key: "map-data.poi", en: "Business is closed / moved, still shown on map", ru: "Бизнес закрыт / переехал, но всё ещё на карте" },
          { key: "map-data.speed-limit", en: "Speed limit shown wrong", ru: "Неверное ограничение скорости" },
          { key: "map-data.outdated", en: "New roads / changes not reflected", ru: "Новые дороги / изменения не отражены" },
        ],
      },
      {
        key: "reliability",
        en: "App fails while driving",
        ru: "Приложение отказывает за рулём",
        forks: [
          { key: "reliability.gps-lost", en: "GPS signal lost in the middle of navigation", ru: "GPS-сигнал теряется в середине навигации" },
          { key: "reliability.crashes", en: "App crashes or freezes while navigating", ru: "Вылетает или зависает во время навигации" },
          { key: "reliability.offline", en: "Offline maps don't work / download broken", ru: "Офлайн-карты не работают / загрузка сломана" },
        ],
      },
      {
        key: "paywall",
        en: "Navigation features paywalled",
        ru: "Функции навигации за пейволлом",
        forks: [
          { key: "paywall.offline", en: "Offline maps require subscription", ru: "Офлайн-карты только по подписке" },
          { key: "paywall.traffic", en: "Live traffic requires premium", ru: "Пробки в реальном времени — только в премиуме" },
        ],
      },
      {
        key: "ads",
        en: "Ads while driving",
        ru: "Реклама за рулём",
        forks: [
          { key: "ads.during-nav", en: "Ads appear during active navigation", ru: "Реклама появляется во время навигации" },
          { key: "ads.sponsored-poi", en: "Sponsored POIs / detours pushed without warning", ru: "Спонсируемые точки / объезды предлагаются без предупреждения" },
        ],
      },
      {
        key: "privacy",
        en: "Location tracking and privacy",
        ru: "Отслеживание местоположения и приватность",
        forks: [
          { key: "privacy.background", en: "Tracks location even when app is closed", ru: "Отслеживает местоположение, даже когда приложение закрыто" },
          { key: "privacy.data-selling", en: "Location data sold to third parties", ru: "Данные местоположения продаются третьим сторонам" },
        ],
      },
      {
        key: "voice",
        en: "Voice guidance broken",
        ru: "Голосовые подсказки не работают",
        forks: [
          { key: "voice.silent", en: "No voice instructions / turns announced too late", ru: "Нет голосовых подсказок / повороты объявляются слишком поздно" },
          { key: "voice.carplay", en: "CarPlay / Android Auto integration broken", ru: "Интеграция с CarPlay / Android Auto сломана" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke the app",
        ru: "Обновление сломало приложение",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores map correction reports",
        ru: "Поддержка игнорирует сообщения об ошибках на карте",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "planners-productivity": {
    slug: "planners-productivity",
    version: "planners-productivity-1",
    en: "Planner & productivity apps",
    ru: "Планировщики и продуктивность",
    needs: [
      {
        key: "paywall",
        en: "Core productivity features paywalled",
        ru: "Основные функции продуктивности за пейволлом",
        forks: [
          { key: "paywall.projects", en: "Multiple projects / workspaces require subscription", ru: "Несколько проектов / рабочих пространств — только по подписке" },
          { key: "paywall.sync", en: "Cross-device sync is paywalled", ru: "Синхронизация между устройствами за пейволлом" },
          { key: "paywall.reminders", en: "Recurring reminders or notifications locked", ru: "Повторяющиеся напоминания или уведомления заблокированы" },
          { key: "paywall.views", en: "Calendar / timeline / Kanban view paywalled", ru: "Вид календаря / временной шкалы / Kanban за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.price-hike", en: "Price raised significantly without notice", ru: "Цена резко поднята без уведомления" },
        ],
      },
      {
        key: "reliability",
        en: "Tasks disappear or sync fails",
        ru: "Задачи пропадают или синхронизация не работает",
        forks: [
          { key: "reliability.sync", en: "Changes don't sync across devices", ru: "Изменения не синхронизируются между устройствами" },
          { key: "reliability.lost-data", en: "Tasks / notes / plans disappear", ru: "Задачи / заметки / планы пропадают" },
          { key: "reliability.crashes", en: "App crashes during data entry", ru: "Вылетает при вводе данных" },
        ],
      },
      {
        key: "ux",
        en: "Overcomplicated or unusable UX",
        ru: "Слишком сложный или неудобный интерфейс",
        forks: [
          { key: "ux.steep-learning", en: "Too steep learning curve for simple task management", ru: "Слишком сложно для простого управления задачами" },
          { key: "ux.bloated", en: "Feature bloat makes simple tasks hard", ru: "Раздутый функционал усложняет простые задачи" },
          { key: "ux.no-widget", en: "Widget broken or missing on home screen", ru: "Виджет сломан или отсутствует на главном экране" },
        ],
      },
      {
        key: "notifications",
        en: "Reminders don't fire or spam",
        ru: "Напоминания не срабатывают или спамят",
        forks: [
          { key: "notifications.dont-fire", en: "Reminders don't arrive on time", ru: "Напоминания не приходят вовремя" },
          { key: "notifications.spam", en: "Excessive notifications / upsell pings", ru: "Избыточные уведомления / upsell-пинги" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke the app or changed the UI",
        ru: "Обновление сломало приложение или поменяло интерфейс",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "finance-personal": {
    slug: "finance-personal",
    version: "finance-personal-1",
    en: "Personal finance & budgeting apps",
    ru: "Личные финансы и бюджет",
    needs: [
      {
        key: "bank-sync",
        en: "Bank connection broken",
        ru: "Подключение к банку сломано",
        forks: [
          { key: "bank-sync.disconnects", en: "Bank sync disconnects constantly", ru: "Подключение к банку постоянно обрывается" },
          { key: "bank-sync.wrong-transactions", en: "Transactions categorized wrong or duplicated", ru: "Транзакции неверно категоризируются или дублируются" },
          { key: "bank-sync.missing-bank", en: "My bank not supported", ru: "Мой банк не поддерживается" },
        ],
      },
      {
        key: "paywall",
        en: "Core budgeting features paywalled",
        ru: "Основные функции бюджета за пейволлом",
        forks: [
          { key: "paywall.accounts", en: "Multiple accounts require subscription", ru: "Несколько счетов только по подписке" },
          { key: "paywall.reports", en: "Spending reports / analytics locked", ru: "Отчёты по расходам / аналитика заблокированы" },
          { key: "paywall.budget-rules", en: "Custom budget rules require premium", ru: "Кастомные правила бюджета — только в премиуме" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.price-hike", en: "Subscription price raised without notice", ru: "Цена подписки поднята без уведомления" },
        ],
      },
      {
        key: "data-accuracy",
        en: "Balance and data is wrong",
        ru: "Баланс и данные неверные",
        forks: [
          { key: "data-accuracy.wrong-balance", en: "Shows wrong balance / net worth", ru: "Показывает неверный баланс / состояние" },
          { key: "data-accuracy.missing-trans", en: "Missing or delayed transactions", ru: "Пропущенные или задержанные транзакции" },
          { key: "data-accuracy.rounding", en: "Rounding errors in totals", ru: "Ошибки округления в итогах" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes or data loss",
        ru: "Вылеты или потеря данных",
        forks: [
          { key: "reliability.crashes", en: "Crashes during data entry or sync", ru: "Вылетает при вводе данных или синхронизации" },
          { key: "reliability.lost-data", en: "Budgets / transaction history disappears", ru: "Бюджеты / история транзакций пропадают" },
        ],
      },
      {
        key: "privacy",
        en: "Security and privacy concerns",
        ru: "Проблемы безопасности и приватности",
        forks: [
          { key: "privacy.credentials", en: "Requires full bank login credentials, not OAuth", ru: "Требует полные данные от банка, а не OAuth" },
          { key: "privacy.data-selling", en: "Sells financial data to third parties", ru: "Продаёт финансовые данные третьим сторонам" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke sync or budgets",
        ru: "Обновление сломало синхронизацию или бюджеты",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "recording-transcription": {
    slug: "recording-transcription",
    version: "recording-transcription-1",
    en: "Recording & transcription apps",
    ru: "Запись и транскрипция",
    needs: [
      {
        key: "accuracy",
        en: "Transcription is inaccurate",
        ru: "Транскрипция неточная",
        forks: [
          { key: "accuracy.wrong-words", en: "Many wrong words, gibberish output", ru: "Много неверных слов, нечитаемый результат" },
          { key: "accuracy.accents", en: "Fails with accents or non-native speakers", ru: "Не справляется с акцентами или неносителями" },
          { key: "accuracy.technical", en: "Poor accuracy on technical / medical / legal terms", ru: "Плохая точность на технических / медицинских / юридических терминах" },
          { key: "accuracy.speakers", en: "Can't distinguish between speakers", ru: "Не различает говорящих" },
        ],
      },
      {
        key: "paywall",
        en: "Transcription or export paywalled",
        ru: "Транскрипция или экспорт за пейволлом",
        forks: [
          { key: "paywall.transcription", en: "Transcription requires subscription", ru: "Транскрипция только по подписке" },
          { key: "paywall.export", en: "Export to text / doc requires premium", ru: "Экспорт в текст / документ только в премиуме" },
          { key: "paywall.minutes", en: "Tight minute limit on free tier", ru: "Жёсткий лимит минут на бесплатном уровне" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "reliability",
        en: "App fails during recording",
        ru: "Приложение отказывает во время записи",
        forks: [
          { key: "reliability.stops-recording", en: "Recording stops unexpectedly", ru: "Запись неожиданно останавливается" },
          { key: "reliability.lost-audio", en: "Recorded audio / transcription lost after crash", ru: "Запись / транскрипция теряется после сбоя" },
          { key: "reliability.background", en: "Stops recording when phone screen locks", ru: "Останавливается при блокировке экрана" },
          { key: "reliability.crashes", en: "App crashes during long recordings", ru: "Вылетает при длинных записях" },
        ],
      },
      {
        key: "speed",
        en: "Transcription is too slow",
        ru: "Транскрипция слишком медленная",
        forks: [
          { key: "speed.upload-slow", en: "Slow to process uploaded audio", ru: "Медленно обрабатывает загруженное аудио" },
          { key: "speed.realtime-lag", en: "Real-time transcription lags significantly", ru: "Транскрипция в реальном времени сильно запаздывает" },
        ],
      },
      {
        key: "privacy",
        en: "Recordings uploaded without clear consent",
        ru: "Записи загружаются без явного согласия",
        forks: [],
      },
      {
        key: "broken-update",
        en: "Update broke recording or transcription",
        ru: "Обновление сломало запись или транскрипцию",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "ai-generators": {
    slug: "ai-generators",
    version: "ai-generators-1",
    en: "AI image & content generators",
    ru: "AI-генераторы изображений и контента",
    needs: [
      {
        key: "paywall",
        en: "Credits run out instantly / everything costs credits",
        ru: "Кредиты заканчиваются мгновенно / всё стоит кредиты",
        forks: [
          { key: "paywall.daily-limit", en: "Tiny daily free generation limit", ru: "Маленький дневной лимит бесплатных генераций" },
          { key: "paywall.quality", en: "Free quality is too degraded to be useful", ru: "Бесплатное качество слишком низкое для реального использования" },
          { key: "paywall.features", en: "Key features (inpainting, upscaling) paywalled", ru: "Ключевые функции (inpainting, upscaling) за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.credits-expire", en: "Purchased credits expire or disappear", ru: "Купленные кредиты истекают или пропадают" },
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "quality",
        en: "Output quality is bad",
        ru: "Качество результата плохое",
        forks: [
          { key: "quality.faces", en: "Faces / hands distorted or wrong", ru: "Лица / руки искажены или неправильные" },
          { key: "quality.prompt-ignore", en: "Ignores key parts of the prompt", ru: "Игнорирует ключевые части запроса" },
          { key: "quality.watermark", en: "Watermark on free output", ru: "Водяной знак на бесплатном результате" },
          { key: "quality.style-mismatch", en: "Style / aesthetic doesn't match what was promised", ru: "Стиль / эстетика не соответствуют обещанному" },
        ],
      },
      {
        key: "censorship",
        en: "Over-censorship blocks legitimate uses",
        ru: "Чрезмерная цензура блокирует законные применения",
        forks: [
          { key: "censorship.creative", en: "Blocks artistic / fictional content without reason", ru: "Блокирует художественный / фантастический контент без причины" },
          { key: "censorship.false-positive", en: "Safe prompts flagged as violating policy", ru: "Безопасные запросы помечаются как нарушение политики" },
        ],
      },
      {
        key: "reliability",
        en: "Generation fails or is too slow",
        ru: "Генерация не работает или слишком медленная",
        forks: [
          { key: "reliability.server-errors", en: "Server errors, generations fail silently", ru: "Ошибки сервера, генерации молча завершаются с ошибкой" },
          { key: "reliability.slow", en: "Takes too long to generate", ru: "Слишком долго генерирует" },
          { key: "reliability.crashes", en: "App crashes during generation", ru: "Приложение вылетает во время генерации" },
        ],
      },
      {
        key: "privacy",
        en: "IP and data rights concerns",
        ru: "Права на интеллектуальную собственность и данные",
        forks: [
          { key: "privacy.uses-uploads", en: "Uploaded images used to train without consent", ru: "Загружаемые изображения используются для обучения без согласия" },
          { key: "privacy.ownership", en: "Unclear who owns generated content", ru: "Неясно, кому принадлежит сгенерированный контент" },
        ],
      },
      {
        key: "broken-update",
        en: "Update degraded model quality",
        ru: "Обновление ухудшило качество модели",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "social-content": {
    slug: "social-content",
    version: "social-content-1",
    en: "Social content creation apps",
    ru: "Создание контента для соцсетей",
    needs: [
      {
        key: "paywall",
        en: "Templates and tools paywalled",
        ru: "Шаблоны и инструменты за пейволлом",
        forks: [
          { key: "paywall.templates", en: "Most templates / designs locked", ru: "Большинство шаблонов / дизайнов заблокировано" },
          { key: "paywall.export", en: "Export without watermark requires subscription", ru: "Экспорт без водяного знака — только по подписке" },
          { key: "paywall.brand-kit", en: "Brand fonts / colors / logo require premium", ru: "Брендовые шрифты / цвета / логотип — только в премиуме" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation hidden or broken", ru: "Отмена скрыта или не работает" },
          { key: "billing.accidental", en: "Accidental one-tap purchase, no refund", ru: "Случайная покупка в один клик, возврат отказан" },
        ],
      },
      {
        key: "watermark",
        en: "Watermark on exported content",
        ru: "Водяной знак на экспортируемом контенте",
        forks: [
          { key: "watermark.forced", en: "Watermark forced even on own content", ru: "Водяной знак принудительно даже на собственном контенте" },
          { key: "watermark.cant-remove", en: "No way to remove watermark without high-tier subscription", ru: "Убрать водяной знак можно только на дорогом уровне" },
        ],
      },
      {
        key: "quality",
        en: "Output quality and content issues",
        ru: "Качество и проблемы с контентом",
        forks: [
          { key: "quality.ai-bad", en: "AI text / image generation is poor quality", ru: "AI-текст / изображения низкого качества" },
          { key: "quality.export-resolution", en: "Export resolution lower than expected", ru: "Разрешение при экспорте ниже ожидаемого" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes and data loss",
        ru: "Вылеты и потеря работы",
        forks: [
          { key: "reliability.crashes", en: "Crashes mid-design, losing work", ru: "Вылетает в середине работы" },
          { key: "reliability.sync", en: "Designs don't sync across devices", ru: "Дизайны не синхронизируются между устройствами" },
        ],
      },
      {
        key: "scheduling",
        en: "Scheduled posting fails",
        ru: "Запланированный постинг не работает",
        forks: [
          { key: "scheduling.fails", en: "Posts don't go out at scheduled time", ru: "Посты не выходят в запланированное время" },
          { key: "scheduling.account-disconnect", en: "Social account keeps disconnecting", ru: "Аккаунт соцсети постоянно отключается" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke features or changed UI",
        ru: "Обновление сломало функции или изменило интерфейс",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "music": {
    slug: "music",
    version: "music-1",
    en: "Music apps",
    ru: "Музыкальные приложения",
    needs: [
      {
        key: "paywall",
        en: "Can't really listen without paying",
        ru: "Без оплаты слушать нельзя",
        forks: [
          { key: "paywall.shuffle-only", en: "Free tier only allows shuffle, no on-demand", ru: "Бесплатный уровень только перемешивание, без выбора" },
          { key: "paywall.offline", en: "Offline listening requires subscription", ru: "Прослушивание офлайн — только по подписке" },
          { key: "paywall.skips", en: "Limited skips on free tier", ru: "Ограниченное количество перемоток на бесплатном уровне" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.price-hike", en: "Subscription price raised without notice", ru: "Цена подписки поднята без уведомления" },
        ],
      },
      {
        key: "catalog",
        en: "Missing music or content removed",
        ru: "Нет нужной музыки или контент удалили",
        forks: [
          { key: "catalog.missing-artist", en: "Favorite artist / album not available", ru: "Любимый исполнитель / альбом недоступен" },
          { key: "catalog.removed", en: "Music disappeared from library / playlist", ru: "Музыка пропала из библиотеки / плейлиста" },
          { key: "catalog.regional", en: "Content restricted by region", ru: "Контент ограничен по региону" },
        ],
      },
      {
        key: "reliability",
        en: "Playback issues",
        ru: "Проблемы с воспроизведением",
        forks: [
          { key: "reliability.skips", en: "Audio skips or stutters during playback", ru: "Аудио прерывается или заикается" },
          { key: "reliability.stops", en: "Music stops randomly while playing", ru: "Музыка останавливается произвольно" },
          { key: "reliability.offline-broken", en: "Downloaded songs don't play offline", ru: "Скачанные песни не воспроизводятся офлайн" },
          { key: "reliability.crashes", en: "App crashes", ru: "Приложение вылетает" },
        ],
      },
      {
        key: "ads",
        en: "Disruptive ads between songs",
        ru: "Навязчивая реклама между песнями",
        forks: [
          { key: "ads.long", en: "Ads too long / can't skip", ru: "Реклама слишком длинная / нельзя пропустить" },
          { key: "ads.even-paid", en: "Ads appear even after paying", ru: "Реклама появляется даже после оплаты" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke playlists or library",
        ru: "Обновление сломало плейлисты или библиотеку",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "books-reading": {
    slug: "books-reading",
    version: "books-reading-1",
    en: "Books & reading apps",
    ru: "Книги и чтение",
    needs: [
      {
        key: "paywall",
        en: "Books paywalled or credits system",
        ru: "Книги за пейволлом или система кредитов",
        forks: [
          { key: "paywall.credits", en: "Credit system too expensive per book", ru: "Система кредитов слишком дорогая за книгу" },
          { key: "paywall.subscription", en: "Subscription required to read owned books", ru: "Нужна подписка чтобы читать купленные книги" },
          { key: "paywall.catalog", en: "Most wanted books not in subscription catalog", ru: "Большинство желаемых книг не входят в подписку" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.drm-lock", en: "Purchased books locked if subscription lapses", ru: "Купленные книги блокируются при истечении подписки" },
        ],
      },
      {
        key: "catalog",
        en: "Missing books or poor catalog",
        ru: "Нет нужных книг или скудный каталог",
        forks: [
          { key: "catalog.missing", en: "Book wanted is not available", ru: "Нужной книги нет" },
          { key: "catalog.removed", en: "Previously purchased book removed from library", ru: "Ранее купленная книга удалена из библиотеки" },
        ],
      },
      {
        key: "reliability",
        en: "Reading experience breaks",
        ru: "Чтение прерывается",
        forks: [
          { key: "reliability.crashes", en: "App crashes during reading", ru: "Вылетает во время чтения" },
          { key: "reliability.progress-lost", en: "Reading position / bookmarks lost", ru: "Место чтения / закладки теряются" },
          { key: "reliability.sync", en: "Progress doesn't sync across devices", ru: "Прогресс не синхронизируется между устройствами" },
          { key: "reliability.download", en: "Can't download for offline reading", ru: "Нельзя скачать для чтения офлайн" },
        ],
      },
      {
        key: "quality",
        en: "Formatting and reading experience",
        ru: "Форматирование и качество чтения",
        forks: [
          { key: "quality.formatting", en: "Poor formatting / broken layout", ru: "Плохое форматирование / сломанная вёрстка" },
          { key: "quality.font-options", en: "Can't customize font, size or background", ru: "Нельзя настроить шрифт, размер или фон" },
        ],
      },
      {
        key: "broken-update",
        en: "Update removed features or changed layout",
        ru: "Обновление убрало функции или изменило вёрстку",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "hobby-collections": {
    slug: "hobby-collections",
    version: "hobby-collections-1",
    en: "Hobby & collection tracking apps",
    ru: "Хобби и коллекции",
    needs: [
      {
        key: "paywall",
        en: "Collection size or features paywalled",
        ru: "Размер коллекции или функции за пейволлом",
        forks: [
          { key: "paywall.items", en: "Item limit on free tier", ru: "Лимит предметов на бесплатном уровне" },
          { key: "paywall.features", en: "Search, sorting or statistics locked", ru: "Поиск, сортировка или статистика заблокированы" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "data-accuracy",
        en: "Price / value data is wrong",
        ru: "Данные о ценах / стоимости неверны",
        forks: [
          { key: "data-accuracy.outdated", en: "Market prices are outdated", ru: "Рыночные цены устарели" },
          { key: "data-accuracy.wrong", en: "Values are just wrong for my items", ru: "Стоимость для моих предметов просто неверная" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes or loses collection data",
        ru: "Вылеты или потеря данных коллекции",
        forks: [
          { key: "reliability.crashes", en: "App crashes during scanning or entry", ru: "Вылетает при сканировании или вводе" },
          { key: "reliability.lost-data", en: "Collection data disappears after update", ru: "Данные коллекции пропадают после обновления" },
          { key: "reliability.sync", en: "Doesn't sync across devices", ru: "Не синхронизируется между устройствами" },
        ],
      },
      {
        key: "scanner",
        en: "Barcode / image scanner doesn't work",
        ru: "Сканер штрих-кода / изображения не работает",
        forks: [
          { key: "scanner.fails", en: "Scanner can't identify items", ru: "Сканер не опознаёт предметы" },
          { key: "scanner.wrong-item", en: "Identifies wrong item", ru: "Опознаёт не тот предмет" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke features or lost data",
        ru: "Обновление сломало функции или удалило данные",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "video-editors": {
    slug: "video-editors",
    version: "video-editors-1",
    en: "Video editing apps",
    ru: "Видеоредакторы",
    needs: [
      {
        key: "watermark",
        en: "Watermark on exported video",
        ru: "Водяной знак на экспортируемом видео",
        forks: [
          { key: "watermark.forced", en: "Watermark forced even on short clips", ru: "Водяной знак принудительно даже на коротких клипах" },
          { key: "watermark.cant-remove", en: "No affordable way to remove watermark", ru: "Нет доступного способа убрать водяной знак" },
        ],
      },
      {
        key: "paywall",
        en: "Core editing tools paywalled",
        ru: "Основные инструменты редактирования за пейволлом",
        forks: [
          { key: "paywall.effects", en: "Most effects / transitions locked", ru: "Большинство эффектов / переходов заблокировано" },
          { key: "paywall.export-quality", en: "HD or 4K export requires subscription", ru: "Экспорт в HD или 4K — только по подписке" },
          { key: "paywall.music", en: "Music / audio tracks paywalled", ru: "Музыка / аудиодорожки за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation hidden or broken", ru: "Отмена скрыта или не работает" },
          { key: "billing.accidental", en: "Accidental in-app purchase, no refund", ru: "Случайная покупка в приложении, возврат отказан" },
        ],
      },
      {
        key: "quality",
        en: "Export quality is poor",
        ru: "Низкое качество экспорта",
        forks: [
          { key: "quality.compression", en: "Over-compressed output, quality degraded", ru: "Чрезмерное сжатие, качество ухудшается" },
          { key: "quality.audio-sync", en: "Audio out of sync with video after export", ru: "Аудио выходит из синхронизации с видео после экспорта" },
          { key: "quality.ai-artifacts", en: "AI effects leave artifacts", ru: "AI-эффекты оставляют артефакты" },
        ],
      },
      {
        key: "reliability",
        en: "Crashes and lost work",
        ru: "Вылеты и потеря работы",
        forks: [
          { key: "reliability.crashes", en: "App crashes during editing or export", ru: "Вылетает во время редактирования или экспорта" },
          { key: "reliability.slow", en: "Extremely slow on average devices", ru: "Очень медленно работает на обычных устройствах" },
          { key: "reliability.lost-project", en: "Project lost after crash or update", ru: "Проект теряется после сбоя или обновления" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke features or removed tools",
        ru: "Обновление сломало функции или убрало инструменты",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "flashcards-study": {
    slug: "flashcards-study",
    version: "flashcards-study-1",
    en: "Flashcard & study apps",
    ru: "Флеш-карточки и учёба",
    needs: [
      {
        key: "paywall",
        en: "Study features paywalled",
        ru: "Функции учёбы за пейволлом",
        forks: [
          { key: "paywall.decks", en: "Deck limit on free tier", ru: "Лимит колод на бесплатном уровне" },
          { key: "paywall.spaced-repetition", en: "Spaced repetition / scheduling locked", ru: "Интервальное повторение / расписание заблокированы" },
          { key: "paywall.study-modes", en: "Test / match modes paywalled", ru: "Режимы теста / совпадений за пейволлом" },
          { key: "paywall.images-audio", en: "Images or audio in cards require premium", ru: "Изображения или аудио в карточках — только в премиуме" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "reliability",
        en: "App fails before exams",
        ru: "Приложение отказывает перед экзаменом",
        forks: [
          { key: "reliability.crashes", en: "App crashes during study session", ru: "Вылетает во время занятия" },
          { key: "reliability.sync", en: "Decks don't sync across devices", ru: "Колоды не синхронизируются между устройствами" },
          { key: "reliability.lost-data", en: "Decks or progress lost after update", ru: "Колоды или прогресс теряются после обновления" },
        ],
      },
      {
        key: "content-accuracy",
        en: "Wrong or low-quality shared decks",
        ru: "Неверные или некачественные общие колоды",
        forks: [
          { key: "content-accuracy.errors", en: "Shared decks contain errors", ru: "Общие колоды содержат ошибки" },
          { key: "content-accuracy.ai-slop", en: "AI-generated decks are inaccurate", ru: "AI-сгенерированные колоды неточные" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt studying",
        ru: "Реклама прерывает занятия",
        forks: [
          { key: "ads.between-cards", en: "Ad after every few cards", ru: "Реклама после каждых нескольких карточек" },
          { key: "ads.upsell", en: "Constant upsell nags", ru: "Постоянные upsell-предложения" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke decks or study modes",
        ru: "Обновление сломало колоды или режимы учёбы",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "parenting-family": {
    slug: "parenting-family",
    version: "parenting-family-1",
    en: "Parenting & family apps",
    ru: "Родительство и семья",
    needs: [
      {
        key: "paywall",
        en: "Core family features paywalled",
        ru: "Основные семейные функции за пейволлом",
        forks: [
          { key: "paywall.location", en: "Real-time location sharing requires subscription", ru: "Местоположение в реальном времени только по подписке" },
          { key: "paywall.history", en: "Location history locked behind premium", ru: "История местоположения — только в премиуме" },
          { key: "paywall.screen-time", en: "Screen time controls require subscription", ru: "Контроль экранного времени только по подписке" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.price-hike", en: "Subscription price raised significantly", ru: "Цена подписки резко поднята" },
        ],
      },
      {
        key: "reliability",
        en: "Location or alerts don't work",
        ru: "Местоположение или оповещения не работают",
        forks: [
          { key: "reliability.location-wrong", en: "Location shown is wrong or hours old", ru: "Показывает неверное или старое местоположение" },
          { key: "reliability.alerts-fail", en: "Arrival / departure alerts don't fire", ru: "Оповещения о прибытии / отправлении не срабатывают" },
          { key: "reliability.battery-drain", en: "Drains child's phone battery", ru: "Разряжает батарею телефона ребёнка" },
        ],
      },
      {
        key: "privacy",
        en: "Data and privacy concerns",
        ru: "Данные и конфиденциальность",
        forks: [
          { key: "privacy.data-kids", en: "Collects children's location data", ru: "Собирает данные о местоположении детей" },
          { key: "privacy.account-required", en: "Every family member must create account", ru: "Каждый член семьи должен создать аккаунт" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke location tracking or alerts",
        ru: "Обновление сломало трекинг или оповещения",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "online-courses": {
    slug: "online-courses",
    version: "online-courses-1",
    en: "Online learning platforms",
    ru: "Онлайн-курсы",
    needs: [
      {
        key: "paywall",
        en: "Content locked behind subscription",
        ru: "Контент за подпиской",
        forks: [
          { key: "paywall.certificate", en: "Certificate requires additional payment after course", ru: "Сертификат требует дополнительной оплаты после курса" },
          { key: "paywall.course-content", en: "Partial courses shown free, rest locked", ru: "Часть курса бесплатно, остальное заблокировано" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
          { key: "billing.price-hike", en: "Subscription price raised without notice", ru: "Цена подписки поднята без уведомления" },
          { key: "billing.course-disappears", en: "Paid course removed from platform", ru: "Оплаченный курс удалён с платформы" },
        ],
      },
      {
        key: "content-quality",
        en: "Courses are outdated or low quality",
        ru: "Курсы устаревшие или низкого качества",
        forks: [
          { key: "content-quality.outdated", en: "Course material is years out of date", ru: "Материал курса устарел на годы" },
          { key: "content-quality.instructor", en: "Instructor is hard to understand / low quality video", ru: "Инструктора трудно понять / видео низкого качества" },
          { key: "content-quality.ai-slop", en: "AI-generated course content is inaccurate", ru: "AI-сгенерированный контент курса неточный" },
        ],
      },
      {
        key: "reliability",
        en: "Video playback and app failures",
        ru: "Воспроизведение видео и сбои приложения",
        forks: [
          { key: "reliability.video", en: "Videos don't load or buffer constantly", ru: "Видео не загружается или постоянно буферизуется" },
          { key: "reliability.progress", en: "Course progress resets after update", ru: "Прогресс курса сбрасывается после обновления" },
          { key: "reliability.offline", en: "Downloaded lessons don't play offline", ru: "Скачанные уроки не воспроизводятся офлайн" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke courses or UI",
        ru: "Обновление сломало курсы или интерфейс",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "games": {
    slug: "games",
    version: "games-1",
    en: "Mobile games",
    ru: "Мобильные игры",
    needs: [
      {
        key: "monetization",
        en: "Pay-to-win and aggressive monetization",
        ru: "Pay-to-win и агрессивная монетизация",
        forks: [
          { key: "monetization.pay-to-win", en: "Paying gives huge unfair advantage", ru: "Оплата даёт огромное несправедливое преимущество" },
          { key: "monetization.energy", en: "Energy / lives gate progress constantly", ru: "Энергия / жизни постоянно блокируют прогресс" },
          { key: "monetization.loot-boxes", en: "Loot boxes / gacha with terrible odds", ru: "Лутбоксы / гача с ужасными шансами" },
          { key: "monetization.forced-purchase", en: "Can't progress without purchasing", ru: "Без покупки невозможно продвинуться" },
        ],
      },
      {
        key: "ads",
        en: "Ads every few minutes",
        ru: "Реклама каждые несколько минут",
        forks: [
          { key: "ads.forced", en: "Forced ads interrupt gameplay", ru: "Принудительная реклама прерывает игровой процесс" },
          { key: "ads.even-paid", en: "Ads shown even after purchasing ad-free", ru: "Реклама показывается даже после покупки режима без рекламы" },
          { key: "ads.unskippable", en: "30-second+ ads you can't skip", ru: "Реклама 30+ секунд без возможности пропустить" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.child-purchase", en: "Child accidentally makes in-app purchase", ru: "Ребёнок случайно совершил покупку" },
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Subscription cancellation broken", ru: "Отмена подписки не работает" },
        ],
      },
      {
        key: "reliability",
        en: "Game crashes or progress lost",
        ru: "Игра вылетает или прогресс теряется",
        forks: [
          { key: "reliability.crashes", en: "Game crashes frequently", ru: "Игра часто вылетает" },
          { key: "reliability.progress-lost", en: "Progress / items lost after update", ru: "Прогресс / предметы теряются после обновления" },
          { key: "reliability.server", en: "Server issues / can't log in", ru: "Проблемы с сервером / нельзя войти" },
        ],
      },
      {
        key: "difficulty",
        en: "Unfair difficulty curve",
        ru: "Несправедливая кривая сложности",
        forks: [
          { key: "difficulty.rigged", en: "Difficulty spikes to force purchases", ru: "Сложность резко растёт, чтобы вынудить к покупке" },
          { key: "difficulty.bots", en: "Matchmaking pits against bots pretending to be players", ru: "В матчмейкинге боты под видом игроков" },
        ],
      },
      {
        key: "broken-update",
        en: "Update broke the game",
        ru: "Обновление сломало игру",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores players",
        ru: "Поддержка игнорирует игроков",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "habit-trackers": {
    slug: "habit-trackers",
    version: "habit-trackers-1",
    en: "Habit tracking apps",
    ru: "Трекеры привычек",
    needs: [
      {
        key: "paywall",
        en: "Core tracking features paywalled",
        ru: "Основные функции трекинга за пейволлом",
        forks: [
          { key: "paywall.habit-count", en: "Habit count limited on free tier", ru: "Количество привычек ограничено на бесплатном уровне" },
          { key: "paywall.stats", en: "Statistics and streaks require subscription", ru: "Статистика и стрики — только по подписке" },
          { key: "paywall.reminders", en: "Reminders locked behind premium", ru: "Напоминания заблокированы в премиуме" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "reliability",
        en: "Streaks reset or data lost",
        ru: "Стрики сбрасываются или данные теряются",
        forks: [
          { key: "reliability.streak-reset", en: "Streak resets unfairly after app update / timezone change", ru: "Стрик сбрасывается несправедливо после обновления / смены часового пояса" },
          { key: "reliability.lost-data", en: "Habit history / progress disappears", ru: "История / прогресс привычек пропадают" },
          { key: "reliability.sync", en: "Doesn't sync across devices", ru: "Не синхронизируется между устройствами" },
          { key: "reliability.reminders", en: "Reminders don't fire on time", ru: "Напоминания не приходят вовремя" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt tracking",
        ru: "Реклама прерывает трекинг",
        forks: [],
      },
      {
        key: "broken-update",
        en: "Update reset streaks or broke the app",
        ru: "Обновление сбросило стрики или сломало приложение",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "wallpapers-custom": {
    slug: "wallpapers-custom",
    version: "wallpapers-custom-1",
    en: "Wallpaper & customization apps",
    ru: "Обои и кастомизация",
    needs: [
      {
        key: "paywall",
        en: "Almost all wallpapers paywalled",
        ru: "Почти все обои за пейволлом",
        forks: [
          { key: "paywall.most-content", en: "Majority of content locked", ru: "Большинство контента заблокировано" },
          { key: "paywall.live", en: "Live wallpapers require subscription", ru: "Живые обои только по подписке" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged immediately on trial", ru: "Списали сразу на пробном периоде" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "reliability",
        en: "Wallpaper app causes performance issues",
        ru: "Приложение обоев вызывает проблемы с производительностью",
        forks: [
          { key: "reliability.battery-drain", en: "Drains battery significantly", ru: "Значительно разряжает батарею" },
          { key: "reliability.crashes", en: "App or home screen launcher crashes", ru: "Приложение или лаунчер вылетают" },
          { key: "reliability.slow-phone", en: "Makes phone slower", ru: "Замедляет телефон" },
        ],
      },
      {
        key: "ads",
        en: "Excessive ads",
        ru: "Слишком много рекламы",
        forks: [
          { key: "ads.fullscreen", en: "Full-screen ads before seeing wallpapers", ru: "Полноэкранная реклама до просмотра обоев" },
          { key: "ads.upsell", en: "Constant subscription nags", ru: "Постоянные предложения подписаться" },
        ],
      },
      {
        key: "privacy",
        en: "Privacy violations",
        ru: "Нарушения приватности",
        forks: [
          { key: "privacy.excess-permissions", en: "Requests unnecessary permissions", ru: "Запрашивает лишние разрешения" },
        ],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "driving-exam": {
    slug: "driving-exam",
    version: "driving-exam-1",
    en: "Driving test prep apps",
    ru: "Подготовка к экзамену по вождению",
    needs: [
      {
        key: "paywall",
        en: "Test questions paywalled",
        ru: "Вопросы теста за пейволлом",
        forks: [
          { key: "paywall.questions", en: "Most practice questions locked", ru: "Большинство практических вопросов заблокировано" },
          { key: "paywall.mock-test", en: "Full mock tests require subscription", ru: "Полные пробные тесты только по подписке" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps",
        ru: "Биллинг-ловушки",
        forks: [
          { key: "billing.charged-trial", en: "Charged on trial without warning", ru: "Списали на пробном периоде без предупреждения" },
          { key: "billing.cant-cancel", en: "Cancellation broken or hidden", ru: "Отмена не работает или скрыта" },
        ],
      },
      {
        key: "content-accuracy",
        en: "Wrong questions or outdated material",
        ru: "Неверные вопросы или устаревший материал",
        forks: [
          { key: "content-accuracy.wrong-answers", en: "Marked correct answers as wrong or vice versa", ru: "Правильные ответы помечены как неверные или наоборот" },
          { key: "content-accuracy.outdated", en: "Questions don't match current official test", ru: "Вопросы не соответствуют текущему официальному тесту" },
          { key: "content-accuracy.state-mismatch", en: "Questions not specific to my state / country", ru: "Вопросы не относятся к моему региону / стране" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt test practice",
        ru: "Реклама прерывает тренировку",
        forks: [
          { key: "ads.between-questions", en: "Ad after every few questions", ru: "Реклама после каждых нескольких вопросов" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes during practice test",
        ru: "Приложение вылетает во время пробного теста",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "identifiers": {
    slug: "identifiers",
    version: "identifiers-1",
    en: "Plant & Nature Identifier Apps",
    ru: "Приложения для определения растений и природы",
    needs: [
      {
        key: "accuracy",
        en: "Wrong identification / misidentifies species",
        ru: "Неверное определение / путает виды",
        forks: [
          { key: "accuracy.wrong-plant", en: "Plant identified incorrectly", ru: "Растение определено неверно" },
          { key: "accuracy.confidence", en: "Low confidence results presented as certain", ru: "Низкая уверенность подаётся как факт" },
          { key: "accuracy.toxic", en: "Misidentified toxic/dangerous species as safe", ru: "Ядовитое растение определено как безопасное" },
        ],
      },
      {
        key: "paywall",
        en: "Paywall before basic identification works",
        ru: "Платный барьер до базового определения",
        forks: [
          { key: "paywall.scan-limit", en: "Free scans capped at very few per day", ru: "Бесплатные сканирования ограничены несколькими в день" },
          { key: "paywall.results-hidden", en: "Identification result hidden behind paywall", ru: "Результат определения скрыт за пейволлом" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps and unauthorized charges",
        ru: "Биллинг-ловушки и несанкционированные списания",
        forks: [
          { key: "billing.charged-trial", en: "Charged immediately on free trial", ru: "Списали сразу при оформлении пробного периода" },
          { key: "billing.cant-cancel", en: "Can't cancel subscription", ru: "Нет кнопки отмены / отменить — кошмар" },
          { key: "billing.charged-after-cancel", en: "Charged after cancellation", ru: "Списывают после отмены" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes or won't load",
        ru: "Вылетает или не загружается",
        forks: [
          { key: "reliability.crashes", en: "App crashes", ru: "Приложение вылетает" },
          { key: "reliability.camera", en: "Camera or scan function broken", ru: "Камера или сканирование не работают" },
        ],
      },
      {
        key: "ads",
        en: "Overwhelming ads",
        ru: "Реклама буквально везде",
        forks: [
          { key: "ads.fullscreen", en: "Full-screen unskippable ads", ru: "Полноэкранная реклама без возможности пропустить" },
        ],
      },
      {
        key: "data-quality",
        en: "Database incomplete or outdated",
        ru: "База данных неполная или устаревшая",
        forks: [],
      },
      {
        key: "privacy",
        en: "Privacy concerns — photos or data collection",
        ru: "Опасения конфиденциальности — сбор фото или данных",
        forks: [],
      },
      {
        key: "broken-update",
        en: "Update broke features that worked",
        ru: "Обновление сломало то, что работало",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores users",
        ru: "Поддержка игнорирует",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "passwords-storage": {
    slug: "passwords-storage",
    version: "passwords-storage-1",
    en: "Password Manager Apps",
    ru: "Приложения для хранения паролей",
    needs: [
      {
        key: "paywall",
        en: "Core features paywalled",
        ru: "Базовые функции за пейволлом",
        forks: [
          { key: "paywall.sync", en: "Sync across devices requires paid plan", ru: "Синхронизация между устройствами только за деньги" },
          { key: "paywall.autofill", en: "Autofill requires paid plan", ru: "Автозаполнение только за деньги" },
          { key: "paywall.import", en: "Import requires paid plan", ru: "Импорт только за деньги" },
        ],
      },
      {
        key: "billing",
        en: "Billing traps and unauthorized charges",
        ru: "Биллинг-ловушки и несанкционированные списания",
        forks: [
          { key: "billing.charged-trial", en: "Charged immediately on free trial", ru: "Списали сразу при оформлении пробного периода" },
          { key: "billing.cant-cancel", en: "Can't cancel subscription", ru: "Нет кнопки отмены / отменить — кошмар" },
          { key: "billing.charged-after-cancel", en: "Charged after cancellation", ru: "Списывают после отмены" },
          { key: "billing.price-hike", en: "Sudden price increase with no notice", ru: "Резкое повышение цены без предупреждения" },
        ],
      },
      {
        key: "security",
        en: "Security concerns / data breach",
        ru: "Опасения безопасности / утечка данных",
        forks: [
          { key: "security.breach", en: "Data breach or hack reported", ru: "Сообщение об утечке данных или взломе" },
          { key: "security.locked-out", en: "Account locked out / lost access to passwords", ru: "Заблокирован аккаунт / потерян доступ к паролям" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes, freezes or data lost",
        ru: "Вылетает, зависает или данные пропадают",
        forks: [
          { key: "reliability.crashes", en: "App crashes or won't open", ru: "Приложение вылетает или не открывается" },
          { key: "reliability.data-loss", en: "Passwords lost after update or sync", ru: "Пароли пропали после обновления или синхронизации" },
        ],
      },
      {
        key: "autofill",
        en: "Autofill doesn't work reliably",
        ru: "Автозаполнение работает ненадёжно",
        forks: [
          { key: "autofill.broken", en: "Autofill fails on most websites", ru: "Автозаполнение не работает на большинстве сайтов" },
          { key: "autofill.ios", en: "iOS autofill broken after update", ru: "Автозаполнение iOS сломано после обновления" },
        ],
      },
      {
        key: "sync",
        en: "Sync fails across devices",
        ru: "Синхронизация не работает между устройствами",
        forks: [],
      },
      {
        key: "broken-update",
        en: "Update broke what worked before",
        ru: "Обновление сломало то, что работало",
        forks: [],
      },
      {
        key: "support",
        en: "Support unresponsive",
        ru: "Поддержка не отвечает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "food-delivery": {
    slug: "food-delivery",
    version: "food-delivery-1",
    en: "Food Delivery Apps",
    ru: "Приложения доставки еды",
    needs: [
      {
        key: "delivery-speed",
        en: "Order arrives late or never",
        ru: "Заказ приходит поздно или не приходит совсем",
        forks: [
          { key: "delivery-speed.no-show", en: "Driver marked delivered but nothing arrived", ru: "Курьер отметил «доставлено», но ничего нет" },
          { key: "delivery-speed.extreme-delay", en: "Order delayed 1+ hours beyond estimate", ru: "Заказ опаздывает на час и больше" },
        ],
      },
      {
        key: "missing-items",
        en: "Wrong or missing items in order",
        ru: "В заказе не то или чего-то не хватает",
        forks: [
          { key: "missing-items.wrong-order", en: "Completely wrong order delivered", ru: "Привезли чужой заказ" },
          { key: "missing-items.partial", en: "Items missing from the bag", ru: "Часть позиций отсутствует в пакете" },
        ],
      },
      {
        key: "refund-support",
        en: "No refund for bad or missing orders",
        ru: "Не возвращают деньги за плохой или неполный заказ",
        forks: [
          { key: "refund-support.auto-denied", en: "Refund request automatically denied", ru: "Заявка на возврат автоматически отклонена" },
          { key: "refund-support.no-human", en: "Can't reach a human agent", ru: "Невозможно дозвониться до живого оператора" },
        ],
      },
      {
        key: "driver-issues",
        en: "Rude, late or unsafe drivers",
        ru: "Грубые, опаздывающие или опасные курьеры",
        forks: [],
      },
      {
        key: "billing",
        en: "Wrong charges or hidden fees",
        ru: "Списали не ту сумму или неожиданные комиссии",
        forks: [
          { key: "billing.double-charged", en: "Charged twice for the same order", ru: "Списали дважды за один заказ" },
          { key: "billing.hidden-fees", en: "Service fees revealed only at checkout", ru: "Сервисный сбор появляется только при оформлении" },
        ],
      },
      {
        key: "ads",
        en: "Push notification spam and upsell",
        ru: "Спам-уведомления и навязчивые предложения",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "fast-food-chains": {
    slug: "fast-food-chains",
    version: "fast-food-chains-1",
    en: "Fast Food Chain Apps",
    ru: "Приложения сетей быстрого питания",
    needs: [
      {
        key: "order-errors",
        en: "Wrong order placed through app",
        ru: "Через приложение оформился неправильный заказ",
        forks: [
          { key: "order-errors.cant-modify", en: "Can't edit or cancel after placing", ru: "Нельзя изменить или отменить после оформления" },
        ],
      },
      {
        key: "rewards-loyalty",
        en: "Broken points and coupons",
        ru: "Баллы и купоны не работают",
        forks: [
          { key: "rewards-loyalty.points-missing", en: "Points not credited after purchase", ru: "Баллы не начислились после покупки" },
          { key: "rewards-loyalty.coupon-invalid", en: "Coupon rejected at checkout", ru: "Купон отклоняется при оплате" },
        ],
      },
      {
        key: "app-crashes",
        en: "App doesn't open or crashes on launch",
        ru: "Приложение не открывается или вылетает при запуске",
        forks: [],
      },
      {
        key: "payment",
        en: "Payment fails at checkout",
        ru: "Оплата не проходит при оформлении",
        forks: [],
      },
      {
        key: "availability",
        en: "Items shown as available but unavailable in store",
        ru: "Товары показаны как доступные, но в ресторане их нет",
        forks: [],
      },
      {
        key: "kiosk-pickup",
        en: "Staff can't find mobile order at counter",
        ru: "Персонал не находит мобильный заказ на кассе",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "restaurant-discovery": {
    slug: "restaurant-discovery",
    version: "restaurant-discovery-1",
    en: "Restaurant Discovery & Review Apps",
    ru: "Приложения поиска ресторанов",
    needs: [
      {
        key: "fake-reviews",
        en: "Businesses gaming ratings with fake reviews",
        ru: "Рестораны накручивают рейтинг поддельными отзывами",
        forks: [
          { key: "fake-reviews.paid-removal", en: "Bad reviews removed after payment", ru: "Плохие отзывы удаляются после оплаты ресторану" },
        ],
      },
      {
        key: "paywall",
        en: "Useful results hidden behind paywall",
        ru: "Полезные результаты спрятаны за платным доступом",
        forks: [],
      },
      {
        key: "ads",
        en: "Too many ads obscuring results",
        ru: "Слишком много рекламы — результаты теряются",
        forks: [],
      },
      {
        key: "listing-accuracy",
        en: "Wrong hours, menus or addresses",
        ru: "Неверное время работы, меню или адрес",
        forks: [
          { key: "listing-accuracy.closed", en: "Restaurant shown as open but is closed", ru: "Заведение помечено открытым, но оно закрыто" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes or fails to load",
        ru: "Приложение вылетает или не загружается",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "job-search": {
    slug: "job-search",
    version: "job-search-1",
    en: "Job Search Apps",
    ru: "Приложения поиска работы",
    needs: [
      {
        key: "fake-jobs",
        en: "Scam or ghost job listings",
        ru: "Фиктивные вакансии и вакансии-призраки",
        forks: [
          { key: "fake-jobs.scam", en: "Listing is a phishing or payment scam", ru: "Вакансия — фишинг или вымогательство денег" },
          { key: "fake-jobs.already-filled", en: "Job listed but position already filled", ru: "Вакансия опубликована, но место уже занято" },
        ],
      },
      {
        key: "spam-outreach",
        en: "Irrelevant recruiter spam and no responses",
        ru: "Спам от рекрутеров и отсутствие ответов",
        forks: [
          { key: "spam-outreach.ghosted", en: "Applied but never heard back", ru: "Откликнулся, но ответа нет" },
        ],
      },
      {
        key: "paywall",
        en: "Visibility boost requires payment",
        ru: "Чтобы вакансии видели — нужно платить",
        forks: [],
      },
      {
        key: "data-privacy",
        en: "Personal data sold to recruiters",
        ru: "Личные данные продаются рекрутерам",
        forks: [],
      },
      {
        key: "reliability",
        en: "App broken or won't load listings",
        ru: "Приложение сломано или вакансии не загружаются",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "hr-workforce": {
    slug: "hr-workforce",
    version: "hr-workforce-1",
    en: "HR & Workforce Management Apps",
    ru: "Приложения HR и управления персоналом",
    needs: [
      {
        key: "clock-in-broken",
        en: "Can't punch in or out",
        ru: "Не удаётся отметить приход или уход",
        forks: [
          { key: "clock-in-broken.gps-fail", en: "GPS check-in fails at the workplace", ru: "GPS-отметка не срабатывает на рабочем месте" },
          { key: "clock-in-broken.no-load", en: "Clock screen won't load", ru: "Экран отметки не загружается" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes constantly",
        ru: "Приложение постоянно падает",
        forks: [
          { key: "reliability.crashes", en: "Crashes when opening or mid-action", ru: "Вылетает при открытии или в процессе работы" },
        ],
      },
      {
        key: "payroll-errors",
        en: "Wrong pay or hours recorded",
        ru: "Неверно записаны часы или начислена зарплата",
        forks: [],
      },
      {
        key: "support",
        en: "IT and vendor support ignores issues",
        ru: "IT и поддержка вендора игнорируют проблемы",
        forks: [],
      },
      {
        key: "performance",
        en: "Extremely slow, unusable on shift",
        ru: "Очень медленное, невозможно пользоваться в смену",
        forks: [],
      },
      {
        key: "billing",
        en: "Unexpected price hikes for employer plan",
        ru: "Неожиданные повышения цен на корпоративный тариф",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "accounting-software": {
    slug: "accounting-software",
    version: "accounting-software-1",
    en: "Small Business Accounting Apps",
    ru: "Бухгалтерские приложения для бизнеса",
    needs: [
      {
        key: "billing",
        en: "Surprise price hikes and forced upgrades",
        ru: "Неожиданные повышения цен и принудительные апгрейды",
        forks: [
          { key: "billing.price-hike", en: "Price raised without notice", ru: "Цена повышена без предупреждения" },
          { key: "billing.cant-cancel", en: "Hard to cancel subscription", ru: "Подписку трудно отменить" },
        ],
      },
      {
        key: "reliability",
        en: "Syncing fails and data is lost",
        ru: "Синхронизация ломается и данные теряются",
        forks: [
          { key: "reliability.crashes", en: "App crashes during data entry", ru: "Приложение падает при вводе данных" },
        ],
      },
      {
        key: "support",
        en: "Chatbots replaced real support",
        ru: "Живую поддержку заменили чат-боты",
        forks: [],
      },
      {
        key: "features-removed",
        en: "Features moved to a paid tier",
        ru: "Функции перенесены на платный тариф",
        forks: [],
      },
      {
        key: "data-sync",
        en: "Bank feeds break and require manual fix",
        ru: "Банковские фиды ломаются и требуют ручного исправления",
        forks: [],
      },
      {
        key: "subscription",
        en: "Basic features locked behind subscription",
        ru: "Базовые функции заперты за подпиской",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "video-conferencing": {
    slug: "video-conferencing",
    version: "video-conferencing-1",
    en: "Video Conferencing Apps",
    ru: "Приложения для видеоконференций",
    needs: [
      {
        key: "reliability",
        en: "Drops, freezes and disconnects",
        ru: "Обрывы, зависания и разрывы соединения",
        forks: [
          { key: "reliability.audio", en: "Audio drops out mid-call", ru: "Звук пропадает в середине звонка" },
          { key: "reliability.video", en: "Video freezes or turns black", ru: "Видео зависает или чернеет" },
          { key: "reliability.disconnects", en: "Kicked out of call without warning", ru: "Выбрасывает из звонка без предупреждения" },
        ],
      },
      {
        key: "billing",
        en: "Forced upgrade to continue a meeting",
        ru: "Принудительный апгрейд для продолжения встречи",
        forks: [
          { key: "billing.time-limit", en: "Meeting cut off at free tier time limit", ru: "Встреча обрывается по лимиту бесплатного тарифа" },
        ],
      },
      {
        key: "performance",
        en: "Lags on reasonable hardware",
        ru: "Тормозит на нормальном железе",
        forks: [],
      },
      {
        key: "support",
        en: "Support unresponsive for enterprise issues",
        ru: "Поддержка не отвечает на корпоративные проблемы",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "logistics-courier": {
    slug: "logistics-courier",
    version: "logistics-courier-1",
    en: "Shipping & Logistics Apps",
    ru: "Приложения логистики и доставки",
    needs: [
      {
        key: "tracking-accuracy",
        en: "Location stale or completely wrong",
        ru: "Местоположение устарело или полностью неверно",
        forks: [
          { key: "tracking-accuracy.stuck", en: "Tracking shows same status for days", ru: "Статус не меняется несколько дней" },
        ],
      },
      {
        key: "notifications",
        en: "No alerts when parcel is out for delivery",
        ru: "Нет уведомлений, когда посылка уже едет",
        forks: [],
      },
      {
        key: "reliability",
        en: "App doesn't load or crashes",
        ru: "Приложение не загружается или падает",
        forks: [],
      },
      {
        key: "delivery-issues",
        en: "Packages lost or damaged",
        ru: "Посылки теряются или приходят повреждёнными",
        forks: [],
      },
      {
        key: "billing",
        en: "Billing disputes with no resolution",
        ru: "Споры по счетам без решения",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "streaming-video": {
    slug: "streaming-video",
    version: "streaming-video-1",
    en: "Video Streaming Services",
    ru: "Видеостриминговые сервисы",
    needs: [
      {
        key: "billing",
        en: "Surprise charges and price hikes",
        ru: "Неожиданные списания и повышение цен",
        forks: [
          { key: "billing.price-hike", en: "Price raised without adequate notice", ru: "Цена повышена без нормального предупреждения" },
          { key: "billing.charged-after-cancel", en: "Charged after cancelling subscription", ru: "Списали деньги после отмены подписки" },
        ],
      },
      {
        key: "content-removed",
        en: "Shows and movies disappear without warning",
        ru: "Сериалы и фильмы исчезают без предупреждения",
        forks: [],
      },
      {
        key: "streaming-quality",
        en: "Constant buffering and low video quality",
        ru: "Постоянные буферизации и низкое качество видео",
        forks: [
          { key: "streaming-quality.buffering", en: "Buffers every few minutes", ru: "Буферизация каждые несколько минут" },
          { key: "streaming-quality.forced-low", en: "Forced to low resolution despite fast connection", ru: "Принудительно низкое разрешение при быстром интернете" },
        ],
      },
      {
        key: "offline-download",
        en: "Downloaded content disappears or won't play",
        ru: "Скачанный контент исчезает или не воспроизводится",
        forks: [],
      },
      {
        key: "ads",
        en: "Excessive or unskippable ads",
        ru: "Слишком много рекламы или её нельзя пропустить",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes or login fails",
        ru: "Приложение вылетает или не удаётся войти",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "short-drama-apps": {
    slug: "short-drama-apps",
    version: "short-drama-apps-1",
    en: "Short Drama & Reel Series Apps",
    ru: "Приложения коротких сериалов",
    needs: [
      {
        key: "paywall",
        en: "Pay per episode to continue watching",
        ru: "Каждый эпизод нужно оплачивать отдельно",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged immediately after starting trial",
        ru: "Деньги списываются сразу после начала пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial charge appeared before trial ended", ru: "Списание произошло до окончания пробного периода" },
        ],
      },
      {
        key: "content-quality",
        en: "Badly dubbed or low production quality",
        ru: "Плохая озвучка или низкое качество производства",
        forks: [],
      },
      {
        key: "cliffhanger-paywall",
        en: "Forced to pay mid-episode at cliffhanger",
        ru: "Приходится платить в середине эпизода на самом интересном месте",
        forks: [],
      },
      {
        key: "ads",
        en: "Ad interruptions between every scene",
        ru: "Реклама прерывает каждую сцену",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "live-streaming-apps": {
    slug: "live-streaming-apps",
    version: "live-streaming-apps-1",
    en: "Live Streaming Apps",
    ru: "Приложения прямых трансляций",
    needs: [
      {
        key: "moderation",
        en: "Harassment and NSFW content not moderated",
        ru: "Домогательства и неприемлемый контент не модерируются",
        forks: [],
      },
      {
        key: "account-banned",
        en: "Account wrongfully banned",
        ru: "Аккаунт заблокирован без причины",
        forks: [
          { key: "account-banned.no-reason", en: "Banned with no explanation given", ru: "Заблокировали без каких-либо объяснений" },
          { key: "account-banned.no-appeal", en: "No way to appeal the ban", ru: "Невозможно обжаловать блокировку" },
        ],
      },
      {
        key: "billing",
        en: "Gifts and coins feel like a scam",
        ru: "Подарки и монеты ощущаются как мошенничество",
        forks: [],
      },
      {
        key: "fake-profiles",
        en: "Bots flood chats and streams",
        ru: "Боты заполняют чаты и трансляции",
        forks: [],
      },
      {
        key: "ads",
        en: "Too many ads interrupting streams",
        ru: "Слишком много рекламы, прерывающей трансляции",
        forks: [],
      },
      {
        key: "reliability",
        en: "Stream drops or app crashes",
        ru: "Трансляция прерывается или приложение падает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "ticketing-events": {
    slug: "ticketing-events",
    version: "ticketing-events-1",
    en: "Event Ticketing Apps",
    ru: "Приложения продажи билетов на события",
    needs: [
      {
        key: "hidden-fees",
        en: "Service fees revealed only at final checkout",
        ru: "Сервисный сбор появляется только на последнем шаге оплаты",
        forks: [],
      },
      {
        key: "ticket-delivery",
        en: "Tickets don't arrive or can't be found",
        ru: "Билеты не приходят или их не удаётся найти",
        forks: [],
      },
      {
        key: "payment-fails",
        en: "Payment repeatedly fails during checkout",
        ru: "Оплата раз за разом не проходит",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged twice or refund refused",
        ru: "Списали дважды или отказали в возврате",
        forks: [
          { key: "billing.double-charge", en: "Charged twice for same tickets", ru: "За одни билеты списали дважды" },
          { key: "billing.no-refund", en: "Refund refused for cancelled event", ru: "Отказали в возврате за отменённое мероприятие" },
        ],
      },
      {
        key: "reliability",
        en: "App crashes during high-demand checkout",
        ru: "Приложение падает при ажиотажной продаже",
        forks: [],
      },
      {
        key: "scalpers-bots",
        en: "Tickets sold out to bots instantly",
        ru: "Билеты моментально скупают боты",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "messaging-apps": {
    slug: "messaging-apps",
    version: "messaging-apps-1",
    en: "Messaging & Chat Apps",
    ru: "Приложения для мессенджеров",
    needs: [
      {
        key: "reliability",
        en: "Messages not delivered",
        ru: "Сообщения не доставляются",
        forks: [
          { key: "reliability.messages-lost", en: "Messages disappear or never arrive", ru: "Сообщения пропадают или вообще не доходят" },
          { key: "reliability.notifications", en: "Notifications don't fire", ru: "Уведомления не приходят" },
        ],
      },
      {
        key: "spam",
        en: "Spam and phishing messages",
        ru: "Спам и фишинговые сообщения",
        forks: [],
      },
      {
        key: "privacy",
        en: "Data surveillance and metadata collection",
        ru: "Слежка и сбор метаданных",
        forks: [],
      },
      {
        key: "features-removed",
        en: "Features locked or removed",
        ru: "Функции заблокированы или удалены",
        forks: [],
      },
      {
        key: "billing",
        en: "Paid features feel useless",
        ru: "Платные функции не оправдывают цены",
        forks: [],
      },
      {
        key: "account-banned",
        en: "Account banned without reason",
        ru: "Аккаунт заблокирован без объяснений",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "dating-apps": {
    slug: "dating-apps",
    version: "dating-apps-1",
    en: "Dating Apps",
    ru: "Приложения знакомств",
    needs: [
      {
        key: "paywall",
        en: "Must pay to see who liked you",
        ru: "Чтобы увидеть, кто поставил лайк — нужно платить",
        forks: [],
      },
      {
        key: "fake-profiles",
        en: "Bots and catfish profiles",
        ru: "Боты и поддельные анкеты",
        forks: [
          { key: "fake-profiles.bots", en: "Bots send scripted messages", ru: "Боты шлют шаблонные сообщения" },
          { key: "fake-profiles.scam", en: "Profile leads to external scam site", ru: "Анкета ведёт на сторонний мошеннический сайт" },
        ],
      },
      {
        key: "billing",
        en: "Charged immediately on free trial",
        ru: "Деньги списывают сразу с пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial auto-converts to paid without clear warning", ru: "Пробный период автоматически превращается в платный без предупреждения" },
        ],
      },
      {
        key: "moderation",
        en: "Harassment not removed",
        ru: "На домогательства не реагируют",
        forks: [],
      },
      {
        key: "matches-quality",
        en: "Algorithm shows poor or irrelevant matches",
        ru: "Алгоритм подбирает неподходящих людей",
        forks: [],
      },
      {
        key: "account-banned",
        en: "Account banned with no explanation",
        ru: "Аккаунт заблокирован без объяснений",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "social-networks": {
    slug: "social-networks",
    version: "social-networks-1",
    en: "Social Network Apps",
    ru: "Приложения социальных сетей",
    needs: [
      {
        key: "moderation",
        en: "Inconsistent bans and content removal",
        ru: "Непоследовательная блокировка и удаление контента",
        forks: [
          { key: "moderation.wrong-ban", en: "Legitimate posts removed, harmful ones stay", ru: "Нормальные посты удаляют, а вредоносные оставляют" },
        ],
      },
      {
        key: "algorithm",
        en: "Feed shows irrelevant content instead of followed accounts",
        ru: "Лента показывает нерелевантный контент вместо подписок",
        forks: [],
      },
      {
        key: "reliability",
        en: "Crashes and outages",
        ru: "Сбои и падения сервиса",
        forks: [],
      },
      {
        key: "privacy",
        en: "Excessive data collection and sharing",
        ru: "Чрезмерный сбор и передача данных",
        forks: [],
      },
      {
        key: "features-removed",
        en: "Popular features removed or paywalled",
        ru: "Популярные функции удалили или перенесли за paywall",
        forks: [],
      },
      {
        key: "ads",
        en: "Excessive ads drowning organic content",
        ru: "Слишком много рекламы — она вытесняет живой контент",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "rideshare-taxi": {
    slug: "rideshare-taxi",
    version: "rideshare-taxi-1",
    en: "Rideshare & Taxi Apps",
    ru: "Приложения такси и совместных поездок",
    needs: [
      {
        key: "surge-pricing",
        en: "Excessive surge pricing during peak times",
        ru: "Запредельная динамическая цена в часы пик",
        forks: [],
      },
      {
        key: "driver-issues",
        en: "Bad drivers, no-shows and wrong routes",
        ru: "Плохие водители, не приезжают и едут не туда",
        forks: [
          { key: "driver-issues.no-show", en: "Driver accepts ride then cancels repeatedly", ru: "Водитель принимает заказ и многократно отменяет" },
        ],
      },
      {
        key: "billing",
        en: "Charged wrong amount after ride",
        ru: "После поездки списали не ту сумму",
        forks: [
          { key: "billing.extra-charges", en: "Extra unexplained charges added after trip", ru: "После поездки добавлены необъяснённые списания" },
        ],
      },
      {
        key: "support",
        en: "Billing disputes ignored",
        ru: "Споры по оплате игнорируются",
        forks: [],
      },
      {
        key: "safety",
        en: "Safety concerns with drivers",
        ru: "Проблемы с безопасностью при поездках",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes when booking",
        ru: "Приложение падает при оформлении заказа",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "vpn-apps": {
    slug: "vpn-apps",
    version: "vpn-apps-1",
    en: "VPN Apps",
    ru: "VPN-приложения",
    needs: [
      {
        key: "connection-speed",
        en: "Severely reduces internet speed",
        ru: "Сильно снижает скорость интернета",
        forks: [],
      },
      {
        key: "reliability",
        en: "Drops connection without warning",
        ru: "Соединение обрывается без предупреждения",
        forks: [
          { key: "reliability.disconnects", en: "VPN disconnects every few minutes", ru: "VPN отключается каждые несколько минут" },
        ],
      },
      {
        key: "billing",
        en: "Hard to cancel, auto-renews",
        ru: "Трудно отменить, автоматически продлевается",
        forks: [
          { key: "billing.cant-cancel", en: "Cancellation buried in settings", ru: "Отмена спрятана в глубине настроек" },
        ],
      },
      {
        key: "privacy",
        en: "Logs user data despite no-log claims",
        ru: "Ведёт логи, несмотря на заявления об обратном",
        forks: [],
      },
      {
        key: "support",
        en: "Support doesn't resolve connection issues",
        ru: "Поддержка не помогает с проблемами соединения",
        forks: [],
      },
      {
        key: "compatibility",
        en: "Doesn't work on certain networks or routers",
        ru: "Не работает в некоторых сетях или за роутерами",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "tv-remote-cast": {
    slug: "tv-remote-cast",
    version: "tv-remote-cast-1",
    en: "TV Remote Control Apps",
    ru: "Приложения пульта дистанционного управления",
    needs: [
      {
        key: "device-compatibility",
        en: "Doesn't detect the TV on the network",
        ru: "Не находит телевизор в сети",
        forks: [],
      },
      {
        key: "reliability",
        en: "Buttons stop responding",
        ru: "Кнопки перестают реагировать",
        forks: [],
      },
      {
        key: "setup-issues",
        en: "Can't pair with TV despite same WiFi",
        ru: "Не удаётся подключиться к ТВ даже в одной Wi-Fi сети",
        forks: [],
      },
      {
        key: "ads",
        en: "Constant ads in a utility app",
        ru: "Постоянная реклама в утилитарном приложении",
        forks: [],
      },
      {
        key: "billing",
        en: "Basic remote functions behind paywall",
        ru: "Базовые функции пульта заперты за paywall",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "telecom-carrier": {
    slug: "telecom-carrier",
    version: "telecom-carrier-1",
    en: "Mobile Carrier & ISP Apps",
    ru: "Приложения мобильных операторов",
    needs: [
      {
        key: "billing-errors",
        en: "Wrong charges appearing on bill",
        ru: "В счёте появляются ошибочные начисления",
        forks: [
          { key: "billing-errors.mystery-charge", en: "Unrecognized charge with no explanation", ru: "Непонятное списание без объяснений" },
        ],
      },
      {
        key: "support",
        en: "Can't reach a human agent",
        ru: "Невозможно дозвониться до живого оператора",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes constantly",
        ru: "Приложение постоянно вылетает",
        forks: [],
      },
      {
        key: "outage-alerts",
        en: "No notice of network outages",
        ru: "Нет уведомлений об авариях в сети",
        forks: [],
      },
      {
        key: "data-tracking",
        en: "Data usage shown is inaccurate",
        ru: "Показания расхода трафика неточные",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "security-antivirus": {
    slug: "security-antivirus",
    version: "security-antivirus-1",
    en: "Security & Antivirus Apps",
    ru: "Приложения безопасности и антивируса",
    needs: [
      {
        key: "billing",
        en: "Auto-renew traps and hard cancellation",
        ru: "Ловушки автопродления и сложная отмена",
        forks: [
          { key: "billing.auto-renew", en: "Auto-renewed at higher price without warning", ru: "Автоматически продлили по более высокой цене без предупреждения" },
        ],
      },
      {
        key: "false-positives",
        en: "Blocks legitimate apps and files",
        ru: "Блокирует нормальные приложения и файлы",
        forks: [],
      },
      {
        key: "reliability",
        en: "Crashes or fails to run scans",
        ru: "Вылетает или не запускает проверку",
        forks: [],
      },
      {
        key: "performance",
        en: "Significantly slows down phone",
        ru: "Заметно тормозит телефон",
        forks: [],
      },
      {
        key: "support",
        en: "No help resolving false positives",
        ru: "Нет помощи с ложными срабатываниями",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "smart-home-iot": {
    slug: "smart-home-iot",
    version: "smart-home-iot-1",
    en: "Smart Home & IoT Apps",
    ru: "Приложения умного дома",
    needs: [
      {
        key: "device-offline",
        en: "Devices randomly go offline",
        ru: "Устройства периодически уходят оффлайн",
        forks: [
          { key: "device-offline.after-update", en: "Devices offline after app update", ru: "Устройства пропадают после обновления приложения" },
        ],
      },
      {
        key: "reliability",
        en: "App disconnects from devices",
        ru: "Приложение теряет связь с устройствами",
        forks: [],
      },
      {
        key: "billing",
        en: "Key features moved to subscription",
        ru: "Ключевые функции перенесены на подписку",
        forks: [],
      },
      {
        key: "setup-issues",
        en: "Hard to set up and pair devices",
        ru: "Сложно настроить и подключить устройства",
        forks: [],
      },
      {
        key: "privacy",
        en: "Extensive data collection concerns",
        ru: "Опасения по поводу чрезмерного сбора данных",
        forks: [],
      },
      {
        key: "geofencing",
        en: "Location-based automation broken",
        ru: "Автоматизация по геолокации не работает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "fitness-wearables": {
    slug: "fitness-wearables",
    version: "fitness-wearables-1",
    en: "Fitness Tracker & Wearable Apps",
    ru: "Приложения фитнес-трекеров и носимых устройств",
    needs: [
      {
        key: "data-accuracy",
        en: "Heart rate and step counts are wrong",
        ru: "Пульс и количество шагов определяются неверно",
        forks: [
          { key: "data-accuracy.heart-rate", en: "Heart rate readings wildly inaccurate", ru: "Показания пульса сильно расходятся с реальностью" },
          { key: "data-accuracy.steps", en: "Step count double-counts or misses steps", ru: "Счётчик шагов дублирует или пропускает шаги" },
        ],
      },
      {
        key: "sync-issues",
        en: "Data doesn't sync with wearable device",
        ru: "Данные не синхронизируются с носимым устройством",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription required for basic statistics",
        ru: "Базовая статистика доступна только по подписке",
        forks: [],
      },
      {
        key: "reliability",
        en: "Disconnects from device frequently",
        ru: "Часто теряет связь с устройством",
        forks: [],
      },
      {
        key: "privacy",
        en: "Health data shared with third parties",
        ru: "Данные о здоровье передаются третьим лицам",
        forks: [],
      },
      {
        key: "battery-drain",
        en: "App drains phone battery excessively",
        ru: "Приложение слишком быстро разряжает телефон",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "gym-fitness-apps": {
    slug: "gym-fitness-apps",
    version: "gym-fitness-apps-1",
    en: "Gym & Fitness Streaming Apps",
    ru: "Приложения спортзалов и тренировок",
    needs: [
      {
        key: "billing",
        en: "Hard to cancel subscription",
        ru: "Подписку сложно отменить",
        forks: [
          { key: "billing.cant-cancel", en: "Cancel option buried or non-functional", ru: "Кнопка отмены спрятана или не работает" },
        ],
      },
      {
        key: "content-access",
        en: "Classes unavailable or removed mid-subscription",
        ru: "Занятия недоступны или удаляются в период подписки",
        forks: [],
      },
      {
        key: "reliability",
        en: "Streams buffer during workout",
        ru: "Трансляция буферизуется во время тренировки",
        forks: [],
      },
      {
        key: "device-compatibility",
        en: "Doesn't work on TV or Chromecast",
        ru: "Не работает на телевизоре или Chromecast",
        forks: [],
      },
      {
        key: "cancellation",
        en: "Cancellation process deliberately hidden",
        ru: "Процесс отмены намеренно скрыт",
        forks: [],
      },
      {
        key: "support",
        en: "Support unresponsive for billing issues",
        ru: "Поддержка не отвечает на вопросы по оплате",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "heart-blood-health": {
    slug: "heart-blood-health",
    version: "heart-blood-health-1",
    en: "Heart & Blood Pressure Monitor Apps",
    ru: "Приложения мониторинга сердца и давления",
    needs: [
      {
        key: "accuracy",
        en: "Readings differ from medical equipment",
        ru: "Показания расходятся с медицинскими приборами",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads shown before every health reading",
        ru: "Реклама показывается перед каждым измерением",
        forks: [],
      },
      {
        key: "billing",
        en: "Historical data locked behind paywall",
        ru: "История измерений заперта за paywall",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes mid-measurement",
        ru: "Приложение падает во время измерения",
        forks: [],
      },
      {
        key: "data-privacy",
        en: "Sensitive health data sold to third parties",
        ru: "Чувствительные данные о здоровье продаются третьим лицам",
        forks: [],
      },
      {
        key: "sync",
        en: "Won't connect or sync with monitor device",
        ru: "Не подключается и не синхронизируется с монитором",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "outdoor-trail-apps": {
    slug: "outdoor-trail-apps",
    version: "outdoor-trail-apps-1",
    en: "Outdoor & Trail GPS Apps",
    ru: "Приложения для активного отдыха и треккинга",
    needs: [
      {
        key: "paywall",
        en: "Offline maps locked behind subscription",
        ru: "Офлайн-карты доступны только по подписке",
        forks: [],
      },
      {
        key: "offline-accuracy",
        en: "GPS position wrong without cell signal",
        ru: "GPS показывает неверное положение без сотовой связи",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription auto-renews at higher price",
        ru: "Подписка автоматически продлевается по более высокой цене",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes on the trail",
        ru: "Приложение падает прямо во время похода",
        forks: [
          { key: "reliability.crashes", en: "Crashes when starting navigation offline", ru: "Падает при запуске навигации без сети" },
        ],
      },
      {
        key: "outdated-trails",
        en: "Trail data wrong or missing",
        ru: "Данные о маршрутах устарели или отсутствуют",
        forks: [],
      },
      {
        key: "battery-drain",
        en: "GPS tracking drains battery too fast",
        ru: "GPS-трекинг слишком быстро разряжает батарею",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "health-insurance-apps": {
    slug: "health-insurance-apps",
    version: "health-insurance-apps-1",
    en: "Health Insurance & GP Apps",
    ru: "Приложения медицинского страхования",
    needs: [
      {
        key: "access-broken",
        en: "Can't book appointment or view results",
        ru: "Не удаётся записаться на приём или посмотреть результаты",
        forks: [
          { key: "access-broken.no-slots", en: "No available appointments shown despite availability", ru: "Нет доступных слотов, хотя они есть" },
        ],
      },
      {
        key: "billing-errors",
        en: "Wrong coverage or benefit information shown",
        ru: "Показана неверная информация о покрытии или льготах",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes frequently",
        ru: "Приложение часто падает",
        forks: [
          { key: "reliability.crashes", en: "Crashes when accessing medical records", ru: "Падает при попытке открыть медицинские записи" },
        ],
      },
      {
        key: "support",
        en: "No response from insurer through app",
        ru: "Страховщик не отвечает через приложение",
        forks: [],
      },
      {
        key: "privacy",
        en: "Data breaches and security concerns",
        ru: "Утечки данных и проблемы с безопасностью",
        forks: [],
      },
      {
        key: "features",
        en: "Key features missing or non-functional",
        ru: "Ключевые функции отсутствуют или не работают",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "payment-transfer-apps": {
    slug: "payment-transfer-apps",
    version: "payment-transfer-apps-1",
    en: "Payment & Money Transfer Apps",
    ru: "Приложения для платежей и денежных переводов",
    needs: [
      {
        key: "account-frozen",
        en: "Account frozen without warning",
        ru: "Счёт заморожен без предупреждения",
        forks: [
          { key: "account-frozen.no-explanation", en: "Frozen with no reason given", ru: "Заморожен без каких-либо объяснений" },
        ],
      },
      {
        key: "transfer-delays",
        en: "Money stuck in limbo for days",
        ru: "Деньги зависают в обработке на несколько дней",
        forks: [],
      },
      {
        key: "billing",
        en: "Hidden transaction and conversion fees",
        ru: "Скрытые комиссии за транзакции и конвертацию",
        forks: [],
      },
      {
        key: "support",
        en: "Disputes ignored or never resolved",
        ru: "Споры игнорируются или так и не решаются",
        forks: [],
      },
      {
        key: "security",
        en: "Unauthorized transactions not reversed",
        ru: "Несанкционированные транзакции не отменяются",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "mobile-banking": {
    slug: "mobile-banking",
    version: "mobile-banking-1",
    en: "Mobile Banking Apps",
    ru: "Мобильные банковские приложения",
    needs: [
      {
        key: "account-locked",
        en: "Locked out of account without warning",
        ru: "Аккаунт заблокирован без предупреждения",
        forks: [],
      },
      {
        key: "reliability",
        en: "App won't load or is down frequently",
        ru: "Приложение не загружается или часто недоступно",
        forks: [],
      },
      {
        key: "biometric-login",
        en: "Face ID or fingerprint login broken",
        ru: "Вход по Face ID или отпечатку пальца не работает",
        forks: [],
      },
      {
        key: "support",
        en: "Can't reach bank through app",
        ru: "Через приложение не удаётся связаться с банком",
        forks: [],
      },
      {
        key: "billing-errors",
        en: "Wrong or duplicate transactions shown",
        ru: "Отображаются ошибочные или задвоенные транзакции",
        forks: [],
      },
      {
        key: "notification-spam",
        en: "Marketing notifications can't be turned off",
        ru: "Маркетинговые уведомления нельзя отключить",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "rewards-cashback": {
    slug: "rewards-cashback",
    version: "rewards-cashback-1",
    en: "Rewards & Cashback Apps",
    ru: "Приложения кэшбэка и вознаграждений",
    needs: [
      {
        key: "payout-denied",
        en: "Won't pay out earned rewards",
        ru: "Не выплачивают заработанные вознаграждения",
        forks: [
          { key: "payout-denied.threshold-raised", en: "Payout threshold raised after earnings", ru: "Порог выплаты повышают уже после накопления" },
        ],
      },
      {
        key: "fake-offers",
        en: "Offers impossible to complete",
        ru: "Задания невозможно выполнить",
        forks: [],
      },
      {
        key: "account-banned",
        en: "Account banned just before payout",
        ru: "Аккаунт блокируют прямо перед выплатой",
        forks: [],
      },
      {
        key: "support",
        en: "Support ignores earning disputes",
        ru: "Поддержка игнорирует споры о начислениях",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged for premium membership to earn",
        ru: "Нужно платить за премиум, чтобы зарабатывать",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "budget-tracking-apps": {
    slug: "budget-tracking-apps",
    version: "budget-tracking-apps-1",
    en: "Budget & Finance Tracker Apps",
    ru: "Приложения бюджетирования и учёта финансов",
    needs: [
      {
        key: "billing",
        en: "Subscription too expensive for core features",
        ru: "Подписка слишком дорогая за базовые функции",
        forks: [],
      },
      {
        key: "sync-issues",
        en: "Bank connections break and require re-linking",
        ru: "Связь с банком прерывается и нужно заново подключать",
        forks: [],
      },
      {
        key: "reliability",
        en: "Data disappears after update",
        ru: "Данные пропадают после обновления",
        forks: [],
      },
      {
        key: "data-accuracy",
        en: "Transactions miscategorized automatically",
        ru: "Транзакции автоматически попадают не в те категории",
        forks: [],
      },
      {
        key: "privacy",
        en: "Bank credentials exposed or shared",
        ru: "Банковские данные попадают к третьим лицам",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "investment-trading": {
    slug: "investment-trading",
    version: "investment-trading-1",
    en: "Investment & Trading Apps",
    ru: "Приложения для инвестиций и трейдинга",
    needs: [
      {
        key: "billing",
        en: "Hidden fees and commissions",
        ru: "Скрытые комиссии",
        forks: [
          { key: "billing.hidden-fees", en: "Fees not disclosed until after trade", ru: "Комиссии раскрываются только после сделки" },
        ],
      },
      {
        key: "reliability",
        en: "App freezes during active trading",
        ru: "Приложение зависает во время активной торговли",
        forks: [],
      },
      {
        key: "data-accuracy",
        en: "Prices and charts show wrong data",
        ru: "Цены и графики показывают неверные данные",
        forks: [],
      },
      {
        key: "regulatory",
        en: "Identity verification blocks account access",
        ru: "Верификация личности блокирует доступ к счёту",
        forks: [],
      },
      {
        key: "support",
        en: "Disputes with trades ignored",
        ru: "Споры по сделкам игнорируются",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "travel-booking": {
    slug: "travel-booking",
    version: "travel-booking-1",
    en: "Travel Booking Platforms",
    ru: "Платформы бронирования путешествий",
    needs: [
      {
        key: "listing-accuracy",
        en: "Property not as described or shown",
        ru: "Жильё не соответствует описанию или фото",
        forks: [],
      },
      {
        key: "cancellation",
        en: "Refund refused despite cancellation policy",
        ru: "Отказывают в возврате вопреки политике отмены",
        forks: [],
      },
      {
        key: "billing",
        en: "Fees added at final checkout",
        ru: "Дополнительные сборы появляются на последнем шаге",
        forks: [
          { key: "billing.hidden-fees", en: "Resort or cleaning fees added at last step", ru: "Курортный сбор или уборка добавляются в последний момент" },
        ],
      },
      {
        key: "support",
        en: "Disputes with hosts ignored",
        ru: "Споры с хозяевами игнорируются",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during booking",
        ru: "Приложение падает при оформлении",
        forks: [],
      },
      {
        key: "payment-fails",
        en: "Payment fails repeatedly",
        ru: "Оплата раз за разом не проходит",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "airline-apps": {
    slug: "airline-apps",
    version: "airline-apps-1",
    en: "Airline Apps",
    ru: "Приложения авиакомпаний",
    needs: [
      {
        key: "boarding-pass",
        en: "Can't retrieve or display boarding pass",
        ru: "Не удаётся получить или показать посадочный талон",
        forks: [],
      },
      {
        key: "booking-errors",
        en: "Seats wrong or double-charged",
        ru: "Места оказались не теми или списали дважды",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during check-in",
        ru: "Приложение падает во время регистрации",
        forks: [],
      },
      {
        key: "customer-service",
        en: "Support unresponsive for flight issues",
        ru: "Поддержка не реагирует на проблемы с рейсом",
        forks: [],
      },
      {
        key: "notifications",
        en: "No gate change or delay alerts",
        ru: "Нет уведомлений о смене ворот или задержке",
        forks: [],
      },
      {
        key: "loyalty-points",
        en: "Miles and points not credited",
        ru: "Мили и бонусы не начисляются",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "camping-travel": {
    slug: "camping-travel",
    version: "camping-travel-1",
    en: "Camping & Outdoor Travel Apps",
    ru: "Приложения кемпинга и путешествий",
    needs: [
      {
        key: "paywall",
        en: "Maps and campsite listings behind paywall",
        ru: "Карты и списки кемпингов за платным доступом",
        forks: [],
      },
      {
        key: "offline-access",
        en: "No offline mode for remote areas",
        ru: "Нет офлайн-режима для удалённых мест",
        forks: [],
      },
      {
        key: "listing-accuracy",
        en: "Sites shown as available but full",
        ru: "Места показаны как свободные, но уже заняты",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription auto-renews unexpectedly",
        ru: "Подписка автоматически продлевается без предупреждения",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes in remote areas",
        ru: "Приложение падает в удалённых местах",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "ai-face-photo": {
    slug: "ai-face-photo",
    version: "ai-face-photo-1",
    en: "AI Face & Photo Enhancement Apps",
    ru: "ИИ-приложения для обработки лица и фото",
    needs: [
      {
        key: "paywall",
        en: "Results locked behind paywall after processing",
        ru: "Результат доступен только после оплаты",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged immediately after trial start",
        ru: "Деньги списывают сразу после начала пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial converts to paid without clear warning", ru: "Пробный период незаметно переходит в платный" },
        ],
      },
      {
        key: "results-quality",
        en: "Output looks fake or obviously edited",
        ru: "Результат выглядит неестественно или явно обработанным",
        forks: [],
      },
      {
        key: "privacy",
        en: "Face data uploaded and retained",
        ru: "Данные лица загружаются и хранятся",
        forks: [],
      },
      {
        key: "watermark",
        en: "Watermark on free output",
        ru: "На бесплатном результате стоит водяной знак",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during processing",
        ru: "Приложение падает во время обработки",
        forks: [
          { key: "reliability.crashes", en: "Crashes after upload or mid-processing", ru: "Падает после загрузки или в процессе обработки" },
        ],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "photo-social-apps": {
    slug: "photo-social-apps",
    version: "photo-social-apps-1",
    en: "Photo & Video Social Platforms",
    ru: "Социальные платформы для фото и видео",
    needs: [
      {
        key: "account-banned",
        en: "Wrongful shadowban or account ban",
        ru: "Аккаунт теневой блокировки или полной блокировки без причины",
        forks: [
          { key: "account-banned.shadowban", en: "Content hidden from followers without notice", ru: "Контент скрыт от подписчиков без предупреждения" },
        ],
      },
      {
        key: "algorithm",
        en: "Content not shown to followers",
        ru: "Контент не показывается подписчикам",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes or won't load feed",
        ru: "Приложение падает или не загружает ленту",
        forks: [],
      },
      {
        key: "features-removed",
        en: "Popular features removed or changed",
        ru: "Популярные функции удалили или изменили",
        forks: [],
      },
      {
        key: "privacy",
        en: "Data harvesting and targeted ads",
        ru: "Сбор данных и таргетированная реклама",
        forks: [],
      },
      {
        key: "ads",
        en: "Excessive ads in the feed",
        ru: "Слишком много рекламы в ленте",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "cloud-storage-apps": {
    slug: "cloud-storage-apps",
    version: "cloud-storage-apps-1",
    en: "Cloud Storage Apps",
    ru: "Приложения облачного хранилища",
    needs: [
      {
        key: "billing",
        en: "Storage quota suddenly full, forced upgrade",
        ru: "Хранилище неожиданно заполняется, принудительный апгрейд",
        forks: [],
      },
      {
        key: "sync-issues",
        en: "Files don't sync across devices",
        ru: "Файлы не синхронизируются между устройствами",
        forks: [],
      },
      {
        key: "data-loss",
        en: "Files deleted without user action",
        ru: "Файлы удаляются без действий пользователя",
        forks: [],
      },
      {
        key: "reliability",
        en: "Upload fails or app won't connect",
        ru: "Загрузка не работает или приложение не подключается",
        forks: [],
      },
      {
        key: "privacy",
        en: "Concerns about data sharing and scanning",
        ru: "Опасения по поводу передачи и сканирования данных",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "ai-chatbot-assistant": {
    slug: "ai-chatbot-assistant",
    version: "ai-chatbot-assistant-1",
    en: "AI Assistant & Chatbot Apps",
    ru: "ИИ-ассистенты и чат-боты",
    needs: [
      {
        key: "paywall",
        en: "Free tier too limited to be useful",
        ru: "Бесплатный уровень слишком ограничен",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged immediately after trial",
        ru: "Деньги списывают сразу после пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial auto-converts to paid subscription", ru: "Пробный период автоматически переходит в платный" },
        ],
      },
      {
        key: "response-quality",
        en: "Wrong or hallucinated answers",
        ru: "Неверные или выдуманные ответы",
        forks: [],
      },
      {
        key: "reliability",
        en: "Server errors and downtime",
        ru: "Ошибки сервера и простои",
        forks: [],
      },
      {
        key: "privacy",
        en: "Conversations stored or sold",
        ru: "Разговоры хранятся или продаются",
        forks: [],
      },
      {
        key: "rate-limiting",
        en: "Throttled too aggressively on free tier",
        ru: "Слишком жёсткое ограничение на бесплатном уровне",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "ai-video-creation": {
    slug: "ai-video-creation",
    version: "ai-video-creation-1",
    en: "AI Video Creation Apps",
    ru: "Приложения создания видео с ИИ",
    needs: [
      {
        key: "paywall",
        en: "Generation credits locked behind paywall",
        ru: "Кредиты на генерацию заперты за платным доступом",
        forks: [],
      },
      {
        key: "results-quality",
        en: "Generated video poor or incorrect",
        ru: "Сгенерированное видео плохого качества или с ошибками",
        forks: [],
      },
      {
        key: "watermark",
        en: "Watermark on all free output",
        ru: "На всех бесплатных результатах водяной знак",
        forks: [],
      },
      {
        key: "billing",
        en: "Credits consumed without usable result",
        ru: "Кредиты тратятся без получения результата",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during generation",
        ru: "Приложение падает в процессе генерации",
        forks: [
          { key: "reliability.crashes", en: "Crashes and credits lost", ru: "Приложение падает и кредиты сгорают" },
        ],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "office-documents": {
    slug: "office-documents",
    version: "office-documents-1",
    en: "Office & Document Apps",
    ru: "Офисные приложения и работа с документами",
    needs: [
      {
        key: "billing",
        en: "Subscription required to open or edit files",
        ru: "Для открытия и редактирования файлов нужна подписка",
        forks: [],
      },
      {
        key: "reliability",
        en: "Crashes and loses unsaved work",
        ru: "Падает и теряет несохранённую работу",
        forks: [],
      },
      {
        key: "sync",
        en: "Cloud sync breaks and loses files",
        ru: "Синхронизация с облаком ломается и теряет файлы",
        forks: [],
      },
      {
        key: "compatibility",
        en: "Formatting broken when opening other formats",
        ru: "Форматирование ломается при открытии сторонних форматов",
        forks: [],
      },
      {
        key: "support",
        en: "Support unresponsive for data loss",
        ru: "Поддержка не реагирует на потерю данных",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "smart-printer-apps": {
    slug: "smart-printer-apps",
    version: "smart-printer-apps-1",
    en: "Smart Printer & Wireless Printing Apps",
    ru: "Приложения умной и беспроводной печати",
    needs: [
      {
        key: "device-compatibility",
        en: "App can't detect printer on the network",
        ru: "Приложение не находит принтер в сети",
        forks: [],
      },
      {
        key: "reliability",
        en: "Connection drops mid-print",
        ru: "Соединение обрывается во время печати",
        forks: [],
      },
      {
        key: "billing",
        en: "Ink subscription scam or unexpected charges",
        ru: "Мошенническая подписка на чернила или неожиданные списания",
        forks: [],
      },
      {
        key: "setup-issues",
        en: "Initial pairing with printer fails",
        ru: "Первоначальное подключение к принтеру не работает",
        forks: [],
      },
      {
        key: "print-quality",
        en: "Output quality worse than expected",
        ru: "Качество печати хуже ожидаемого",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads in a printing utility app",
        ru: "Реклама в утилите для печати",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "parcel-tracking": {
    slug: "parcel-tracking",
    version: "parcel-tracking-1",
    en: "Parcel & Delivery Tracking Apps",
    ru: "Приложения отслеживания посылок",
    needs: [
      {
        key: "tracking-accuracy",
        en: "Location not updated for days",
        ru: "Местоположение не обновляется несколько дней",
        forks: [],
      },
      {
        key: "notifications",
        en: "No delivery alerts sent",
        ru: "Уведомления о доставке не приходят",
        forks: [],
      },
      {
        key: "reliability",
        en: "App won't load tracking info",
        ru: "Приложение не загружает информацию об отслеживании",
        forks: [],
      },
      {
        key: "delivery-issues",
        en: "Parcel marked delivered but not received",
        ru: "Посылка помечена как доставленная, но не получена",
        forks: [],
      },
      {
        key: "support",
        en: "No response for lost parcel claims",
        ru: "Нет ответа на заявки о потере посылки",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "real-estate-apps": {
    slug: "real-estate-apps",
    version: "real-estate-apps-1",
    en: "Real Estate & Property Apps",
    ru: "Приложения для недвижимости",
    needs: [
      {
        key: "listing-accuracy",
        en: "Sold or rented properties still shown as available",
        ru: "Проданные или сданные объекты показываются как доступные",
        forks: [
          { key: "listing-accuracy.wrong-price", en: "Listed price differs from actual asking price", ru: "Цена в объявлении отличается от реальной" },
        ],
      },
      {
        key: "ads",
        en: "Ads before every listing",
        ru: "Реклама перед каждым объявлением",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes or fails to load listings",
        ru: "Приложение падает или не загружает объявления",
        forks: [],
      },
      {
        key: "data-outdated",
        en: "Listings not refreshed, stale data",
        ru: "Объявления не обновляются, устаревшие данные",
        forks: [],
      },
      {
        key: "agent-contact",
        en: "Agents unresponsive via in-app contact",
        ru: "Агенты не отвечают через внутренний мессенджер",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "family-safety-apps": {
    slug: "family-safety-apps",
    version: "family-safety-apps-1",
    en: "Family Safety & Location Apps",
    ru: "Приложения семейной безопасности",
    needs: [
      {
        key: "location-accuracy",
        en: "Location shown is way off",
        ru: "Местоположение отображается с большой погрешностью",
        forks: [],
      },
      {
        key: "billing",
        en: "Key safety features locked behind subscription",
        ru: "Ключевые функции безопасности доступны только по подписке",
        forks: [],
      },
      {
        key: "battery-drain",
        en: "Kills phone battery on tracked device",
        ru: "Быстро разряжает батарею на отслеживаемом устройстве",
        forks: [],
      },
      {
        key: "reliability",
        en: "Location freezes or stops updating",
        ru: "Местоположение зависает и перестаёт обновляться",
        forks: [],
      },
      {
        key: "privacy",
        en: "Location data shared with third parties",
        ru: "Данные о местоположении передаются третьим лицам",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "digital-photo-frames": {
    slug: "digital-photo-frames",
    version: "digital-photo-frames-1",
    en: "Digital Photo Frame Apps",
    ru: "Приложения цифровых фоторамок",
    needs: [
      {
        key: "setup-issues",
        en: "Can't connect frame to app",
        ru: "Не удаётся подключить рамку к приложению",
        forks: [],
      },
      {
        key: "sync",
        en: "Photos don't arrive on the frame",
        ru: "Фотографии не появляются на рамке",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription required for basic use",
        ru: "Базовое использование требует подписки",
        forks: [],
      },
      {
        key: "reliability",
        en: "Frame goes offline frequently",
        ru: "Рамка часто уходит оффлайн",
        forks: [],
      },
      {
        key: "app-quality",
        en: "App crashes constantly",
        ru: "Приложение постоянно падает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "baby-monitor-apps": {
    slug: "baby-monitor-apps",
    version: "baby-monitor-apps-1",
    en: "Baby & Infant Monitor Apps",
    ru: "Приложения видеонянь и мониторинга младенцев",
    needs: [
      {
        key: "reliability",
        en: "Disconnects during the night",
        ru: "Связь прерывается ночью",
        forks: [
          { key: "reliability.disconnects", en: "Monitor disconnects and doesn't alert parent", ru: "Монитор отключается и не уведомляет родителя" },
        ],
      },
      {
        key: "accuracy",
        en: "False alerts wake parents unnecessarily",
        ru: "Ложные тревоги будят родителей без причины",
        forks: [],
      },
      {
        key: "billing",
        en: "Monthly fee for basic monitoring function",
        ru: "Ежемесячная плата за базовую функцию мониторинга",
        forks: [],
      },
      {
        key: "setup-issues",
        en: "Can't connect device to app",
        ru: "Не удаётся подключить устройство к приложению",
        forks: [],
      },
      {
        key: "battery-drain",
        en: "Drains battery on both parent and baby device",
        ru: "Быстро разряжает батарею на обоих устройствах",
        forks: [],
      },
      {
        key: "privacy",
        en: "Video feed security concerns",
        ru: "Опасения по поводу безопасности видеопотока",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "craft-diy-apps": {
    slug: "craft-diy-apps",
    version: "craft-diy-apps-1",
    en: "Craft & DIY Design Apps",
    ru: "Приложения для рукоделия и дизайна",
    needs: [
      {
        key: "connectivity",
        en: "Cutting machine won't connect to app",
        ru: "Режущий плоттер не подключается к приложению",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription required to access design library",
        ru: "Доступ к библиотеке дизайнов требует подписки",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during project",
        ru: "Приложение падает в процессе работы над проектом",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses unsaved design", ru: "Падает и теряет несохранённый дизайн" },
        ],
      },
      {
        key: "features",
        en: "Basic editing features behind paywall",
        ru: "Базовые функции редактирования за paywall",
        forks: [],
      },
      {
        key: "support",
        en: "Support unresponsive for machine connectivity",
        ru: "Поддержка не помогает с подключением оборудования",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "device-finder-apps": {
    slug: "device-finder-apps",
    version: "device-finder-apps-1",
    en: "Device & Item Finder Apps",
    ru: "Приложения для поиска устройств и предметов",
    needs: [
      {
        key: "location-accuracy",
        en: "Location shown is wrong or outdated",
        ru: "Показанное местоположение неверное или устаревшее",
        forks: [],
      },
      {
        key: "battery-drain",
        en: "Tracker drains phone battery fast",
        ru: "Трекер быстро разряжает батарею телефона",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription required for location history",
        ru: "История местоположения доступна только по подписке",
        forks: [],
      },
      {
        key: "range",
        en: "Bluetooth range too short to be useful",
        ru: "Дальность Bluetooth слишком мала для практического применения",
        forks: [],
      },
      {
        key: "reliability",
        en: "App doesn't show tracker or loses connection",
        ru: "Приложение не видит трекер или теряет с ним связь",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "grocery-loyalty-apps": {
    slug: "grocery-loyalty-apps",
    version: "grocery-loyalty-apps-1",
    en: "Grocery & Supermarket Apps",
    ru: "Приложения супермаркетов и продуктовых магазинов",
    needs: [
      {
        key: "coupons-missing",
        en: "Offers disappear at checkout",
        ru: "Акции пропадают при оплате",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes in-store",
        ru: "Приложение падает прямо в магазине",
        forks: [
          { key: "reliability.crashes", en: "Crashes when scanning or at checkout", ru: "Падает при сканировании или на кассе" },
        ],
      },
      {
        key: "scanning",
        en: "Barcode scanner broken or slow",
        ru: "Сканер штрихкодов не работает или слишком медленный",
        forks: [],
      },
      {
        key: "loyalty-points",
        en: "Points don't appear after purchase",
        ru: "Баллы не начисляются после покупки",
        forks: [],
      },
      {
        key: "billing-errors",
        en: "Wrong price charged versus app price",
        ru: "На кассе списывают не ту цену, что в приложении",
        forks: [],
      },
      {
        key: "account-issues",
        en: "Account locked or card not linked",
        ru: "Аккаунт заблокирован или карта не привязывается",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "theme-park-apps": {
    slug: "theme-park-apps",
    version: "theme-park-apps-1",
    en: "Theme Park & Attraction Apps",
    ru: "Приложения тематических парков",
    needs: [
      {
        key: "virtual-queue",
        en: "Virtual queue system broken or unfair",
        ru: "Система виртуальной очереди сломана или несправедлива",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes inside the park",
        ru: "Приложение падает на территории парка",
        forks: [],
      },
      {
        key: "billing",
        en: "Surprise in-app charges for reserved experiences",
        ru: "Неожиданные платежи за бронирование аттракционов",
        forks: [],
      },
      {
        key: "wait-times",
        en: "Wait times shown are wrong",
        ru: "Показанное время ожидания не соответствует реальному",
        forks: [],
      },
      {
        key: "pass-access",
        en: "Season or annual pass not loading",
        ru: "Сезонный или годовой абонемент не отображается",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "audio-podcast-apps": {
    slug: "audio-podcast-apps",
    version: "audio-podcast-apps-1",
    en: "Audio & Podcast Apps",
    ru: "Приложения для аудио и подкастов",
    needs: [
      {
        key: "billing",
        en: "Subscription required for basic listening",
        ru: "Базовое прослушивание требует подписки",
        forks: [],
      },
      {
        key: "offline-download",
        en: "Downloaded episodes disappear",
        ru: "Скачанные эпизоды пропадают",
        forks: [],
      },
      {
        key: "reliability",
        en: "Playback stops randomly",
        ru: "Воспроизведение прерывается без причины",
        forks: [],
      },
      {
        key: "sync",
        en: "Listening progress not synced across devices",
        ru: "Прогресс прослушивания не синхронизируется между устройствами",
        forks: [],
      },
      {
        key: "ads",
        en: "Too many ads between podcast episodes",
        ru: "Слишком много рекламы между эпизодами",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "bible-prayer-apps": {
    slug: "bible-prayer-apps",
    version: "bible-prayer-apps-1",
    en: "Bible & Prayer Apps",
    ru: "Приложения для чтения Библии и молитв",
    needs: [
      {
        key: "paywall",
        en: "Reading plans and devotionals locked",
        ru: "Планы чтения и назидательные материалы закрыты",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads shown during Bible reading",
        ru: "Реклама показывается во время чтения Библии",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during reading",
        ru: "Приложение падает во время чтения",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses reading position", ru: "Падает и теряет место в тексте" },
        ],
      },
      {
        key: "offline-access",
        en: "Offline Bible requires internet connection",
        ru: "Офлайн-библия требует подключения к интернету",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription for spiritual content",
        ru: "Духовный контент требует оплаты",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "news-media-apps": {
    slug: "news-media-apps",
    version: "news-media-apps-1",
    en: "News & Media Apps",
    ru: "Новостные приложения и медиа",
    needs: [
      {
        key: "paywall",
        en: "Articles behind metered paywall",
        ru: "Статьи за платным доступом",
        forks: [],
      },
      {
        key: "ads",
        en: "Autoplay video ads interrupt reading",
        ru: "Видеореклама с автовоспроизведением мешает читать",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes or fails to load articles",
        ru: "Приложение падает или не загружает статьи",
        forks: [],
      },
      {
        key: "bias",
        en: "Perceived editorial bias in coverage",
        ru: "Воспринимаемая редакционная предвзятость",
        forks: [],
      },
      {
        key: "notifications",
        en: "Notification spam from breaking news",
        ru: "Спам-уведомления о срочных новостях",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "email-apps": {
    slug: "email-apps",
    version: "email-apps-1",
    en: "Email Client Apps",
    ru: "Почтовые клиенты",
    needs: [
      {
        key: "billing",
        en: "Subscription required to send and receive email",
        ru: "Для отправки и получения писем нужна подписка",
        forks: [],
      },
      {
        key: "sync",
        en: "Emails don't sync in real time",
        ru: "Письма не синхронизируются в реальном времени",
        forks: [],
      },
      {
        key: "reliability",
        en: "Push notifications broken",
        ru: "Push-уведомления не работают",
        forks: [],
      },
      {
        key: "spam-filter",
        en: "Spam filter lets too much through",
        ru: "Спам-фильтр пропускает слишком много",
        forks: [],
      },
      {
        key: "privacy",
        en: "Email content scanned for advertising",
        ru: "Содержимое писем сканируется для рекламы",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "sports-fan-apps": {
    slug: "sports-fan-apps",
    version: "sports-fan-apps-1",
    en: "Sports Tracking & Fan Apps",
    ru: "Спортивные и фанатские приложения",
    needs: [
      {
        key: "live-scores",
        en: "Scores delayed or wrong",
        ru: "Счёт с задержкой или отображается неверно",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during matches",
        ru: "Приложение падает во время матчей",
        forks: [],
      },
      {
        key: "billing",
        en: "Detailed stats locked behind paywall",
        ru: "Подробная статистика за платным доступом",
        forks: [],
      },
      {
        key: "notifications",
        en: "Goal and match alerts arrive late or wrong",
        ru: "Уведомления о голах и матчах приходят с опозданием или содержат ошибки",
        forks: [],
      },
      {
        key: "data-accuracy",
        en: "Wrong lineups or statistics shown",
        ru: "Показаны неверные составы или статистика",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "photo-collage-apps": {
    slug: "photo-collage-apps",
    version: "photo-collage-apps-1",
    en: "Photo Collage & Editing Apps",
    ru: "Приложения коллажей и редактирования фото",
    needs: [
      {
        key: "paywall",
        en: "Most templates locked behind subscription",
        ru: "Большинство шаблонов за подпиской",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged immediately on free trial",
        ru: "Деньги списываются сразу после начала пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial converts to paid without warning", ru: "Пробный период переходит в платный без предупреждения" },
        ],
      },
      {
        key: "watermark",
        en: "Watermark on free exports",
        ru: "На бесплатном экспорте стоит водяной знак",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes and loses edits",
        ru: "Приложение падает и теряет изменения",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses unsaved collage", ru: "Падает и теряет несохранённый коллаж" },
        ],
      },
      {
        key: "ads",
        en: "Ads interrupt every editing step",
        ru: "Реклама прерывает каждый шаг редактирования",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "wifi-network-tools": {
    slug: "wifi-network-tools",
    version: "wifi-network-tools-1",
    en: "WiFi & Network Tool Apps",
    ru: "Приложения сетевых инструментов и Wi-Fi",
    needs: [
      {
        key: "accuracy",
        en: "Wrong network information shown",
        ru: "Показывается неверная информация о сети",
        forks: [],
      },
      {
        key: "reliability",
        en: "Scan fails or returns no results",
        ru: "Сканирование не работает или ничего не находит",
        forks: [],
      },
      {
        key: "ads",
        en: "Excessive ads in utility app",
        ru: "Слишком много рекламы в утилитарном приложении",
        forks: [],
      },
      {
        key: "billing",
        en: "Paid version offers nothing over free alternatives",
        ru: "Платная версия ничем не превосходит бесплатные аналоги",
        forks: [],
      },
      {
        key: "compatibility",
        en: "Doesn't scan on newer Android versions",
        ru: "Не работает на новых версиях Android",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "finance-tax-apps": {
    slug: "finance-tax-apps",
    version: "finance-tax-apps-1",
    en: "Tax & Finance Apps",
    ru: "Налоговые и финансовые приложения",
    needs: [
      {
        key: "billing",
        en: "Unexpected charge to actually file return",
        ru: "Неожиданная плата в самый момент подачи декларации",
        forks: [],
      },
      {
        key: "accuracy",
        en: "Wrong tax calculation or refund estimate",
        ru: "Неверный расчёт налога или оценка возврата",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during filing",
        ru: "Приложение падает во время заполнения",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses filled data", ru: "Падает и теряет введённые данные" },
        ],
      },
      {
        key: "support",
        en: "No human support during tax season",
        ru: "В налоговый сезон нет живой поддержки",
        forks: [],
      },
      {
        key: "data-import",
        en: "Bank and brokerage import broken",
        ru: "Импорт из банков и брокеров не работает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "government-services-apps": {
    slug: "government-services-apps",
    version: "government-services-apps-1",
    en: "Government Services Apps",
    ru: "Приложения государственных услуг",
    needs: [
      {
        key: "reliability",
        en: "App crashes frequently",
        ru: "Приложение часто падает",
        forks: [
          { key: "reliability.crashes", en: "Crashes during document submission", ru: "Падает при подаче документов" },
        ],
      },
      {
        key: "login-broken",
        en: "Can't log in with government credentials",
        ru: "Не удаётся войти с государственными учётными данными",
        forks: [],
      },
      {
        key: "data-sync",
        en: "Records not updated in the app",
        ru: "Записи не обновляются в приложении",
        forks: [],
      },
      {
        key: "support",
        en: "No technical support for app issues",
        ru: "Нет технической поддержки по вопросам приложения",
        forks: [],
      },
      {
        key: "verification",
        en: "Identity verification fails for valid users",
        ru: "Верификация личности не проходит у реальных пользователей",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "insurance-apps": {
    slug: "insurance-apps",
    version: "insurance-apps-1",
    en: "Insurance Apps",
    ru: "Страховые приложения",
    needs: [
      {
        key: "billing-errors",
        en: "Wrong premium or payment charged",
        ru: "Неверная страховая премия или ошибочное списание",
        forks: [],
      },
      {
        key: "claim-issues",
        en: "Claim submission process broken in app",
        ru: "Процесс подачи заявки на выплату сломан",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes when accessing policy",
        ru: "Приложение падает при доступе к полису",
        forks: [],
      },
      {
        key: "support",
        en: "Bot replaces human claims support",
        ru: "Живую поддержку по страховым случаям заменил чат-бот",
        forks: [],
      },
      {
        key: "data-access",
        en: "Can't view policy details or documents",
        ru: "Нельзя просмотреть детали полиса или документы",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "event-social-apps": {
    slug: "event-social-apps",
    version: "event-social-apps-1",
    en: "Event & Social Discovery Apps",
    ru: "Приложения поиска событий и знакомств",
    needs: [
      {
        key: "fake-events",
        en: "Ghost events and fake organizers",
        ru: "События-призраки и фиктивные организаторы",
        forks: [],
      },
      {
        key: "paywall",
        en: "Pay to see who's attending",
        ru: "Нужно платить, чтобы увидеть список участников",
        forks: [],
      },
      {
        key: "billing",
        en: "Subscription for basic event creation",
        ru: "Создание базовых мероприятий требует подписки",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes or events fail to load",
        ru: "Приложение падает или мероприятия не загружаются",
        forks: [],
      },
      {
        key: "spam",
        en: "Spam invites from unknown organizers",
        ru: "Спам-приглашения от незнакомых организаторов",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "salon-booking-apps": {
    slug: "salon-booking-apps",
    version: "salon-booking-apps-1",
    en: "Beauty & Salon Booking Apps",
    ru: "Приложения бронирования салонов красоты",
    needs: [
      {
        key: "booking-reliability",
        en: "Bookings disappear or are not confirmed",
        ru: "Бронирования пропадают или не подтверждаются",
        forks: [],
      },
      {
        key: "notifications",
        en: "No booking confirmation received",
        ru: "Подтверждение бронирования не приходит",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged after cancelling appointment",
        ru: "Списывают деньги после отмены записи",
        forks: [],
      },
      {
        key: "support",
        en: "Disputes over charges ignored",
        ru: "Споры по оплате игнорируются",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes when booking",
        ru: "Приложение падает при бронировании",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "screen-recording-apps": {
    slug: "screen-recording-apps",
    version: "screen-recording-apps-1",
    en: "Screen Recording & Capture Apps",
    ru: "Приложения записи экрана",
    needs: [
      {
        key: "watermark",
        en: "Watermark on all free recordings",
        ru: "На всех бесплатных записях стоит водяной знак",
        forks: [],
      },
      {
        key: "billing",
        en: "Basic screen recording requires subscription",
        ru: "Базовая запись экрана требует подписки",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes mid-recording",
        ru: "Приложение падает во время записи",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses the recording", ru: "Падает и теряет запись" },
        ],
      },
      {
        key: "quality",
        en: "Recording quality poor or degraded",
        ru: "Качество записи плохое или ухудшенное",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads interrupt recording sessions",
        ru: "Реклама прерывает сеансы записи",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "food-recipe-apps": {
    slug: "food-recipe-apps",
    version: "food-recipe-apps-1",
    en: "Food Recipe & Meal Planning Apps",
    ru: "Приложения рецептов и планирования питания",
    needs: [
      {
        key: "paywall",
        en: "Recipes locked behind subscription",
        ru: "Рецепты заперты за подпиской",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads between recipe steps",
        ru: "Реклама между шагами рецепта",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes mid-recipe",
        ru: "Приложение падает прямо в процессе готовки",
        forks: [
          { key: "reliability.crashes", en: "Crashes and loses place in recipe", ru: "Падает и теряет место в рецепте" },
        ],
      },
      {
        key: "offline-access",
        en: "Saved recipes need internet connection",
        ru: "Сохранённые рецепты требуют интернета",
        forks: [],
      },
      {
        key: "content-quality",
        en: "Recipes inaccurate or poorly tested",
        ru: "Рецепты неточные или плохо проверенные",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "language-kids-apps": {
    slug: "language-kids-apps",
    version: "language-kids-apps-1",
    en: "Kids Language Learning Apps",
    ru: "Детские приложения для изучения языков",
    needs: [
      {
        key: "paywall",
        en: "Most content locked from first session",
        ru: "Большая часть контента закрыта с первого сеанса",
        forks: [],
      },
      {
        key: "billing",
        en: "Expensive subscription for children's app",
        ru: "Дорогая подписка за детское приложение",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes during lessons",
        ru: "Приложение падает во время занятий",
        forks: [
          { key: "reliability.crashes", en: "Crashes and resets lesson progress", ru: "Падает и сбрасывает прогресс урока" },
        ],
      },
      {
        key: "ads",
        en: "Ads shown to children",
        ru: "Реклама показывается детям",
        forks: [],
      },
      {
        key: "content-quality",
        en: "Wrong pronunciation or poor content quality",
        ru: "Неверное произношение или низкое качество контента",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "screen-mirroring-cast": {
    slug: "screen-mirroring-cast",
    version: "screen-mirroring-cast-1",
    en: "Screen Mirroring & Cast Apps",
    ru: "Приложения зеркалирования экрана",
    needs: [
      {
        key: "device-compatibility",
        en: "Can't find TV or Chromecast on network",
        ru: "Не находит телевизор или Chromecast в сети",
        forks: [],
      },
      {
        key: "reliability",
        en: "Connection drops mid-stream",
        ru: "Соединение прерывается во время трансляции",
        forks: [],
      },
      {
        key: "ads",
        en: "Ads interrupt casting session",
        ru: "Реклама прерывает сеанс трансляции",
        forks: [],
      },
      {
        key: "billing",
        en: "Basic cast requires paid subscription",
        ru: "Базовое зеркалирование требует подписки",
        forks: [],
      },
      {
        key: "setup-issues",
        en: "Pairing with TV broken",
        ru: "Сопряжение с телевизором не работает",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "astrology-apps": {
    slug: "astrology-apps",
    version: "astrology-apps-1",
    en: "Astrology & Horoscope Apps",
    ru: "Приложения астрологии и гороскопов",
    needs: [
      {
        key: "paywall",
        en: "Birth chart and readings locked",
        ru: "Натальная карта и расшифровки закрыты",
        forks: [],
      },
      {
        key: "billing",
        en: "Charged immediately on free trial",
        ru: "Деньги списываются сразу после начала пробного периода",
        forks: [
          { key: "billing.charged-trial", en: "Trial auto-converts to full subscription", ru: "Пробный период автоматически переходит в полную подписку" },
        ],
      },
      {
        key: "accuracy",
        en: "Readings too generic or obviously wrong",
        ru: "Предсказания слишком общие или явно неверные",
        forks: [],
      },
      {
        key: "ads",
        en: "Excessive ads before every reading",
        ru: "Реклама перед каждым гороскопом",
        forks: [],
      },
      {
        key: "data-privacy",
        en: "Personal birth data sold to third parties",
        ru: "Личные данные о дате рождения передаются третьим лицам",
        forks: [],
      },
      {
        key: "spam-notifications",
        en: "Daily notification spam disguised as horoscopes",
        ru: "Ежедневный спам уведомлений под видом гороскопов",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },

  "regional-streaming": {
    slug: "regional-streaming",
    version: "regional-streaming-1",
    en: "Regional & Niche Streaming Apps",
    ru: "Региональные стриминговые сервисы",
    needs: [
      {
        key: "billing",
        en: "Subscription issues and hard cancellation",
        ru: "Проблемы с подпиской и сложная отмена",
        forks: [],
      },
      {
        key: "content-removed",
        en: "Episodes removed mid-season",
        ru: "Эпизоды удаляются в середине сезона",
        forks: [],
      },
      {
        key: "streaming-quality",
        en: "Constant buffering and low quality",
        ru: "Постоянная буферизация и низкое качество",
        forks: [],
      },
      {
        key: "geo-blocking",
        en: "Content blocked in wrong region",
        ru: "Контент заблокирован не в том регионе",
        forks: [],
      },
      {
        key: "reliability",
        en: "App crashes frequently",
        ru: "Приложение часто падает",
        forks: [],
      },
      {
        key: "subtitles",
        en: "Wrong, missing or out-of-sync subtitles",
        ru: "Субтитры неверные, отсутствуют или не синхронизированы",
        forks: [],
      },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "flight-tracking-apps": {
    slug: "flight-tracking-apps",
    version: "flight-tracking-apps-1",
    en: "Flight Tracker Apps",
    ru: "Приложения отслеживания рейсов",
    needs: [
      { key: "data-accuracy", en: "Delays, gate changes or status shown wrong", ru: "Неверно отображаются задержки, изменения выходов или статус", forks: [] },
      { key: "billing", en: "Subscription required for basic tracking", ru: "Базовое отслеживание требует подписки", forks: [
        { key: "billing.charged-trial", en: "Charged immediately on free trial", ru: "Сняли деньги сразу при пробном периоде" },
      ]},
      { key: "notifications", en: "No alerts for gate changes or delays", ru: "Нет уведомлений об изменении выходов или задержках", forks: [] },
      { key: "reliability", en: "App crashes or freezes", ru: "Приложение вылетает или зависает", forks: [] },
      { key: "ads", en: "Excessive ads between every search", ru: "Реклама после каждого поиска", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "language-exchange-apps": {
    slug: "language-exchange-apps",
    version: "language-exchange-apps-1",
    en: "Language Exchange Apps",
    ru: "Приложения языкового обмена",
    needs: [
      { key: "partner-matching", en: "Can't find partners or only bots respond", ru: "Нельзя найти партнёра или отвечают только боты", forks: [] },
      { key: "paywall", en: "Most interactions locked behind premium", ru: "Большинство функций заблокированы за платным доступом", forks: [
        { key: "paywall.messages", en: "Can't reply without subscription", ru: "Нельзя отвечать без подписки" },
      ]},
      { key: "reliability", en: "App crashes or messages not delivered", ru: "Приложение вылетает или сообщения не доходят", forks: [] },
      { key: "fake-profiles", en: "Fake profiles and scammers", ru: "Фейковые профили и мошенники", forks: [] },
      { key: "billing", en: "Subscription auto-renewed without warning", ru: "Подписка автоматически продлевается без предупреждения", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "sleep-tracker-apps": {
    slug: "sleep-tracker-apps",
    version: "sleep-tracker-apps-1",
    en: "Sleep Tracker & Snore Monitor Apps",
    ru: "Приложения трекинга сна и мониторинга храпа",
    needs: [
      { key: "accuracy", en: "Sleep stages or snore detection wildly wrong", ru: "Фазы сна или детекция храпа сильно расходятся с реальностью", forks: [
        { key: "accuracy.false-snore", en: "Reports snoring when silent", ru: "Сообщает о храпе при тишине" },
      ]},
      { key: "billing", en: "Detailed data locked behind subscription", ru: "Подробные данные скрыты за подпиской", forks: [] },
      { key: "reliability", en: "App stops recording mid-night", ru: "Приложение прекращает запись в середине ночи", forks: [] },
      { key: "battery-drain", en: "Drains phone battery overnight", ru: "За ночь разряжает батарею телефона", forks: [] },
      { key: "ads", en: "Ads interrupt sleep analysis", ru: "Реклама прерывает анализ сна", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
  "smart-security-cameras": {
    slug: "smart-security-cameras",
    version: "smart-security-cameras-1",
    en: "Smart Security Camera Apps",
    ru: "Приложения умных камер безопасности",
    needs: [
      { key: "connectivity", en: "Camera goes offline frequently", ru: "Камера часто уходит в оффлайн", forks: [
        { key: "connectivity.local-only", en: "Only works on same WiFi, not remote", ru: "Работает только в той же сети, не удалённо" },
      ]},
      { key: "billing", en: "Cloud storage or features require subscription", ru: "Облачное хранение или функции требуют подписки", forks: [
        { key: "billing.cant-cancel", en: "Subscription hard to cancel", ru: "Подписку сложно отменить" },
      ]},
      { key: "reliability", en: "App crashes or shows black screen", ru: "Приложение вылетает или показывает чёрный экран", forks: [] },
      { key: "notifications", en: "Motion alerts too frequent or missing", ru: "Уведомления о движении слишком частые или не приходят", forks: [] },
      { key: "privacy", en: "Footage accessible to third parties", ru: "Записи доступны третьим лицам", forks: [] },
      {
        key: "feature-gap",
        en: "Missing feature or improvement",
        ru: "Отсутствует функция или улучшение",
        forks: [
          { key: "feature-gap.no-export", en: "Can't export or share data", ru: "Нельзя экспортировать или поделиться данными" },
          { key: "feature-gap.no-offline", en: "No offline mode", ru: "Нет офлайн-режима" },
          { key: "feature-gap.no-customization", en: "Missing customization or settings", ru: "Нет нужных настроек или кастомизации" },
          { key: "feature-gap.no-integration", en: "Missing integration with other service", ru: "Нет интеграции с нужным сервисом" },
          { key: "feature-gap.no-platform", en: "Missing platform support (iPad, watch, web…)", ru: "Нет поддержки платформы (iPad, часы, веб…)" },
        ],
      },
    ],
  },
};

export function getTaxonomy(slug: string): GenreTaxonomy | null {
  return TAXONOMIES[slug] ?? null;
}

// The taxonomy version for a genre — stamped onto Review.needsVersion so each
// product type is (re)classified independently. Throws for an unknown slug so a
// typo can't silently stamp the wrong version.
export function taxonomyVersion(slug: string): string {
  const tax = TAXONOMIES[slug];
  if (!tax) throw new Error(`no taxonomy for slug "${slug}"`);
  return tax.version;
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
