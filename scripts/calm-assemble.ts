import { readFileSync, writeFileSync } from "node:fs";

// Single-pass build of src/data/insights.json from the clustering output:
//   1) read cluster/out/<id>.json
//   2) sort clusters by observation count desc
//   3) keep top N (default 40)
//   4) apply title rewrites (plain Russian)
//   5) for each kept cluster, emit ALL its observations as evidence quotes
//      (dedup by review_id, keep best score per review) — modal lists every
//      verbatim observation behind the count so the headline can't outrun
//      the evidence
//
// Usage: npx tsx scripts/calm-assemble.ts <productId> [topN=40]

const PRODUCT_ID = process.argv[2];
if (!PRODUCT_ID) {
  console.error("usage: calm-assemble.ts <productId>");
  process.exit(1);
}

type ClusterIn = {
  id: string;
  title: string;
  novelty: "high" | "medium" | "low";
  observation_ids: number[];
};

type Theme = "payment" | "content" | "playback" | "ui" | "reliability" | "support" | "strategy";

// Hand-assigned theme per cluster id. Edit here if a cluster needs to move.
const THEMES: Record<string, Theme> = {
  // ── Подписка и оплата ──────────────────────────────────────────────────
  "payment-captured-no-entitlement": "payment",
  "trial-instant-yearly-charge": "payment",
  "cancel-confirmed-but-charged": "payment",
  "post-purchase-promo-spam-paid": "payment",
  "free-tier-throttled-per-track": "payment",
  "lifetime-tier-degraded": "payment",
  "gift-paypal-parallel-billing": "payment",
  "promo-tier-stacks-secondary-charge": "payment",
  "calm-sleep-second-app-confusion": "payment",
  "ad-vs-listing-price-gap": "payment",
  "partner-code-redemption-broken": "payment",
  "duplicate-charge-via-family-upgrade": "payment",
  "ghost-subscription-apple-mismatch": "payment",
  "price-discrimination-grandfathered": "payment",
  "sticker-vs-actual-charge": "payment",
  "no-undo-cancellation": "payment",
  "sos-emergency-content-paywalled": "payment",
  "support-only-resolution-is-cancel-refund": "payment",
  "tv-ad-cost-disclosure": "payment",

  // ── Контент и каталог ──────────────────────────────────────────────────
  "celebrity-narrator-loyalty-anchor": "content",
  "content-recycled-detected": "content",
  "named-favourite-content": "content",
  "narrator-script-microcopy-churn": "content",
  "narrator-follow-notifications-missing": "content",
  "duration-filter-and-custom-length": "content",
  "trauma-loaded-sleep-content": "content",
  "removed-titles-break-routine": "content",
  "story-endings-untouched-surface": "content",
  "ai-narration-perception-cliff": "content",
  "course-progression-broken": "content",
  "stale-narrator-content": "content",
  "kids-age-and-segregation": "content",
  "title-vs-content-mismatch": "content",
  "calmling-character-ip-merch": "content",

  // ── Аудио и воспроизведение ────────────────────────────────────────────
  "story-loop-after-693": "playback",
  "audio-session-leak-android": "playback",
  "story-to-scene-handoff-broken": "playback",
  "interrupt-resume-lost": "playback",
  "autoplay-next-jolts-awake": "playback",
  "narration-mix-too-loud": "playback",
  "sleep-timer-undershoots": "playback",
  "earbud-bluetooth-routing": "playback",
  "downloads-need-online-revalidation": "playback",

  // ── Интерфейс и навигация ──────────────────────────────────────────────
  "narrator-as-filter-missing": "ui",
  "search-broken-or-removed": "ui",
  "free-tier-undiscoverable": "ui",
  "home-screen-discovery-feed-vs-launcher": "ui",
  "playlist-builder-restrictions": "ui",
  "streak-mechanic-broken-or-gameable": "ui",
  "post-session-survey-forced": "ui",
  "no-personalisation-after-quiz": "ui",
  "settings-toggle-ignored": "ui",
  "captcha-blocks-first-launch": "ui",
  "instructional-microcopy-out-of-sync": "ui",
  "ad-to-content-discoverability-gap": "ui",
  "captions-volume-accessibility-gap": "ui",
  "mood-checkin-rigidity": "ui",
  "pre-content-paywall-triple-gate": "ui",
  "favorited-not-prefetched": "ui",

  // ── Стабильность и устройства ──────────────────────────────────────────
  "platform-version-specific-crashes": "reliability",
  "version-specific-feature-regression": "reliability",
  "session-crashes-mid-meditation": "reliability",
  "splash-dead-end": "reliability",
  "cold-start-and-perf-decay": "reliability",
  "video-pipeline-cross-platform-regression": "reliability",
  "battery-heat-overhead": "reliability",
  "widget-and-ios-api-gaps": "reliability",
  "google-fit-watch-sync-broken": "reliability",

  // ── Поддержка и аккаунт ────────────────────────────────────────────────
  "ai-bot-support-deadend": "support",
  "feedback-blackhole": "support",
  "account-recovery-email-never-sent": "support",
  "good-support-anti-pattern": "support",

  // ── Стратегия и сегменты ───────────────────────────────────────────────
  "use-case-non-sleep": "strategy",
  "emdr-bait-and-switch": "strategy",
  "b2b-distribution-channels": "strategy",
  "sleep-app-stack-competitors": "strategy",
  "lapsed-and-pre-purchase-deliberation": "strategy",
  "stack-pattern-meditation-then-story": "strategy",
  "wake-up-reentry-jtbd": "strategy",
  "anti-productivity-corporate-framing": "strategy",
  "binaural-frequency-segment": "strategy",
  "ambient-only-segment-overserved": "strategy",
  "ambient-no-narration-segment": "strategy",
  "household-shared-listening": "strategy",
  "ip-asd-nd-religious-segments": "strategy",
  "brand-tone-amplifies-glitch-rage": "strategy",
  "calm-as-therapy-substitute": "strategy",
  "review-gaming-meta": "strategy",
  "lucid-dream-side-effect": "strategy",
  "privacy-data-shared-financial": "strategy",
};

