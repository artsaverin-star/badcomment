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
