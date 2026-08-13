#!/usr/bin/env node

// Recover high-confidence, app-specific themes from the honest fallback bucket.
// Rules are intentionally narrow and reviewable: a false negative stays in the
// fallback, while a false positive would pollute the product insight.

import fs from "node:fs";

const APPLY = process.argv.includes("--apply");
const INDEX_PATH = "src/data/reviewsIndex.json";
const MIN_REVIEWS_PER_THEME = 8;
const FALLBACK_NAMES = new Set([
  "общая положительная оценка",
  "смешанная оценка без конкретной причины",
  "негативный опыт без конкретной причины",
]);

const positive = (rating) => rating >= 4;

const RULES = {
  "faith-prayer-bible/6744045288": [
    {
      id: "prayer-support",
      name: "молитвы помогают сохранять ежедневную связь с верой",
      nameEn: "prayers support a daily connection with faith",
      polarity: "love",
      rating: positive,
      pattern: /\b(prayer|prayers|pray|praying)\b/i,
    },
    {
      id: "spiritual-guidance",
      name: "библейские тексты дают духовное наставление и поддержку",
      nameEn: "Bible passages provide spiritual guidance and support",
      polarity: "love",
      rating: positive,
      pattern: /\b(spiritual|scripture|god'?s? word|the word|closer to god|close to god|faith|lord|jesus|devotion(?:al)?|inspirational|biblical)\b/i,
    },
    {
      id: "easy-bible-learning",
      name: "простое чтение помогает лучше понимать и изучать библию",
      nameEn: "easy reading makes the Bible easier to learn and understand",
      polarity: "love",
      rating: positive,
      pattern: /\b(easy (?:to )?(?:read|understand)|understand(?:ing)? better|learn(?:ing)?|teach(?:ing)?|bible study|daily (?:reading|verse))\b/i,
    },
  ],
  "ai-avatars-headshots/1559859897": [
    {
      id: "subscription-extra-coins",
      name: "после подписки всё равно приходится покупать монеты",
      nameEn: "coins still cost extra after subscribing",
      polarity: "pain",
      pattern: /(?:subscription|subscribed|paid|pay).{0,90}(?:coins?|credits?|again|extra|still|shouldn'?t|watermark|logo|won'?t|doesn'?t|cannot|can'?t)|(?:coins?|credits?).{0,90}(?:subscription|subscribed|paid|pay)/i,
    },
    {
      id: "realistic-face-swap",
      name: "подстановка лица выглядит реалистично и узнаваемо",
      nameEn: "face swaps look realistic and recognizable",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:realistic|so real|looks? (?:just )?like me|recogniz(?:e|es|ed).*face|face.*(?:accurate|perfect|best)|regenerates? (?:my|your) face|results? (?:look|are) (?:real|great|good))\b/i,
    },
    {
      id: "template-variety",
      name: "много шаблонов и вариантов для фото и видео",
      nameEn: "many photo and video templates to choose from",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:many|lots? of|so many|variety of|different) (?:options?|templates?|styles?|looks?|videos?|effects?)\b|\b(?:options?|templates?|styles?|selections?) to choose from\b/i,
    },
    {
      id: "easy-face-editing",
      name: "фото и видео легко создавать без сложных настроек",
      nameEn: "photos and videos are easy to create without complex setup",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|easy to work|simple to use|user[ -]?friendly|seamless)\b/i,
    },
  ],
  "ai-companion-roleplay/6752631485": [
    {
      id: "coins-limit-messages",
      name: "сообщения расходуют дорогие монеты",
      nameEn: "messages consume expensive coins",
      polarity: "mixed",
      pattern: /\b(?:coins?|points?)\b|\b(?:pay|cost|expensive|grind).{0,50}(?:chat|messages?|stories?)\b|\bmessages? (?:aren'?t|are not) unlimited\b/i,
    },
    {
      id: "detailed-chat-memory",
      name: "чат подробно продолжает сюжет и помнит контекст",
      nameEn: "chat continues stories in detail and remembers context",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:good|great|long|detailed|detail).{0,60}(?:memory|story ?line|stories|chat)\b|\b(?:memory|story ?line).{0,60}(?:good|great|detailed|remembers?)\b/i,
    },
  ],
  "ai-companion-roleplay/6480179119": [
    {
      id: "realistic-conversations",
      name: "диалоги ощущаются реалистичными и вовлекающими",
      nameEn: "conversations feel realistic and engaging",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:conversation|chat|talk(?:ing)?).{0,70}(?:real|realistic|engaging|natural)\b|\b(?:real|realistic|engaging|natural).{0,70}(?:conversation|chat)\b/i,
    },
    {
      id: "generated-photos",
      name: "пользователи хотят создавать и получать новые фото персонажей",
      nameEn: "users want to generate and receive new character photos",
      polarity: "mixed",
      pattern: /\b(?:pictures?|photos?|images?).{0,80}(?:send|ask|generate|new|feature|removed|wish|hotter)|(?:send|ask|generate|new|removed|wish).{0,80}(?:pictures?|photos?|images?)\b/i,
    },
  ],
  "ai-companion-roleplay/6740697303": [
    {
      id: "rewarded-coins-run-out",
      name: "монеты расходуются на сообщения и выдаются за активности",
      nameEn: "coins gate messages and are earned through activities",
      polarity: "mixed",
      pattern: /\b(?:coins?|rewards?|points?)\b/i,
    },
  ],
  "period-cycle/318894849": [
    {
      id: "tracking-paywall",
      name: "часть параметров отслеживания закрыта оплатой",
      nameEn: "some tracking options are locked behind payment",
      polarity: "pain",
      pattern: /(?:pay|paid|charge|subscription|free).{0,90}(?:track|feature|everything|option)|(?:track|feature|everything|option).{0,90}(?:pay|paid|charge|subscription)/i,
    },
    {
      id: "cycle-tracking",
      name: "цикл и фертильные дни удобно держать под контролем",
      nameEn: "cycles and fertile days are easy to keep track of",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:track(?:er|ing)?|monitor|predict).{0,60}(?:period|cycle|menstrual|fertile)|(?:period|cycle|menstrual|fertile).{0,60}(?:track|monitor|predict)\b/i,
    },
    {
      id: "health-context",
      name: "история цикла помогает обсуждать здоровье с врачом",
      nameEn: "cycle history helps with health and doctor conversations",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:doctor|dr\.?|perimenopause|postpartum|iud|fertility|trying to conceive|pregnan(?:t|cy))\b/i,
    },
    {
      id: "body-symptom-insights",
      name: "дневник симптомов помогает лучше понимать тело",
      nameEn: "symptom logging helps users understand their body",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:symptoms?|body|moods?|cramps?|flow|intimate|health).{0,80}(?:track|understand|insight|help|log)|(?:track|understand|insight|help|log).{0,80}(?:symptoms?|body|moods?|cramps?|flow|health)\b/i,
    },
  ],
  "white-noise-sleep-sounds/762004969": [
    {
      id: "playback-and-upgrade-issues",
      name: "воспроизведение и оплаченный апгрейд иногда не работают",
      nameEn: "playback and paid upgrades sometimes fail",
      polarity: "pain",
      pattern: /\b(?:air ?play|paid|upgrade|purchase).{0,90}(?:not|doesn'?t|won'?t|cannot|can'?t|stop|fail|acknowledge)|(?:stop|fail).{0,70}(?:playing|sound|timer)\b/i,
    },
    {
      id: "fall-asleep-faster",
      name: "звуки помогают быстрее уснуть и спать спокойнее",
      nameEn: "sounds help people fall asleep faster and sleep peacefully",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:fall(?:ing)? asleep|puts? (?:me|us|my .*?) to sleep|sleep better|can'?t sleep without|helps? (?:me|us|my .*?)?sleep|peaceful sleep)\b/i,
    },
    {
      id: "kids-sleep-routine",
      name: "звуки помогают укладывать детей спать",
      nameEn: "sounds help children settle down to sleep",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:kids?|children|baby|babies|grandchildren|grandkids).{0,100}(?:sleep|bed|night|lull)|(?:sleep|bed|night).{0,100}(?:kids?|children|baby|babies|grandchildren|grandkids)\b/i,
    },
    {
      id: "sound-variety-and-mixes",
      name: "большой выбор звуков можно комбинировать под себя",
      nameEn: "a wide sound selection can be mixed to taste",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:variety|many|lots? of|choose|mix|combination|create).{0,80}(?:sounds?|noise)|(?:sounds?|noise).{0,80}(?:variety|choose|mix|combination)\b/i,
    },
    {
      id: "nightly-long-term-use",
      name: "приложение становится многолетним вечерним ритуалом",
      nameEn: "the app becomes a long-term nightly ritual",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:every night|for years|many years|since 20\d\d|long[ -]?time).{0,90}(?:sleep|sound|app|use)|(?:sleep|sound|app|use).{0,90}(?:every night|for years|many years|since 20\d\d|long[ -]?time)\b/i,
    },
    {
      id: "sleep-timer",
      name: "таймер автоматически завершает ночное воспроизведение",
      nameEn: "a timer automatically ends nighttime playback",
      polarity: "love",
      rating: positive,
      pattern: /\btimer\b/i,
    },
  ],
  "sleep-tracking/762004969": [
    {
      id: "fall-asleep-faster",
      name: "звуки помогают быстрее уснуть и спать спокойнее",
      nameEn: "sounds help people fall asleep faster and sleep more peacefully",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:fall(?:ing)? asleep|puts? (?:me|us|my .*?) to sleep|sleep better|can'?t sleep without|helps? (?:me|us|my .*?)?sleep|sleeping soundly|peaceful sleep|good night'?s sleep)\b/i,
    },
    {
      id: "calm-and-relax",
      name: "успокаивающие звуки снимают напряжение и помогают расслабиться",
      nameEn: "soothing sounds reduce tension and help people relax",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:calm(?:ing|s|ed)?|relax(?:ing|ation|ed|es)?|sooth(?:ing|es|ed)?|serenity|peaceful|comforting)\b/i,
    },
    {
      id: "mask-background-noise",
      name: "белый шум маскирует храп, соседей и другие помехи",
      nameEn: "white noise masks snoring, neighbors and other distractions",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:drown(?:s|ed|ing)? out|block(?:s|ed|ing)? out|mask(?:s|ed|ing)?|noisy (?:neighbor|next door)|snoring|background noise|outside noise)\b/i,
    },
    {
      id: "long-term-nightly-use",
      name: "приложение становится многолетним вечерним ритуалом",
      nameEn: "the app becomes a long-term nightly ritual",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:every night|nightly|for (?:over )?(?:\d+|many|several) years?|since 20\d\d|years? now|long[ -]?time (?:user|listener))\b/i,
    },
    {
      id: "free-core-value",
      name: "бесплатного набора звуков хватает для постоянного использования",
      nameEn: "the free sound set is sufficient for regular use",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:free (?:app|version|sounds?)|free and simple|without (?:having to )?pay|no subscription|don['’]?t (?:need|have) to pay)\b/i,
    },
    {
      id: "sound-library-paywall",
      name: "значительная часть библиотеки звуков закрыта оплатой",
      nameEn: "a large part of the sound library is locked behind payment",
      polarity: "pain",
      rating: (rating) => rating <= 3,
      pattern: /(?:pay|paid|subscription|locked|free).{0,80}(?:sounds?|levels?|options?|everything)|(?:sounds?|levels?|options?|everything).{0,80}(?:pay|paid|subscription|locked|free)/i,
    },
    {
      id: "favorite-natural-sounds",
      name: "реалистичные природные звуки позволяют найти личный фон для сна",
      nameEn: "realistic nature sounds let people find a personal sleep backdrop",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:ocean|rain|storm|river|brook|forest|fire|brown noise|white noise|airplane|turbine).{0,90}(?:sound|realistic|favorite|love|sleep|perfect|best)|(?:favorite|love|realistic|perfect|best).{0,90}(?:ocean|rain|storm|river|brook|forest|fire|brown noise|white noise)\b/i,
    },
  ],
  "period-cycle/896501514": [
    {
      id: "cycle-tracking",
      name: "прогноз цикла помогает заранее подготовиться к месячным",
      nameEn: "cycle predictions help users prepare for their period",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:track(?:er|ing)?|predict|remember).{0,60}(?:period|cycle|menstrual)|(?:period|cycle|menstrual).{0,60}(?:track|predict|remember)\b/i,
    },
    {
      id: "long-term-history",
      name: "многолетняя история цикла сохраняется при смене телефона",
      nameEn: "years of cycle history survive phone changes",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:for|over|using (?:it )?for) (?:\d+|many|several|a few) years?\b|\bsince 20\d\d\b|\b(?:new phone|transfer(?:s|red)?|backup|data).{0,60}(?:years?|history|information)\b/i,
    },
    {
      id: "body-symptom-insights",
      name: "симптомы и подсказки помогают лучше понимать тело",
      nameEn: "symptoms and guidance help users understand their body",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:symptoms?|body|moods?|cramps?|flow|headache|tips?|information).{0,80}(?:understand|learn|help|track|log)|(?:understand|learn|help|track|log).{0,80}(?:symptoms?|body|moods?|cramps?|flow|headache)\b/i,
    },
    {
      id: "useful-without-subscription",
      name: "основные функции доступны без подписки",
      nameEn: "core features remain useful without a subscription",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:without (?:having to )?pay|without (?:a )?subscription|don'?t have to pay|free version|no subscription)\b/i,
    },
  ],
  "ai-companion-roleplay/6477287266": [
    {
      id: "sexual-content",
      name: "откровенный сексуальный контент вызывает смешанную реакцию",
      nameEn: "explicit sexual content draws mixed reactions",
      polarity: "mixed",
      pattern: /\b(?:sexy|sexual|nsfw|adult|nude|naked|cock|kids? play|not for kids)\b/i,
    },
    {
      id: "character-variety",
      name: "есть выбор разных персонажей для общения",
      nameEn: "there is a varied selection of characters to chat with",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:characters?|girls?|women|waifu).{0,70}(?:variety|selection|different|interactive|beautiful|chat)|(?:variety|selection|different).{0,70}(?:characters?|girls?|women|waifu)\b/i,
    },
    {
      id: "interactive-chat",
      name: "чат с персонажами ощущается интерактивным",
      nameEn: "character chat feels interactive",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:chat|conversation).{0,70}(?:amazing|good|interactive|well done|well versed)|(?:interactive).{0,70}(?:chat|game|characters?)\b/i,
    },
  ],
  "ai-avatars-headshots/6472172759": [
    {
      id: "face-accuracy-issues",
      name: "иногда результат перестаёт быть похожим на исходное лицо",
      nameEn: "results sometimes stop resembling the original face",
      polarity: "pain",
      rating: (rating) => rating <= 3,
      pattern: /\b(?:face|faces|accuracy|look).{0,70}(?:wrong|not right|needs? work|doesn'?t|does not|isn'?t|is not|accuracy)|(?:doesn'?t|does not|isn'?t|is not).{0,70}(?:face|look like)\b/i,
    },
    {
      id: "accurate-face-results",
      name: "генерация сохраняет узнаваемые черты лица",
      nameEn: "generation preserves recognizable facial features",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:face|faces).{0,70}(?:right|accurate|like me|look like|realistic|perfect)|(?:accurate|realistic).{0,70}(?:face|photo|result)\b/i,
    },
    {
      id: "themed-photo-shoots",
      name: "готовые фотосессии подходят для праздников и образов",
      nameEn: "ready-made photo shoots work for occasions and outfits",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:photo ?shoots?|birthday|gala|wedding|outfits?|special occasions?)\b/i,
    },
    {
      id: "photo-effects",
      name: "эффекты и улучшение быстро меняют исходное фото",
      nameEn: "effects and enhancement quickly transform a source photo",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:enhanc(?:e|ed|ement)|clear an image|effects?|filters?|cartoon)\b/i,
    },
  ],
  "ai-photo-restore/1470373330": [
    {
      id: "fast-photo-clarity",
      name: "улучшение быстро возвращает фотографиям чёткость",
      nameEn: "enhancement quickly restores clarity to photos",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:enhanc(?:e|ed|er|ing|ement)|clear(?:ing|ed)?|sharpen|quality).{0,80}(?:photo|picture|image|result)|(?:photo|picture|image).{0,80}(?:enhanc|clear|sharp|quality)\b/i,
    },
  ],
  "translator/414706506": [
    {
      id: "wide-language-coverage",
      name: "широкий выбор языков выигрывает у системных переводчиков",
      nameEn: "broad language coverage beats built-in translators",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:more|many|all|hundreds? of|thousand) languages?|languages?.{0,70}(?:available|listed|offers?|supports?|choice|selection)|(?:offers?|supports?|has).{0,70}(?:more|many|all).{0,30}languages?\b/i,
    },
    {
      id: "missing-languages-dialects",
      name: "пользователи просят добавить недостающие языки и диалекты",
      nameEn: "users ask for missing languages and dialects",
      polarity: "mixed",
      pattern: /\b(?:add|include|support|need|missing|doesn'?t have|does not have|not (?:one of the|on the (?:list|app))).{0,90}(?:languages?|dialects?)|(?:languages?|dialects?).{0,90}(?:add|include|support|missing|unavailable|not offered)\b/i,
    },
    {
      id: "voice-input-playback-fails",
      name: "микрофон и озвучивание перевода периодически не работают",
      nameEn: "voice input and spoken translation intermittently fail",
      polarity: "pain",
      rating: (rating) => rating <= 3,
      pattern: /\b(?:microphone|speaker|spoken translation|voice|transcription).{0,90}(?:doesn'?t work|does not work|not work|stopped|no longer|fails?|freez|cuts? off|won'?t|will not)|(?:doesn'?t work|does not work|not work|stopped|no longer|fails?|freez|cuts? off|won'?t|will not).{0,90}(?:microphone|speaker|spoken translation|voice|transcription)\b/i,
    },
    {
      id: "redesign-added-friction",
      name: "новый интерфейс добавил лишние шаги и сломал привычный сценарий",
      nameEn: "the redesigned interface added steps and broke familiar workflows",
      polarity: "pain",
      rating: (rating) => rating <= 3,
      pattern: /\b(?:new|latest|recent|last) update|\b(?:interface|redesign|ui).{0,80}(?:worse|harder|extra steps?|not work|doesn'?t work|hate|frustrat)|(?:worse|harder|extra steps?|not work|doesn'?t work).{0,80}(?:interface|update|redesign|ui)\b/i,
    },
    {
      id: "missing-audio-pronunciation",
      name: "для части языков нет нормального озвучивания и произношения",
      nameEn: "some languages lack usable audio and pronunciation",
      polarity: "pain",
      pattern: /\b(?:no|missing|without).{0,70}(?:sound|audio|voice|pronunci)|(?:sound|audio|voice|pronunci).{0,70}(?:not|missing|doesn'?t|isn'?t|unavailable)\b/i,
    },
    {
      id: "live-travel-translation",
      name: "голосовой перевод в реальном времени помогает в поездках",
      nameEn: "real-time voice translation helps while traveling",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:travel|trip|abroad|real[ -]?time|talk to text|conversation).{0,100}(?:translate|translation|language|voice|messages?)|(?:translate|translation).{0,100}(?:travel|trip|abroad|real[ -]?time|talk to text|conversation)\b/i,
    },
  ],
  "translator/1350347947": [
    {
      id: "camera-text-access",
      name: "камера переводит вывески, книги и скриншоты без ручного ввода",
      nameEn: "the camera translates signs, books and screenshots without retyping",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:photo|picture|camera|screenshot|image|signs?|books?).{0,100}(?:translat|read|understand|language|text)|(?:translat|read|understand).{0,100}(?:photo|picture|camera|screenshot|image|signs?|books?)\b/i,
    },
    {
      id: "study-and-travel",
      name: "перевод с фото помогает в учёбе и поездках",
      nameEn: "photo translation helps with studying and travel",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:school|class|assignment|homework|test|study|travel|trip|vacation|overseas|abroad).{0,110}(?:translat|language|read|understand|help)|(?:translat|language|read|understand).{0,110}(?:school|class|assignment|homework|test|study|travel|trip|vacation|overseas|abroad)\b/i,
    },
    {
      id: "fast-easy-photo-translation",
      name: "перевод с камеры запускается быстро и без сложной настройки",
      nameEn: "camera translation is fast and easy to start",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|simple to use|easy and fast|quick(?:ly)?|in (?:a )?second|efficient).{0,90}(?:app|translat|result|photo|camera)|(?:app|translat|result|photo|camera).{0,90}(?:easy to use|simple to use|easy and fast|quick(?:ly)?|in (?:a )?second|efficient)\b/i,
    },
  ],
  "yoga/471786434": [
    {
      id: "teacher-sequence-planning",
      name: "преподаватели быстро собирают последовательности для занятий",
      nameEn: "teachers quickly build sequences for their classes",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:teacher|instructor|classes?).{0,100}(?:sequence|flow|create|design|plan)|(?:sequence|flow|create|design).{0,100}(?:teacher|instructor|classes?)\b/i,
    },
    {
      id: "custom-practice-builder",
      name: "собственную практику легко собрать под свои задачи",
      nameEn: "custom practices are easy to build around personal needs",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:create|design|build|put together|make).{0,80}(?:practice|routine|sequence|flow)|(?:practice|routine|sequence|flow).{0,80}(?:create|design|build|put together|make)\b/i,
    },
  ],
  "faith-prayer-bible/6503184925": [
    {
      id: "scripture-learning",
      name: "изучение писания расширяет знания и понимание библии",
      nameEn: "scripture study expands Bible knowledge and understanding",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:learn|study|understand|knowledge).{0,90}(?:bible|scripture|word|god)|(?:bible|scripture|god'?s? word).{0,90}(?:learn|study|understand|knowledge)\b/i,
    },
  ],
  "faith-prayer-bible/844280857": [
    {
      id: "daily-prayer-discipline",
      name: "приложение помогает поддерживать ежедневную молитвенную практику",
      nameEn: "the app helps sustain a daily prayer practice",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:daily|every day|each day|daily routine|daily companion).{0,90}(?:prayer|practice|meditat|app|discipline)|(?:prayer|practice|meditat).{0,90}(?:daily|every day|each day|routine|discipline)\b/i,
    },
    {
      id: "calm-simple-format",
      name: "простой минималистичный формат не отвлекает от молитвы",
      nameEn: "a simple minimalist format keeps the focus on prayer",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:simple|simplicity|minimalist|easy to use|straightforward)\b/i,
    },
  ],
  "driving-test-prep/1469368096": [
    {
      id: "test-confidence",
      name: "практика даёт уверенность перед экзаменом в DMV",
      nameEn: "practice builds confidence before the DMV exam",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:confiden(?:t|ce)|prepar(?:e|ed|ation)|ready).{0,80}(?:test|exam|dmv|permit)|(?:test|exam|dmv|permit).{0,80}(?:confiden(?:t|ce)|prepar(?:e|ed|ation)|ready)\b/i,
    },
    {
      id: "simple-study-flow",
      name: "простая и организованная подача облегчает подготовку",
      nameEn: "a simple organized flow makes studying easier",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|simple (?:to use|and)|clean cut|organized)\b/i,
    },
  ],
  "guitar-tuner-learn/1239265318": [
    {
      id: "learn-favorite-songs",
      name: "любимые песни и аккорды удобно разбирать на гитаре",
      nameEn: "favorite songs and chords are easy to learn on guitar",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:learn|play|practice).{0,80}(?:songs?|chords?|covers?)|(?:songs?|chords?|covers?).{0,80}(?:learn|play|practice)\b/i,
    },
  ],
  "translator/288113403": [
    {
      id: "fast-easy-translation",
      name: "перевод запускается быстро и не требует обучения интерфейсу",
      nameEn: "translation is fast and the interface is easy to learn",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|simple to use|user[ -]?friendly|easy and fast|fast (?:response|translation))\b/i,
    },
  ],
  "ai-species-identifier/1474578078": [
    {
      id: "mushroom-learning",
      name: "описания помогают изучать грибы и развивать знания о микологии",
      nameEn: "descriptions help users learn about mushrooms and mycology",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:learn|learning|knowledge|educat(?:e|ion|ional)|informative|information).{0,90}(?:mushrooms?|fungi|mycology|species|app)|(?:mushrooms?|fungi|mycology).{0,90}(?:learn|knowledge|educat|informative|information)\b/i,
    },
  ],
  "tarot-reading/601300777": [
    {
      id: "learn-card-meanings",
      name: "понятные толкования помогают новичкам изучать значения карт",
      nameEn: "clear interpretations help beginners learn card meanings",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:beginner|learn|learning|understand|explanations?|interpretations?|course).{0,90}(?:tarot|cards?|meanings?|reading)|(?:tarot|cards?|meanings?|reading).{0,90}(?:beginner|learn|understand|explanations?|interpretations?|course)\b/i,
    },
  ],
  "period-cycle/1485208453": [
    {
      id: "simple-cycle-logging",
      name: "цикл легко отмечать в простом понятном интерфейсе",
      nameEn: "cycle logging is easy in a simple, clear interface",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|simple to use|super simple|simplicity|easy to track|simple and easy)\b/i,
    },
  ],
  "faith-prayer-bible/411970514": [
    {
      id: "study-resource-library",
      name: "большая библиотека объединяет материалы для серьёзного изучения библии",
      nameEn: "a large library brings serious Bible study resources together",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:resources?|library|content|modules?|commentar(?:y|ies)|reference).{0,90}(?:bible|study|accordance|one place|available)|(?:bible|study|accordance).{0,90}(?:resources?|library|content|modules?|commentar(?:y|ies)|reference)\b/i,
    },
    {
      id: "intuitive-mobile-study",
      name: "мобильное изучение библии остаётся простым и интуитивным",
      nameEn: "mobile Bible study remains simple and intuitive",
      polarity: "love",
      rating: positive,
      pattern: /\b(?:easy to use|simple to use|user[ -]?friendly|intuitive|natural).{0,80}(?:app|accordance|ios|ipad|software|look up|study)|(?:app|accordance|ios|ipad|software).{0,80}(?:easy to use|user[ -]?friendly|intuitive)\b/i,
    },
  ],
};