type ClusterOutput = { clusters: ClusterIn[] };

type Observation = {
  review_id: string;
  rating: number;
  observation: string;
  trigger: string;
  jtbd?: string;
  specificity?: string;
  is_commodity?: boolean;
};

type Review = { externalId: string; rating: number; title: string | null; text: string; postedAt: string | null };

// ── Title rewrites ───────────────────────────────────────────────────────
// Hand-authored plain-Russian replacements for the agent's PM-shorthand
// originals. Keyed by the cluster's original title (verbatim). Edit here when
// titles need tightening.
const REWRITES: Record<string, string> = {
  "Calm используется off-label: коммут, фокус-работа, screen-break, кладбищенский ASMR, dog-music, pregnancy, brain-rehab":
    "Calm используют не для сна и медитации, а для работы, поездок, успокоить собаку, реабилитации после травм",
  "Apple/банк подтверждают оплату, но в Calm Premium не активируется и тикет молчит":
    "Apple и банк подтверждают оплату — внутри приложения подписка не активна, поддержка не отвечает",
  "EMDR/бинауральный квиз обещает персональный clinical-план, а отдаёт generic-плейлист без импорта в приложение":
    "Рекламный квиз обещает персональный план от психолога, но даёт обычный плейлист и не связан с подпиской",
  "Конкретный знаменитый narrator (LeBron, Harry Styles, McConaughey, P!nk) — основной retention-якорь и halo на их музыку/спорт":
    "Знаменитости-рассказчики (Леброн Джеймс, Гарри Стайлс, Макконахи) — главная причина почему люди остаются с приложением",
  "B2B/insurer/employer (Kaiser, Wells Fargo, county, BCBS-MI, gift, clinician comp) — главный распределительный канал retention":
    "Большинство постоянных пользователей пришли через работодателя или медицинскую страховку, а не сами",
  "Кнопка «7-day trial» сразу списывает полную годовую подписку без отсрочки":
    "Кнопка «7 дней бесплатно» сразу списывает полную годовую подписку, без пробного периода",
  "Отмена подтверждена письмом/экраном, но годовая подписка всё равно списывается":
    "Отмена подтверждена в письме и на экране, а годовая подписка всё равно списывается",
  "AI-чатбот вместо саппорта галлюцинирует UI и зацикливает пользователя без эскалации":
    "В поддержке отвечает бот — описывает кнопки которых нет в приложении и не передаёт живому оператору",
  "Поиск/фильтр по конкретному narrator (Erik Braa, Tamara, Chike Okonkwo) сломан или удалён":
    "Поиск по конкретному рассказчику не работает или удалён — нельзя найти все его записи",
  "Платный/Lifetime подписчик всё равно ловит ad-баннеры на Family/Calm Sleep без dismiss и опт-аута":
    "Платным и пожизненным подписчикам всё равно показывают рекламу других продуктов Calm без возможности отключить",
  "Daily-Calm и Jeff Warren сессии переиспользуют куски word-for-word, что замечают многолетние пользователи":
    "Ежедневные медитации и сессии Джеффа Уоррена дословно повторяют куски — это замечают те кто слушает годами",
  "Calm — один тул в стеке: Slumber/Insight Timer/Moshi/YouTube ASMR/Alexa/Apple Music — substitute-альтернативы названы поимённо":
    "Пользователи называют конкретные альтернативы которыми пользуются параллельно: Slumber, Insight Timer, YouTube ASMR, Apple Music",
  "Поименованный контент (Hummingbird, Daily Trip, Just One Step, Little Women, Pride & Prejudice, JVKE-track) — конкретные unlock-моменты конверсии":
    "На подписку конвертирует не каталог в целом, а конкретные записи — например аудиокниги Pride & Prejudice или Little Women",
  "Free-трек глохнет после N прослушиваний и уходит за paywall — счётчик listens вместо честной free-границы":
    "Бесплатный трек перестаёт играть после нескольких прослушиваний — скрытый счётчик загоняет за подписку",
  "Перед home-screen стоит цепочка из 3-10 paywall/share/notification-prompts, обязательная для dismiss":
    "Перед домашним экраном пользователь обязан закрыть 3-10 окон с предложениями подписки и уведомлений",
  "После апдейта 6.93/6.94 Sleep Story зацикливается и перезапускает peppy-интро вместо перехода в soundscape":
    "После последнего обновления сонная история зацикливается и заново играет бодрое вступление вместо перехода в фоновый звук",
  "Playlist-builder требует play-чтобы-add, не даёт reorder/duplicate, и не принимает soundscapes":
    "В свой плейлист нельзя добавить трек не проиграв его, нельзя переставлять и дублировать треки, нельзя добавить фоновые звуки",
  "Top-of-funnel: годы pre-purchase deliberation о цене, return-to-default после sleep-app-shopping, COVID/госпитализация как conversion-trigger":
    "До подписки люди обдумывают цену годами и возвращаются к Calm после сравнения с альтернативами — конвертирует ковид или госпитализация",
  "Streak считается midnight-to-midnight, ломается у sleep-юзеров и trivially gameable пропуском на конец Sleep Story":
    "Серия дней считается по полуночи — у тех кто медитирует перед сном она рвётся, а пропуск на конец сонной истории её сохраняет фейково",
  "Любое прерывание (звонок, app-switch, refresh для AirPods, ротация в landscape) полностью сбрасывает позицию в сессии":
    "Любое прерывание — звонок, переключение приложения, переподключение наушников — сбрасывает медитацию в начало",
  "Lifetime-подписчики получают тот же promo-spam, удалённый контент и просьбу доплатить за add-on, что и monthly":
    "Пожизненная подписка не защищает от рекламного спама и удаления купленного контента — продолжают предлагать доплатить",
  "Поиск возвращает Daily-Calm-шум, игнорирует фильтр длительности и удалён natural-language mood-search":
    "Поиск засорён рекламой текущей Daily Calm, не учитывает фильтр длительности, поиск по настроению удалили",
  "Партнёрские/B2B коды (Kaiser, BCBS-MI, SWEAT, Wells Fargo, employer) не привязываются и блокируют доступ":
    "Коды от работодателя или страховой не активируются — пользователь либо платит из своего кармана, либо вообще не получает доступ",
  "Update-цикл выпиливает базовые контролы: timer на soundscape, sleep-timer-на-playlist, scene visualisation, Sonos, Shortcuts":
    "Каждое обновление убирает базовые функции — таймер на фоновом звуке, sleep-таймер плейлиста, интеграции с Sonos и iOS",
  "Crash-on-launch привязан к конкретной iOS (17.7.1), iPad-build 6.93, iPhone 13/14 Pro Max, Pixel 10":
    "Приложение крашится при запуске на конкретных моделях — iPad на старой iOS, iPhone 13/14 Pro Max, Pixel 10",
  "Power-юзеры строят nightly stack: meditation → story → ambient-mask, требующий seamless handoff":
    "Постоянные пользователи строят ритуал «медитация → сонная история → фон» — между этапами нужны плавные переходы",
  "Аудио-сессия (cricket bed, paused track) выживает stop+kill приложения, лечится только перезагрузкой телефона":
    "Фоновый звук продолжает играть даже после полного закрытия приложения — помогает только перезагрузка телефона",
  "Gift-sub конвертируется в параллельную PayPal-подписку, переживающую Google Play-отмену":
    "Подаренная подписка превращается в параллельную через PayPal и не отменяется через Google Play",
  "Промо «40% off» подсаживает скрытый месячный add-on или сбрасывает Premium до paywall-обрубка":
    "Промо-скидка 40% незаметно подключает платный месячный модуль или урезает уже купленную подписку",
  "Mid-night re-entry (проснулся в 3am, нужно вернуться в сон) — отдельный JTBD от bedtime-onset":
    "Сценарий «проснулся ночью, надо снова заснуть» отдельный от засыпания, и Calm его не закрывает",
  "Конкретная фраза/слово в скрипте narrator («thoughts pass away», «nostril» ×6) выбрасывает пользователя из релакса и триггерит отмену":
    "Конкретная фраза или повторённое слово в скрипте сбивает с расслабления — пример: «мысли исчезают», шестикратное «ноздря»",
  "Нет follow-narrator → notify-on-new-release и series-subscription для «Humphrey/Minor Mysteries/Lionwood»":
    "Нельзя подписаться на любимого рассказчика или серию чтобы получить уведомление о новом эпизоде",
  "Funnel «Calm Sleep» оказывается отдельным приложением/SKU iOS-only с собственным billing — после оплаты выясняется устройство-несовместимость":
    "Calm Sleep оказывается отдельным приложением только для iOS — пользователи Android платят и потом обнаруживают что не могут установить",
  "Нет sub-10-min sleep-meditations, custom-длительности и playback-speed slider для медленной narration":
    "Нет коротких сонных медитаций до 10 минут, нельзя задать свою длительность, и нет регулятора скорости речи",
  "Sleep Stories открываются tough-факт-ремаркой (manatees endangered, AIDS, Malala-trauma) и активируют, а не успокаивают PTSD/trauma-чувствительных":
    "Сонные истории начинаются с травматичной ремарки (вымирающие животные, СПИД, истории Малалы) — это будит, а не успокаивает",
  "«Corporate mindfulness» и productivity-as-mindfulness фрейминг отчуждает анти-productivity и ND/религиозный сегмент":
    "Подача медитации через продуктивность и корпоративный wellness отталкивает тех кто пришёл за духовной практикой",
  "Splash «Take a deep breath» зависает или редиректит в Microsoft Edge на оплаченных аккаунтах":
    "Загрузочный экран «сделай глубокий вдох» зависает или открывает браузер вместо приложения",
  "После каждой медитации форс-survey с задержанной кнопкой close, переживающий force-quit":
    "После каждой медитации появляется опрос с задержанной кнопкой закрытия — не убрать даже перезапуском приложения",
  "Переход «история → ночной soundscape/fade-to-rain» сломан: либо тишина, либо одновременное воспроизведение двух треков":
    "Переход с сонной истории на ночной фон сломан — либо тишина, либо два трека играют одновременно",
  "Autoplay-next после Sleep Story включает peppy/громкий следующий трек игнорируя toggle и будит пользователя":
    "После сонной истории автоматически включается громкий бодрый следующий трек, игнорируя настройку — будит ночью",
  "Нет фильтра «free only», бесплатная поверхность скукоживается до Rain — evaluator не понимает что вообще даром":
    "Нет фильтра «только бесплатное» — без подписки играют только звуки дождя, и непонятно что доступно без оплаты",
  "Реклама/листинг говорят «free» или $X, IAP-чек на $X+tax/forex или иной тир":
    "В рекламе и магазине указана одна цена, при оплате списывается больше — налог, конвертация валюты или другой тариф",
  "Home-экран превратился в discovery-карусель и cross-promo, прячет timer/breathing/courses в Discover→Tools":
    "Главный экран превратился в рекламную карусель — таймер, дыхание и курсы спрятаны в подразделах",
  "Бот-чек/CAPTCHA на регистрации не пропускает живого пользователя и убивает первый запуск":
    "Проверка «я не робот» при регистрации не пропускает реальных пользователей — они удаляют приложение",
  "Контент для острой паники (SOS for anxiety, breathwork) перенесён за paywall — «реклама перед видео CPR»":
    "Срочная помощь при панике и дыхательные упражнения убраны за подписку — пользователи сравнивают с рекламой перед инструкцией по реанимации",
  "Перцепция AI/TTS-озвучки Daily Calm воспринимается как качественный обрыв и pre-purchase trust-fail":
    "Озвучка ежедневной медитации звучит как робот — пользователи думают что Calm заменил живых дикторов и не подписываются",
  "Нет captions/транскриптов, max volume ниже системного, шрифты не подхватывают Dynamic Type":
    "Нет субтитров, максимальная громкость ниже системной, шрифт не подхватывает системные настройки — слабослышащие и слабовидящие отрезаны",
  "Скачанный offline-контент рвётся вечером — приложение перепроверяет лицензию против сервера даже для downloads":
    "Скачанный для офлайна контент перестаёт играть без интернета — приложение проверяет подписку даже когда нет сети",
  "Calm-аудио греет iPhone и жрёт батарею кратно сильнее Apple Music на той же длительности":
    "Calm греет iPhone и сажает батарею в разы сильнее чем Apple Music при той же длительности",
  "Sleep-timer/long-duration-таймер тихо обрезает воспроизведение раньше заявленного (7h → 2-3h)":
    "Sleep-таймер обрезает воспроизведение раньше заданного — заказал 7 часов, играет 2-3",
  "ND/ASD, христианский/евангелический, atheist-cycling сегменты ищут tone-аккомодации, которой нет":
    "Аутисты, верующие и атеисты-практикующие просят гибкости тона медитаций — Calm подаёт только в одном «нейтрально-духовном» стиле",
  "Длинный onboarding-quiz собирает данные для маркетинга, но не персонализирует домашнюю ленту":
    "Долгий приветственный опрос собирает данные для маркетинга, но домашний экран после него не персонализируется",
  "Удаление конкретных треков (Lin-Manuel Miranda, Tanama Lake, Gently Back to Sleep, Liquid Glass, Post Malone) тихо ломает многолетний ритуал":
    "Удаление конкретных треков (Лин-Мануэль Миранда, Tanama Lake, Gently Back to Sleep, Post Malone) тихо ломает многолетний ритуал постоянных пользователей",
  "Музыка/тема из ТВ/IG-рекламы не находится внутри приложения после установки":
    "Музыка или сюжет из рекламы по ТВ или Instagram не находится в приложении после установки",
  "Favorites не подкачиваются заранее и не имеют папок/тегов — flat-список ломает power-user библиотеку":
    "Избранное не кэшируется заранее и не имеет папок или тегов — у кого там много треков получается каша",
  "Background music/ambience в Sleep Stories смикширован громче narration без пользовательского регулятора":
    "Фоновая музыка в сонных историях сведена громче речи рассказчика, и регулятора громкости голоса нет",
  "Sleep Story endings почти никто не слышит — long-tail с dead-air и непрослушанной концовкой":
    "Концовку сонной истории почти никто не слышит — пустая дорожка в конце и непрослушанный финал",
  "Setting-toggle (autoplay, sleep-timer, ad-promo opt-out) игнорируется приложением":
    "Переключатели в настройках (автоплей, sleep-таймер, отключение рекламы) игнорируются приложением",
  "Саппорт умеет только cancel-as-refund, отказывает в restore-service или partial-refund по дубль-оплате":
    "Поддержка умеет только отменять подписку с возвратом денег — не может восстановить доступ или вернуть половину при двойной оплате",
  "Family Plan upgrade/share срабатывает как полная вторая годовая подписка, а не upgrade":
    "Семейная подписка срабатывает как вторая полная годовая, а не как улучшение существующей",
  "Calm не пишет медитации в Google Fit/Apple Watch и не подтягивает обратно sleep-данные":
    "Calm не записывает медитации в Google Fit и Apple Watch и не подтягивает обратно данные сна",
  "In-app feedback и contact-support undiscoverable, ответы идут шаблонами на недели":
    "Кнопки «оставить отзыв» и «связаться с поддержкой» в приложении не найти, ответы шаблонные и идут неделями",
  "Password-reset email тихо не доставляется, и нет человеческой эскалации — годами locked-out":
    "Письмо для сброса пароля просто не приходит, и нет способа достучаться до живого оператора — пользователи годами заблокированы",
  "Нет реверса отмены — те, кто передумал, не могут продолжить подписку без re-subscribe по новой цене":
    "Нет кнопки «отменить отмену» — кто передумал, тот должен подписаться заново по новой цене",
  "Пользователи ставят 5-star с негативным текстом, считая что 1-star скрываются Calm-алгоритмом":
    "Пользователи ставят 5 звёзд с негативным текстом, потому что считают что 1-звёздочные отзывы скрывает алгоритм",
  "Calmling/Humphrey/Mr-sleep-in-the-water — character-IP с merch-спросом (плюшевые), которым не пользуются":
    "Пользователи хотят плюшевые игрушки персонажей сонных историй (Calmling, Humphrey) — спрос есть, мерча нет",
  "Hz/alpha/theta/EMDR-frequency контент — отдельный wellness-сегмент с собственным discovery-сценарием":
    "Контент с частотами и бинауральными ритмами (альфа, тета, EMDR) — отдельный сегмент со своими ожиданиями от поиска",
  "Calm Kids: нет age-range фильтра, adult-юзеры не могут отфильтровать kid-контент из рекомендаций, тин-сегмент 12+ обделён":
    "В Calm Kids нет фильтра по возрасту: взрослым детский контент попадает в рекомендации, а подростки 12+ обделены",
  "Сегмент «just rain + timer» хочет stripped-down альтернативу — feature-сплавл его выдавливает":
    "Сегмент «просто звук дождя плюс таймер» хочет минималистичную альтернативу — Calm их вытесняет своей перегруженностью",
  "Структурный курс (Mindfulness for Beginners, серия Wind-in-the-Willows) не advance-ит к Day 2 и обрывается на полу-серии":
    "Структурный курс не переходит ко дню 2 и обрывается на середине серии",
  "Новые подписчики получают цену ниже, чем grandfathered — renewal-цена loyal-юзеров растёт":
    "Новые подписчики получают цену ниже чем старые — у лояльных пользователей цена при продлении растёт",
  "Google Play data-safety раскрывает sharing «financial information» с третьими сторонами без opt-out":
    "В разделе «безопасность данных» в Google Play указано что финансовые данные передаются третьим сторонам, и отключить это нельзя",
  "Bluetooth-роутинг на наушники/earbuds глючит — неравный volume, обрывы":
    "Воспроизведение в Bluetooth-наушники глючит — разная громкость в ушах, обрывы",
  "Home Screen widget белый в tinted-mode, Shortcuts отвалились — Calm не подхватывает iOS-API уровня widgetAccentable":
    "Виджет Calm на главном экране белый в тонированной теме, iOS Shortcuts отвалились — Calm не подхватывает свежие iOS API",
  "Cold-start медленный, swipe лагает на iPhone 14 Pro Max, app тяжелеет с месяцами и лечится reinstall":
    "Холодный запуск медленный, свайпы лагают на новых iPhone, приложение тяжелеет за месяцы — помогает только переустановка",
  "Insomnia/тиннитус/ND-сегмент хочет no-voice/no-music режим — narration-forward бьёт по anti-fit":
    "Сегмент с бессонницей, тиннитусом и аутизмом хочет режим без речи и без музыки — Calm заточен под обратное и им не подходит",
  "Mood check-in допускает один entry в окно без edit и multi-entry — модель данных rigid":
    "Замер настроения позволяет только одну запись в день, без редактирования и без множественных записей — структура данных слишком жёсткая",
  "Singing-bowl/EMDR трек по таймингу не содержит обещанного контента (пара минут bowl на 30-min трек)":
    "Трек с поющими чашами или EMDR оказывается короче заявленного — в получасовом треке пара минут чаш, остальное другое",
  "Подписка не показывается в Apple Subscriptions, но списания продолжаются — SKU вне Apple IAP pipeline":
    "Подписки нет в списке подписок Apple, а списания продолжаются — Calm оформлен мимо Apple IAP",
  "Конкретный любимый narrator не выпускает новое больше года — content velocity by-narrator стагнирует":
    "Любимый рассказчик не выпускает нового больше года — застой по конкретным голосам",
  "Tech-литературные пользователи ценят support, который НЕ просит reinstall первой репликой (Monica)":
    "Технически грамотные пользователи ценят когда поддержка не начинает с «удалите и переустановите» и благодарят оператора по имени",
  "Shared/household listening: дочь, партнёр, кошка, собака слушают параллельно или к одному устройству":
    "Совместное прослушивание дома: дочь, партнёр, кошка, собака слушают параллельно или с одного устройства",
  "Calm позиционируется пользователями как substitute для cognitive therapy и prescription sleep meds — healthcare-economics talking point":
    "Пользователи описывают Calm как замену психотерапии и снотворному по рецепту — экономический аргумент для системы здравоохранения",
  "In-app микрокопия (empty-state «use playlist button») ссылается на отсутствующие в UI элементы":
    "Подсказки в приложении ссылаются на кнопки и элементы которых в интерфейсе нет",
  "Видео в Daily Move/Moment of Calm сломано одновременно на Android и Windows 11 — серверная регрессия pipeline":
    "Видео в разделах Daily Move и Moment of Calm сломаны одновременно на Android и Windows 11 — серверная регрессия",
  "TV/IG-реклама Calm не раскрывает subscription cost — install-моментально нарушает free-product expectation":
    "Реклама Calm по ТВ и в Instagram не сообщает что нужна подписка — после установки пользователь ожидает что приложение бесплатное",
  "Бренд calmness повышает планку: глитч/upsell в Calm раздражает сильнее, чем тот же глитч в чужом приложении":
    "Бренд «спокойствие» завышает планку — глюки и навязчивые предложения в Calm раздражают сильнее чем те же в любом другом приложении",
  "Lucid-dreaming и снижение nightmare/bad-dreams — неожиданный side-outcome Calm-юзеров":
    "Осознанные сны и уменьшение кошмаров — неожиданный побочный эффект который замечают пользователи",
  "Приложение крашится посреди медитации (Bluetooth dropouts, generic crash) — continuous-audio core ломается годами":
    "Приложение крашится посреди медитации — Bluetooth отваливается, обычный краш — фундамент непрерывного аудио ломается годами",
  "Sticker $79.99 → фактический charge $84.79 (tax/forex/price-hike at renewal) — формально не bait-and-switch, но триггерит fraud-обвинения":
    "На ценнике $79.99, в чеке $84.79 — налог, конвертация валюты или поднятие цены при продлении — формально не обман, но пользователи воспринимают как мошенничество",
};

