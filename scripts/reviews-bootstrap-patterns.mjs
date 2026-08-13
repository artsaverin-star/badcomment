#!/usr/bin/env node

// Build category patterns for the seven corpora that never received the final
// synthesis pass. Each rule is a narrow, domain-specific hypothesis and ships
// only when it appears in 8+ reviews across 3+ different apps.

import fs from "node:fs";

const OUTPUT_PATH = "src/data/reviewNichePatternsBootstrap.json";
const MIN_REVIEWS = 8;
const MIN_APPS = 3;

const positive = (rating) => rating >= 4;
const negative = (rating) => rating > 0 && rating <= 3;
const any = () => true;

const DEFINITIONS = {
  "ai-writing": [
    ["ai-memory", "ии забывает контекст и заставляет повторять вводные", "AI forgets context and makes users repeat their setup", "pain", negative, /\b(?:ai|bot|assistant|chat|claude).{0,90}(?:forgets?|forgot|loses? (?:the )?context|memory (?:is|does|fails)|doesn'?t remember|can'?t remember)|(?:forgets?|forgot|loses? (?:the )?context|doesn'?t remember|can'?t remember).{0,90}(?:ai|bot|assistant|chat|claude)\b/i],
    ["hallucinations", "уверенный тон скрывает фактические ошибки и выдумки", "confident prose hides factual errors and hallucinations", "pain", negative, /\b(?:hallucinat|made up|makes? up|fabricat|false information|factually|inaccurate|incorrect|wrong answer|lies?)\b/i],
    ["rewrite", "переписывание, грамматика и смена тона ускоряют работу с текстом", "rewriting, grammar and tone controls speed up writing", "love", positive, /\b(?:rewrite|rephrase|grammar|proofread|tone|editing|edit my|writing).{0,100}(?:help|useful|great|better|fast|save|improve|email|text)|(?:help|improve|fix).{0,80}(?:grammar|writing|email|text|tone)\b/i],
    ["long-docs", "длинные документы удобно сокращать и структурировать", "long documents are easy to summarize and structure", "love", positive, /\b(?:summari[sz](?:e|es|ed|ing|ation)?).{0,110}(?:document|pdf|text|article|notes?)|(?:document|pdf|long (?:text|article)).{0,110}(?:summari[sz]|condens|outline|extract|ask questions?|process faster)\b/i],
    ["limits", "лимиты сообщений и моделей обрывают работу даже после оплаты", "message and model limits interrupt work even after payment", "pain", negative, /\b(?:limit|quota|credits?|messages?).{0,100}(?:paid|pay|subscription|premium|run out|reached|reset|model)|(?:paid|subscription|premium).{0,100}(?:limit|quota|credits?|messages?)\b/i],
    ["safety-blocks", "фильтры безопасности блокируют нормальные творческие запросы", "safety filters block legitimate creative requests", "pain", negative, /\b(?:content filter|censor|safety (?:filter|guideline|policy)|content policy|restricted content|blocked (?:my )?(?:prompt|request|story|writing)).{0,100}(?:write|story|fiction|creative|prompt|request|content)|(?:write|story|fiction|creative|prompt|request).{0,100}(?:content filter|censor|safety (?:filter|guideline|policy)|content policy|restricted|blocked)\b/i],
  ],
  "baby-tracking": [
    ["shared-log", "общий журнал синхронизирует уход между родителями и няней", "a shared log coordinates care between parents and caregivers", "love", positive, /\b(?:partner|husband|wife|caregiver|nanny|family|share|shared|sync).{0,110}(?:baby|feeding|diaper|sleep|track|log)|(?:baby|feeding|diaper|sleep|track|log).{0,110}(?:partner|husband|wife|caregiver|nanny|family|share|shared|sync)\b/i],
    ["night-logging", "быстрый ввод помогает записывать кормления, сон и подгузники на ходу", "quick entry keeps feeding, sleep and diaper logs manageable on the go", "love", positive, /\b(?:night|3 ?a\.?m\.?|one hand|one-handed|widget|quick|easy).{0,100}(?:feeding|nursing|breastfeed|bottle|sleep|diaper|timer|log)|(?:feeding|nursing|breastfeed|bottle|sleep|diaper|timer|log).{0,100}(?:night|one hand|widget|quick|easy)\b/i],
    ["routine-log", "единый журнал кормлений, сна и подгузников снижает нагрузку на память", "one feeding, sleep and diaper log reduces the mental load", "love", positive, /\b(?:feeding|feedings|breastfeed|bottle).{0,100}(?:sleep|diaper|track|log)|(?:sleep|diaper).{0,100}(?:feeding|bottle|track|log)\b/i],
    ["data-loss", "синхронизация и обновления иногда стирают историю ребёнка", "sync and updates sometimes erase a child's history", "pain", negative, /\b(?:lost|deleted|disappear|missing|reset|wiped|gone).{0,100}(?:data|history|logs?|entries|baby|feeding|sleep)|(?:data|history|logs?|entries).{0,100}(?:lost|deleted|disappear|missing|reset|wiped|gone)\b/i],
    ["paywall", "базовый уход и семейный доступ закрывают дорогой подпиской", "basic care tracking and family access sit behind an expensive subscription", "pain", negative, /\b(?:subscription|premium|paywall|pay|paid|expensive|price).{0,110}(?:baby|track|feeding|sleep|feature|partner|family|basic)|(?:baby|track|feeding|sleep|feature|partner|family).{0,110}(?:subscription|premium|paywall|pay|paid|expensive)\b/i],
    ["patterns", "статистика помогает увидеть режим сна и кормлений", "analytics reveal feeding and sleep routines", "love", positive, /\b(?:pattern|trend|chart|statistics|insight|routine|schedule).{0,100}(?:sleep|feeding|baby|track|understand)|(?:sleep|feeding|baby).{0,100}(?:pattern|trend|chart|statistics|insight|routine|schedule)\b/i],
  ],
  "focus-productivity": [
    ["pomodoro", "фокус-таймер и помодоро помогают доводить короткие сессии до конца", "focus timers and Pomodoro make short work sessions achievable", "love", positive, /\b(?:pomodoro|focus timer|timer|focus session).{0,100}(?:help|productive|work|study|task|concentrat)|(?:help|productive|work|study|task).{0,100}(?:pomodoro|focus timer|timer|focus session)\b/i],
    ["gamification", "деревья, питомцы и награды превращают концентрацию в привычку", "trees, pets and rewards turn focus into a habit", "love", positive, /\b(?:tree|forest|pet|bird|character|reward|gamif|coins?|streak).{0,100}(?:motivat|focus|productive|habit|task|study)|(?:motivat|focus|productive|habit).{0,100}(?:tree|forest|pet|reward|streak)\b/i],
    ["blocking", "блокировка приложений и сайтов защищает сессию от отвлечений", "app and website blocking protects sessions from distractions", "love", positive, /\b(?:block|blocking|blacklist|whitelist|restrict).{0,100}(?:apps?|websites?|social media|distraction|phone)|(?:apps?|websites?|social media|distraction).{0,100}(?:block|blocking|restrict)\b/i],
    ["paywall", "короткий пробный период ведёт к дорогой и навязчивой подписке", "a short trial leads into an expensive, aggressive subscription", "pain", negative, /\b(?:subscription|trial|premium|paywall|price|expensive|charge|charged).{0,100}(?:focus|habit|timer|feature|week|year|cancel)|(?:focus|habit|timer|feature).{0,100}(?:subscription|trial|premium|paywall|price|expensive)\b/i],
    ["background-timer", "таймер останавливается в фоне или при блокировке телефона", "timers stop in the background or when the phone locks", "pain", negative, /\b(?:timer|session|countdown).{0,100}(?:background|lock|screen off|close|stops?|pause|reset)|(?:background|lock|screen off|close).{0,100}(?:timer|session|countdown|stops?)\b/i],
    ["sync", "синхронизация с календарём, часами и здоровьем остаётся слабым местом", "calendar, watch and health sync remains a weak point", "pain", negative, /\b(?:sync|integration|integrate).{0,100}(?:calendar|apple watch|health|devices?|cloud|mac|ipad)|(?:calendar|apple watch|health|devices?|cloud).{0,100}(?:sync|integration|integrate)\b/i],
  ],
  "journaling-mood": [
    ["prompts", "готовые вопросы помогают начать запись без страха пустой страницы", "guided prompts remove blank-page anxiety", "love", positive, /\b(?:prompt|question|guided|suggestion).{0,100}(?:journal|write|writing|reflect|entry|thought)|(?:journal|write|writing|reflect|entry).{0,100}(?:prompt|question|guided|suggestion)\b/i],
    ["mood-patterns", "дневник настроения показывает эмоциональные паттерны со временем", "mood logs reveal emotional patterns over time", "love", positive, /\b(?:mood|emotion|feeling).{0,100}(?:track|pattern|trend|chart|insight|understand|history)|(?:track|pattern|trend|chart|insight).{0,100}(?:mood|emotion|feeling)\b/i],
    ["gentle-motivation", "питомец, поддерживающие фразы и серия дней мотивируют заботиться о себе", "a pet, supportive messages and streaks motivate self-care", "love", positive, /\b(?:pet|bird|finch|streak|encourag|supportive|motivat).{0,100}(?:self care|self-care|journal|mood|goals?|habit|daily)|(?:self care|self-care|journal|mood|goals?|habit).{0,100}(?:pet|bird|finch|streak|encourag|supportive|motivat)\b/i],
    ["privacy", "личные записи вызывают особые требования к приватности и блокировке", "private entries demand strong privacy and app locking", "pain", negative, /\b(?:privacy|private|password|passcode|lock|face id|data collection|sell data).{0,100}(?:journal|diary|entries|mood|personal|data)|(?:journal|diary|entries|mood|personal).{0,100}(?:privacy|private|password|passcode|lock|face id)\b/i],
    ["data-loss", "сбой синхронизации или обновление может уничтожить годы записей", "sync failures and updates can erase years of entries", "pain", negative, /\b(?:lost|disappeared|missing|wiped|gone|erased).{0,110}(?:entries|journal|diary|data|history|years?|streak)|(?:entries|journal|diary|data|history|years?).{0,110}(?:lost|disappeared|missing|wiped|gone|erased)|deleted.{0,45}(?:my|all|years? of) (?:entries|journal|diary|data|history)\b/i],
    ["paywall", "экспорт, история и полезные упражнения оказываются за подпиской", "export, history and useful exercises end up behind a subscription", "pain", negative, /\b(?:subscription|premium|plus|paywall|pay|paid|expensive|trial|charged).{0,110}(?:journal|entries|export|history|feature|mood|self care)|(?:journal|entries|export|history|feature|mood).{0,110}(?:subscription|premium|plus|paywall|pay|paid|expensive)\b/i],
  ],
  "period-cycle": [
    ["prediction", "точность прогноза резко падает при нерегулярном цикле", "prediction accuracy drops sharply for irregular cycles", "pain", negative, /\b(?:irregular|prediction|predict|accurate|accuracy).{0,100}(?:period|cycle|ovulation|fertile|date)|(?:period|cycle|ovulation|fertile).{0,100}(?:irregular|prediction|predict|accurate|accuracy)\b/i],
    ["body-awareness", "симптомы и история помогают лучше понимать изменения тела", "symptoms and history improve body awareness", "love", positive, /\b(?:symptoms?|mood|cramps?|flow|body|hormones?).{0,100}(?:track|understand|insight|learn|history|pattern)|(?:track|understand|insight|learn|history).{0,100}(?:symptoms?|mood|cramps?|flow|body|hormones?)\b/i],
    ["fertility", "овуляция и фертильное окно помогают планировать беременность", "ovulation and fertile-window tracking support pregnancy planning", "love", positive, /\b(?:ovulation|fertile|fertility|trying to conceive|ttc|pregnan).{0,100}(?:track|predict|plan|help|accurate|window)|(?:track|predict|plan|help).{0,100}(?:ovulation|fertile|fertility|pregnan)\b/i],
    ["paywall", "базовые знания о здоровье и прогнозы закрывают подпиской", "basic health guidance and predictions are locked behind a subscription", "pain", negative, /\b(?:subscription|premium|paywall|pay|paid|price|expensive).{0,110}(?:period|cycle|symptom|prediction|health|feature|basic)|(?:period|cycle|symptom|prediction|health|feature).{0,110}(?:subscription|premium|paywall|pay|paid|price|expensive)\b/i],
    ["privacy", "данные о цикле требуют прозрачной приватности и контроля удаления", "cycle data needs transparent privacy and deletion controls", "pain", negative, /\b(?:privacy|private|data collection|delete (?:my )?account|sell (?:my )?data|share (?:my )?data).{0,100}(?:period|cycle|health|information|personal)|(?:period|cycle|health|personal).{0,100}(?:privacy|private|data collection|delete (?:my )?account|sell (?:my )?data|share (?:my )?data)\b/i],
    ["partner", "режим партнёра полезен только при простой и своевременной синхронизации", "partner mode works only with simple, timely sharing", "mixed", any, /\b(?:partner|husband|wife|boyfriend|share|sharing).{0,100}(?:period|cycle|symptom|track|mode|invite|sync)|(?:period|cycle|symptom|track).{0,100}(?:partner|husband|wife|boyfriend|share|sharing)\b/i],
  ],
  "recipes-meal-planning": [
    ["recipe-import", "импорт рецептов из сайтов и соцсетей экономит ручной ввод", "recipe import from websites and social media saves manual entry", "love", positive, /\b(?:import|save|clip|scan).{0,100}(?:recipe|website|instagram|tiktok|pinterest|url|web)|(?:recipe|website|instagram|tiktok|pinterest|url).{0,100}(?:import|save|clip|scan)\b/i],
    ["grocery-list", "список покупок автоматически собирается из выбранных рецептов", "grocery lists are generated automatically from chosen recipes", "love", positive, /\b(?:grocery|shopping list).{0,100}(?:recipe|meal plan|automatic|generate|ingredients?|help)|(?:recipe|meal plan|ingredients?).{0,100}(?:grocery|shopping list|automatic|generate)\b/i],
    ["decision-fatigue", "недельный план снимает ежедневный вопрос что приготовить", "weekly planning removes the daily what-to-cook decision", "love", positive, /\b(?:meal plan|planning|weekly|week).{0,100}(?:save time|easy|help|dinner|cook|family|organize)|(?:dinner|cook|family|organize).{0,100}(?:meal plan|planning|weekly)\b/i],
    ["family-sharing", "общие рецепты и список покупок координируют семью", "shared recipes and grocery lists coordinate a household", "love", positive, /\b(?:share|shared|sync|collaborat).{0,100}(?:recipe|meal|grocery|shopping list|plan)|(?:recipe|meal|grocery|shopping list|plan).{0,100}(?:share|shared|sync|collaborat)|(?:partner|husband|wife|family).{0,100}(?:both use|also use|same account|shared account|sync|share)\b/i],
    ["diet-filters", "фильтры по аллергиям и рациону слишком часто пропускают неподходящие блюда", "allergy and diet filters too often let unsuitable meals through", "pain", negative, /\b(?:allerg|gluten|vegan|vegetarian|keto|dietary|carnivore).{0,110}(?:filter|exclude|no (?:options|recipes)|few (?:options|recipes)|not (?:designed|available|suitable)|doesn'?t (?:filter|support))|(?:filter|exclude|no (?:options|recipes)|few (?:options|recipes)|not (?:designed|available|suitable)|doesn'?t (?:filter|support)).{0,110}(?:allerg|gluten|vegan|vegetarian|keto|dietary|carnivore)\b/i],
    ["paywall", "импорт, планирование и списки постепенно уходят за подписку", "import, planning and lists gradually move behind a subscription", "pain", negative, /\b(?:subscription|premium|paywall|price|expensive|trial|charged|membership|pay(?:ing)? (?:for|to|again)|paid (?:for|subscription|member|membership)).{0,110}(?:recipe|meal|grocery|shopping list|import|planning)|(?:recipe|meal|grocery|shopping list|import|planning).{0,110}(?:subscription|premium|paywall|price|expensive|trial|charged|membership|pay(?:ing)? (?:for|to|again)|paid (?:for|subscription|member|membership))\b/i],
  ],
  "workout-fitness": [
    ["structured-plans", "структурированные программы снимают вопрос что делать сегодня", "structured programs remove the what-do-I-do-today decision", "love", positive, /\b(?:program|plan|routine|schedule).{0,100}(?:workout|training|week|progress|structured|follow|exercise)|(?:workout|training).{0,100}(?:program|plan|routine|schedule|structured|follow)\b/i],
    ["home-workouts", "короткие домашние тренировки без оборудования снижают порог старта", "short equipment-free home workouts lower the barrier to starting", "love", positive, /\b(?:home|no equipment|bodyweight|without equipment|at home).{0,100}(?:workout|exercise|training|beginner|quick)|(?:workout|exercise|training).{0,100}(?:home|no equipment|bodyweight|without equipment|at home)\b/i],
    ["coaches-community", "живые тренеры и сообщество удерживают мотивацию годами", "live coaches and community sustain motivation for years", "love", positive, /\b(?:coach|trainer|instructor|community|class).{0,100}(?:motivat|support|live|workout|training|help)|(?:motivat|support|live).{0,100}(?:coach|trainer|instructor|community|class)\b/i],
    ["progress", "история веса, повторов и тренировок делает прогресс видимым", "weight, rep and workout history makes progress visible", "love", positive, /\b(?:progress|history|stats?|statistics|chart|personal record|pr|reps?|weights?).{0,100}(?:track|workout|training|motivat|see|report)|(?:track|workout|training).{0,100}(?:progress|history|stats?|personal record|reps?|weights?)\b/i],
    ["watch-sync", "синхронизация с Apple Watch и Health теряет или дублирует тренировки", "Apple Watch and Health sync loses or duplicates workouts", "pain", negative, /\b(?:sync|integration|connect|disconnect|duplicate|import|recogniz|write|read).{0,110}(?:apple watch|apple health|health app|garmin|fitbit)|(?:apple watch|apple health|health app|garmin|fitbit).{0,110}(?:sync|integration|connect|disconnect|duplicate|import|recogniz|write|read)\b/i],
    ["paywall", "полезные метрики и базовые функции переходят в дорогой премиум", "useful metrics and basic features move into expensive premium tiers", "pain", negative, /\b(?:subscription|premium|paywall|price|expensive|trial|charged|membership|pay(?:ing)? (?:for|to|again)|paid (?:for|subscription|member|membership)).{0,110}(?:workout|exercise|metrics?|feature|plan|program|tracker)|(?:workout|exercise|metrics?|feature|plan|program|tracker).{0,110}(?:subscription|premium|paywall|price|expensive|trial|charged|membership|pay(?:ing)? (?:for|to|again)|paid (?:for|subscription|member|membership))\b/i],
    ["form-guidance", "видео и подсказки по технике решают, безопасно ли повторять упражнение", "video and form cues determine whether exercises are safe to follow", "mixed", any, /\b(?:form|technique|instruction|demonstrat|video|animation).{0,100}(?:exercise|workout|movement|pose|safe|follow)|(?:exercise|workout|movement).{0,100}(?:form|technique|instruction|demonstrat|video|animation)\b/i],
  ],
};