const index = JSON.parse(fs.readFileSync(INDEX_PATH, "utf8"));
const report = [];
let changedApps = 0;
let changedReviews = 0;

for (const [key, rules] of Object.entries(RULES)) {
  const [slug, id] = key.split("/");
  const app = index[slug]?.apps.find((candidate) => String(candidate.id) === id);
  const path = `public/reviews/${slug}/${id}.json`;
  if (!app || !fs.existsSync(path)) throw new Error(`Missing app ${key}`);

  const detail = JSON.parse(fs.readFileSync(path, "utf8"));
  const counts = new Map();
  const samples = new Map();
  for (const rule of rules) {
    counts.set(rule.id, 0);
    samples.set(rule.id, []);
  }

  const candidates = [];
  for (const review of detail.reviews) {
    if (!FALLBACK_NAMES.has(review.theme)) continue;
    const rule = rules.find((candidate) => (!candidate.rating || candidate.rating(review.rating)) && candidate.pattern.test(review.text));
    if (!rule) continue;
    candidates.push({ review, rule });
    counts.set(rule.id, counts.get(rule.id) + 1);
    if (samples.get(rule.id).length < 2) samples.get(rule.id).push(review.text.slice(0, 160));
  }
  const activeRuleIds = new Set(
    [...counts.entries()].filter(([, count]) => count >= MIN_REVIEWS_PER_THEME).map(([ruleId]) => ruleId),
  );
  for (const { review, rule } of candidates) {
    if (!activeRuleIds.has(rule.id)) continue;
    review.theme = rule.name;
    changedReviews++;
  }

  const themeMeta = new Map(detail.themes.map((theme) => [theme.name, { ...theme, count: 0 }]));
  let metadataChanged = false;
  for (const rule of rules) {
    const existing = themeMeta.get(rule.name);
    if (existing) {
      if (existing.nameEn !== rule.nameEn || existing.polarity !== rule.polarity) metadataChanged = true;
      themeMeta.set(rule.name, { ...existing, nameEn: rule.nameEn, polarity: rule.polarity });
      continue;
    }
    if (!activeRuleIds.has(rule.id)) continue;
    themeMeta.set(rule.name, {
      name: rule.name,
      nameEn: rule.nameEn,
      polarity: rule.polarity,
      count: 0,
    });
  }
  for (const review of detail.reviews) {
    const theme = themeMeta.get(review.theme);
    if (!theme) throw new Error(`${key}: review points to missing theme ${review.theme}`);
    theme.count++;
  }
  detail.themes = [...themeMeta.values()]
    .filter((theme) => theme.count > 0)
    .sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count);

  const added = [...counts.entries()].filter(([ruleId]) => activeRuleIds.has(ruleId));
  if (added.length || metadataChanged) {
    changedApps++;
    app.themes = detail.themes;
    report.push(
      ...added.map(([ruleId, count]) => {
        const rule = rules.find((candidate) => candidate.id === ruleId);
        return { app: detail.title, theme: rule.name, reviews: count, samples: samples.get(ruleId) };
      }),
    );
    if (APPLY) fs.writeFileSync(path, JSON.stringify(detail));
  }
}

if (APPLY && changedApps) fs.writeFileSync(INDEX_PATH, JSON.stringify(index, null, 1));

console.log({ mode: APPLY ? "apply" : "dry-run", changedApps, changedReviews, newThemes: report.length });
console.table(report.map(({ app, theme, reviews }) => ({ app, theme, reviews })));
if (!APPLY) {
  for (const item of report) {
    console.log(`\n${item.app} · ${item.theme} · ${item.reviews}`);
    for (const sample of item.samples) console.log(`- ${sample}`);
  }
  console.log("\nRun with --apply after reviewing the matches.");
}