// ── IO ───────────────────────────────────────────────────────────────────
const rawCluster = readFileSync(`cluster/out/${PRODUCT_ID}.json`, "utf8");
const stripped = rawCluster.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
const cluster = JSON.parse(stripped) as ClusterOutput;
if (!cluster.clusters || !Array.isArray(cluster.clusters)) {
  throw new Error("cluster output missing 'clusters' array");
}

const obsData = JSON.parse(readFileSync(`data/${PRODUCT_ID}-observations.json`, "utf8")) as { flat: Observation[] };
// cluster-prep filters out commodity observations; cluster obs_ids index that filtered list.
const flatNonCommodity = obsData.flat.filter((o) => !o.is_commodity);

const reviews = JSON.parse(readFileSync(`data/${PRODUCT_ID}-filtered.json`, "utf8")) as Review[];
const reviewById = new Map(reviews.map((r) => [r.externalId, r]));

const reviewsScanned = reviews.length;
const ratingBreakdown: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
for (const r of reviews) ratingBreakdown[String(r.rating)]++;

// ── Quote extraction ──────────────────────────────────────────────────────
// For each observation, locate its trigger inside the source review and grab
// the surrounding sentence(s) for context. Caps the displayed quote at ~320
// chars so long reviews don't dominate the modal.
function quoteForObservation(o: Observation): { rating: number; date: string; reviewId: string; quote: string } {
  const review = reviewById.get(o.review_id);
  const date = review?.postedAt ? review.postedAt.slice(0, 10) : "";
  let quote = o.trigger;
  if (review) {
    const cleanText = review.text.replace(/\s+/g, " ").trim();
    const idx = cleanText.toLowerCase().indexOf(o.trigger.toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, cleanText.lastIndexOf(". ", idx) + 1);
      const endHint = cleanText.indexOf(". ", idx + o.trigger.length);
      const end = endHint > 0 ? endHint + 1 : Math.min(cleanText.length, idx + o.trigger.length + 200);
      quote = cleanText.slice(start, end).trim();
      if (quote.length > 320) quote = quote.slice(0, 317).trimEnd() + "…";
    }
  }
  return { rating: o.rating, date, reviewId: o.review_id, quote };
}