const cleanQuote = (value) => {
  const quote = String(value || "").replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();
  if (quote.length <= 420) return quote;
  const head = quote.slice(0, 419);
  const sentenceEnd = Math.max(head.lastIndexOf(". "), head.lastIndexOf("! "), head.lastIndexOf("? "));
  if (sentenceEnd >= 160) return `${head.slice(0, sentenceEnd + 1)}…`;
  const wordEnd = head.lastIndexOf(" ");
  return `${head.slice(0, Math.max(300, wordEnd))}…`;
};

// rev-src is the canonical full corpus used by the review pipeline. The old
// *-corpus.json files contain only 24 shortened examples per app and are not
// sufficient evidence for a category-wide count.
const readCorpus = (slug) =>
  fs.readdirSync(`gen/rev-src/${slug}`)
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(fs.readFileSync(`gen/rev-src/${slug}/${file}`, "utf8")));

const output = {};
for (const [slug, definitions] of Object.entries(DEFINITIONS)) {
  const corpus = readCorpus(slug);
  const patterns = [];
  for (const [id, title, titleEn, polarity, ratingRule, pattern] of definitions) {
    const matches = [];
    for (const app of corpus) {
      for (const review of app.reviews || []) {
        const quote = review.quote || review.text || "";
        if (quote.length >= 24 && ratingRule(Number(review.rating)) && pattern.test(quote)) {
          matches.push({ app: app.title, rating: Number(review.rating) || 0, quote: cleanQuote(quote) });
        }
      }
    }
    const byApp = new Map();
    for (const match of matches) {
      const appMatches = byApp.get(match.app) || [];
      appMatches.push(match);
      byApp.set(match.app, appMatches);
    }
    const appGroups = [...byApp.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
    const apps = appGroups.map(([app]) => app);
    if (matches.length < MIN_REVIEWS || apps.length < MIN_APPS) continue;
    patterns.push({
      id,
      title,
      titleEn,
      polarity,
      count: matches.length,
      apps: apps.slice(0, 8),
      evidence: appGroups.slice(0, 3).map(([, appMatches]) =>
        [...appMatches].sort((a, b) => Math.abs(a.quote.length - 180) - Math.abs(b.quote.length - 180))[0],
      ),
    });
  }
  output[slug] = patterns.sort((a, b) => b.count - a.count);
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 1));
console.log(Object.fromEntries(Object.entries(output).map(([slug, patterns]) => [slug, patterns.map(({ id, count, apps }) => ({ id, count, apps: apps.length }))])));
console.log({ niches: Object.keys(output).length, patterns: Object.values(output).flat().length });