function buildEvidence(obsIds: number[]) {
  const observations = obsIds.map((i) => flatNonCommodity[i]).filter((o): o is Observation => o != null);

  // Per source review keep only the highest-specificity observation (so we
  // don't show two near-identical quotes from the same person). All remaining
  // observations turn into quotes — the modal scrolls.
  const bestPerReview = new Map<string, Observation>();
  const specScore = (o: Observation) => (o.specificity === "high" ? 3 : o.specificity === "medium" ? 2 : 1);
  for (const o of observations) {
    const prev = bestPerReview.get(o.review_id);
    if (!prev || specScore(o) > specScore(prev) || o.trigger.length > prev.trigger.length) {
      bestPerReview.set(o.review_id, o);
    }
  }

  // Sort by specificity desc, then by rating asymmetry (extreme ★ first), then by date desc.
  const sorted = [...bestPerReview.values()].sort((a, b) => {
    const s = specScore(b) - specScore(a);
    if (s !== 0) return s;
    const extremeA = Math.abs(a.rating - 3);
    const extremeB = Math.abs(b.rating - 3);
    return extremeB - extremeA;
  });

  return sorted.map(quoteForObservation);
}

// ── Build & write ─────────────────────────────────────────────────────────
const sortedClusters = [...cluster.clusters].sort(
  (a, b) => b.observation_ids.length - a.observation_ids.length,
);

const insights = sortedClusters.map((c) => ({
  id: c.id,
  category: "strategic" as const,
  title: REWRITES[c.title] ?? c.title,
  story: "",
  who: [],
  featureArea: "",
  novelty: c.novelty,
  evidence: buildEvidence(c.observation_ids),
  observationCount: c.observation_ids.length,
  theme: THEMES[c.id],
  implies: "",
}));

const allInsights = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Record<string, unknown>[];
const idx = allInsights.findIndex((p) => p.productId === PRODUCT_ID);
const next = {
  productId: PRODUCT_ID,
  reviewsScanned,
  ratingBreakdown,
  pipeline: "qualitative extraction · последние 90 дней · 1-5★",
  asOf: new Date().toISOString().slice(0, 10),
  sampleSize: reviewsScanned,
  insights,
  personaPatterns: [],
  commodityBaseline: [],
};

if (idx >= 0) allInsights[idx] = next;
else allInsights.push(next);

writeFileSync("src/data/insights.json", JSON.stringify(allInsights, null, 2));

const missing = sortedClusters.filter((c) => !REWRITES[c.title]);
const noTheme = insights.filter((i) => !i.theme);
console.log(`built ${insights.length} insights from ${sortedClusters.length} clusters (no trim)`);
console.log(`evidence quotes per insight: avg ${(insights.reduce((s, i) => s + i.evidence.length, 0) / insights.length).toFixed(1)}, max ${Math.max(...insights.map((i) => i.evidence.length))}`);
console.log(`reviewsScanned: ${reviewsScanned}, distribution: ${Object.entries(ratingBreakdown).map(([k, v]) => `${k}★=${v}`).join(" ")}`);

const byTheme: Record<string, number> = {};
for (const i of insights) byTheme[i.theme ?? "<no theme>"] = (byTheme[i.theme ?? "<no theme>"] ?? 0) + 1;
console.log(`themes:`, byTheme);

if (missing.length > 0) {
  console.log(`\nWARN: ${missing.length} clusters have no title rewrite:`);
  for (const m of missing) console.log(`  · ${m.title}`);
}
if (noTheme.length > 0) {
  console.log(`\nWARN: ${noTheme.length} clusters have no theme — fix THEMES map in scripts/calm-assemble.ts:`);
  for (const i of noTheme) console.log(`  · ${i.id} : ${i.title}`);
}
