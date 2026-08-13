const STOP_WORDS = new Set(`
a about above after again against all also am an and any are aren as at be because been before being below between both but by can could couldn did didn do does doesn doing don down during each few for from further get gets getting got had hadn has hasn have haven having he her here hers herself him himself his how i if in into is isn it its itself just ll me more most mustn my myself no nor not now of off on once only or other our ours ourselves out over own re s same she should shouldn so some such than that the their theirs them themselves then there these they this those through to too under until up use used user users using very was wasn we were weren what when where which while who whom why will with won would wouldn you your yours yourself yourselves
app apps application applications feature features product products people really thing things make makes made one two much many way even still ever every new old good great best bad nice love like help helps helpful work works working
это как для что или при уже ещё все она они его её их мы вы не да но же из на по к в с у о от до за над под без про есть был была были быть очень просто приложение приложениям пользователь пользователи
`.trim().split(/\s+/));

const SYNONYMS = new Map(Object.entries({
  ads: "advert", ad: "advert", advertisement: "advert", advertisements: "advert", advertising: "advert",
  billing: "charge", billed: "charge", charges: "charge", charged: "charge", charging: "charge",
  crashes: "crash", crashed: "crash", crashing: "crash", freezes: "freeze", freezing: "freeze",
  subscriptions: "subscription", subscribed: "subscription", subscribing: "subscription",
  payments: "payment", paying: "payment", paid: "payment",
  refunds: "refund", refunded: "refund",
  logins: "login", logging: "login", signin: "login", signins: "login",
  notifications: "notification", updates: "update", updated: "update", updating: "update",
  passwords: "password", accounts: "account", messages: "message",
  photos: "photo", pictures: "photo", images: "image", videos: "video",
  purchases: "purchase", purchased: "purchase", purchasing: "purchase",
  expensive: "cost", pricing: "cost", prices: "cost", pricey: "cost",
  deleted: "delete", deleting: "delete", disappeared: "disappear", missing: "disappear",
  syncing: "sync", synced: "sync", synchronization: "sync",
  slow: "performance", laggy: "performance", lagging: "performance",
}));

const stem = (raw) => {
  let token = SYNONYMS.get(raw) || raw;
  if (token.length > 6 && token.endsWith("ies")) token = `${token.slice(0, -3)}y`;
  else if (token.length > 7 && token.endsWith("ing")) token = token.slice(0, -3);
  else if (token.length > 6 && token.endsWith("ed")) token = token.slice(0, -2);
  else if (token.length > 6 && token.endsWith("es")) token = token.slice(0, -2);
  else if (token.length > 5 && token.endsWith("s")) token = token.slice(0, -1);
  return SYNONYMS.get(token) || token;
};

const tokens = (value) => String(value || "")
  .normalize("NFKD")
  .toLowerCase()
  .match(/[\p{L}\p{N}]+/gu)
  ?.map(stem)
  .filter((token) => token.length >= 2 && !STOP_WORDS.has(token)) || [];

const ratingMatches = (polarity, rating) =>
  polarity === "love" ? rating >= 4 : polarity === "pain" ? rating <= 3 : true;

const shorten = (value, max = 92) => {
  const clean = String(value || "").replace(/[—–]/g, "-").replace(/\s+/g, " ").trim();
  const first = clean.split(/\s+-\s+|:\s+/)[0];
  const candidate = first.length >= 24 ? first : clean;
  if (candidate.length <= max) return candidate.charAt(0).toLowerCase() + candidate.slice(1);
  const cut = candidate.slice(0, max + 1);
  const end = cut.lastIndexOf(" ");
  const result = `${cut.slice(0, end >= 50 ? end : max).trim()}…`;
  return result.charAt(0).toLowerCase() + result.slice(1);
};

const UNIVERSAL = [
  ["trial-charge", "триал, списания и возврат денег", "trial charges and refunds", "pain", /\b(?:free trial|trial).{0,100}(?:charge|payment|refund|cancel|subscription)|(?:charge|payment|refund).{0,100}(?:free trial|trial)\b/i],
  ["subscription", "подписка и платные ограничения", "subscription and paid restrictions", "pain", /\b(?:subscription|premium|paywall|membership|payment|charge|refund|cancel subscription|restore purchase|in-app purchase|cost|paid|payed|paying|pay for)\b/i],
  ["ads", "реклама мешает пользоваться приложением", "ads disrupt the experience", "pain", /\b(?:ads?|advert|advertisement|commercials?)\b.{0,55}\b(?:annoy|intrusive|unusable|constant|every|long|remove|watch|interrupt|disrupt)|\b(?:too many|constant|intrusive|annoying|unskippable|watch).{0,55}\b(?:ads?|advert|advertisement|commercials?)\b/i],
  ["crashes", "вылеты, зависания и ошибки", "crashes, freezes and errors", "pain", /\b(?:crash|freeze|frozen|buggy|glitch|error message|won'?t open|doesn'?t open|stopped working|not working|broken)\b/i],
  ["update-regression", "обновление сломало привычный сценарий", "an update broke a familiar workflow", "pain", /\b(?:after|since|latest|new).{0,50}(?:update|version).{0,100}(?:worse|broke|broken|crash|freeze|missing|removed|change|unusable)|(?:update|version).{0,80}(?:ruined|worse|broke|removed)\b/i],
  ["login-account", "вход, регистрация и доступ к аккаунту", "login, signup and account access", "pain", /\b(?:can'?t|cannot|unable|won'?t|doesn'?t).{0,70}(?:log ?in|sign ?in|register|create (?:an )?account|access (?:my )?account|reset (?:my )?password)|(?:login|sign ?in|password|verification code|account access).{0,70}(?:fail|error|problem|issue|loop|locked)\b/i],
  ["ban-account", "блокировка или удаление аккаунта без объяснений", "account bans or deletion without explanation", "pain", /\b(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|locked out|disabled|terminated|deleted my account).{0,100}(?:account|reason|appeal|support|explanation)|(?:account).{0,80}(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|disabled|terminated)\b/i],
  ["support", "поддержка не отвечает или не решает проблему", "support does not respond or resolve the issue", "pain", /\b(?:customer (?:service|support)|support team|help desk|developer).{0,100}(?:no response|never (?:respond|reply)|unhelpful|useless|ignore|robot|bot|can'?t help|won'?t help)|(?:no response|never (?:respond|reply)|ignored).{0,80}(?:support|email|ticket)\b/i],
  ["data-loss", "пропадают данные, история или прогресс", "data, history or progress disappears", "pain", /\b(?:lost|delete|disappear|gone|wiped|erase|disappear).{0,90}(?:data|history|progress|entries|record|project|photo|video|notes?|work|account)|(?:data|history|progress|entries|record|project|work).{0,90}(?:lost|delete|disappear|gone|wiped|erase)\b/i],
  ["sync", "синхронизация между устройствами работает ненадёжно", "cross-device sync is unreliable", "pain", /\b(?:sync|cloud|backup).{0,100}(?:fail|problem|issue|doesn'?t|won'?t|can'?t|lost|duplicate|wrong|stuck)|(?:devices?|iphone|ipad|watch|computer).{0,100}(?:sync|cloud|backup).{0,60}(?:fail|problem|issue|doesn'?t|won'?t)\b/i],
  ["performance", "медленная работа и долгие загрузки", "slow performance and long loading times", "pain", /\b(?:performance|slow|sluggish|lag|takes forever|loading forever|long load|unresponsive|battery drain|overheat)\b/i],
  ["privacy", "приватность и лишние разрешения", "privacy and excessive permissions", "pain", /\b(?:privacy|track my location|location access|personal data|sell (?:my )?data|data collection|permission|spyware|microphone access|contacts access)\b/i],
  ["notifications", "лишние или неработающие уведомления", "excessive or broken notifications", "pain", /\b(?:notification|reminder|alert).{0,90}(?:too many|spam|annoy|doesn'?t|don'?t|won'?t|not work|late|missing|wrong)|(?:too many|spam).{0,60}(?:notification|reminder|alert)\b/i],
  ["search", "поиск не находит нужное", "search fails to find what is needed", "pain", /\b(?:search|filter).{0,90}(?:doesn'?t|don'?t|won'?t|can'?t|cannot|bad|poor|useless|wrong|find)|(?:can'?t|cannot|unable to).{0,60}(?:find|search)\b/i],
  ["accuracy", "неточные результаты и неверные данные", "inaccurate results and incorrect data", "pain", /\b(?:inaccurate|incorrect|wrong (?:data|result|answer|location|calculation|information|reading)|not accurate|accuracy (?:is|problem)|false information|hallucinat)\b/i],
  ["export", "сохранение, экспорт или отправка результата не работают", "saving, exporting or sharing the result fails", "pain", /\b(?:export|save|download|share).{0,100}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|stuck|lost|quality|watermark)|(?:can'?t|cannot|unable to).{0,60}(?:export|save|download|share)\b/i],
  ["missing-feature", "не хватает нужной функции", "a needed feature is missing", "pain", /\b(?:please add|needs? (?:a|an|the)|wish (?:it|there|you)|missing feature|no option|should have|would be better if|feature request)\b/i],
  ["accessibility", "проблемы доступности и специальных возможностей", "accessibility and assistive-technology issues", "pain", /\b(?:accessibility|voiceover|screen reader|blind|visually impaired|hearing impaired|font size|text size|contrast)\b/i],
  ["easy-use", "понятный и удобный сценарий", "clear and easy workflow", "love", /\b(?:easy to use|simple to use|user[ -]?friendly|intuitive|straightforward|easy to navigate|clean interface|well designed)\b/i],
  ["reliable", "стабильная и надёжная работа", "stable and reliable performance", "love", /\b(?:reliable|works perfectly|works great|never had (?:a )?problem|no issues|does exactly what|always works|flawless)\b/i],
  ["results", "приложение помогает достичь результата", "the app helps achieve the intended result", "love", /\b(?:helped me|helps me|changed my life|life saver|lifesaver|made it (?:easy|possible)|couldn'?t (?:do|have done).{0,40}without|achieve|reached my goal)\b/i],
  ["value", "бесплатная версия даёт реальную ценность", "the free version provides real value", "love", /\b(?:completely free|actually free|free version).{0,100}(?:enough|great|useful|works|everything|value)|(?:no ads|without ads).{0,80}(?:free|great|love|perfect)\b/i],
  ["customization", "гибкие настройки под свой сценарий", "flexible customization for personal workflows", "love", /\b(?:customiz|personaliz|many options|lots of options|flexible|set it up).{0,90}(?:need|want|preference|workflow|way|own)\b/i],
];

// A small set of category-native rules catches short texts whose meaning is
// explicit but whose vocabulary is too sparse for the statistical matcher.
// Every rule is intentionally narrow and can be audited as plain language.
const NICHE_EXACT = {
  "dating-apps": [
    ["боты и фейки убивают доверие к каждому приложению", "bots and fakes destroy trust in every app", "pain", /\b(?:bots?|fake profiles?|scammers?|catfish(?:ing)?)\b/i],
    ["платный замок «увидеть, кто тебя лайкнул» бесит всех", "locking “see who liked you” behind a paywall infuriates everyone", "pain", /\b(?:pay|paid|premium|subscription).{0,80}(?:see|view|find out).{0,40}(?:who )?(?:liked|likes)\b|\b(?:see|view).{0,40}(?:who )?(?:liked|likes).{0,80}(?:pay|paid|premium|subscription)\b/i],
    ["верификация лица превратилась в стену между человеком и продуктом", "face verification has become a wall between real users and the product", "pain", /\b(?:face|selfie|video).{0,35}verif|\bverif.{0,35}(?:face|selfie|video)\b/i],
  ],
  "ai-avatars-headshots": [
    ["сходство с лицом - главная работа продукта", "facial likeness is the core job-to-be-done", "mixed", /\b(?:doesn'?t|does not|didn'?t|did not|nothing|not).{0,30}(?:look like|resemble).{0,20}(?:me|my face|person)|\b(?:look|looks|looked).{0,20}nothing like\b/i],
  ],
};

const FALLBACKS = {
  love: { name: "общая положительная оценка", nameEn: "overall positive experience", polarity: "love", fallback: true, scope: "fallback" },
  mixed: { name: "смешанная оценка без конкретной причины", nameEn: "mixed experience without a specific reason", polarity: "mixed", fallback: true, scope: "fallback" },
  pain: { name: "негативный опыт без конкретной причины", nameEn: "negative experience without a specific reason", polarity: "pain", fallback: true, scope: "fallback" },
};

export function createCorpusLabeler(patternsByNiche) {
  const models = new Map();

  for (const [slug, patterns] of Object.entries(patternsByNiche)) {
    const documents = patterns.map((pattern) => {
      const title = pattern.titleEn || pattern.title;
      const detail = pattern.plusEn || pattern.minusEn || pattern.plus || pattern.minus || "";
      // Evidence quotes are deliberately not training features. They contain
      // app names and incidental wording that made a strategic niche pattern
      // look relevant to unrelated reviews. The pattern statement itself is
      // the stable, auditable vocabulary; quotes remain evidence in the UI.
      const titleTokens = tokens(`${title} ${title} ${title}`);
      const allTokens = [...titleTokens, ...tokens(detail)];
      const frequency = new Map();
      for (const token of allTokens) frequency.set(token, (frequency.get(token) || 0) + 1);
      const phraseTokens = tokens(`${title} ${detail}`);
      const bigrams = new Set(phraseTokens.slice(0, -1).map((token, index) => `${token} ${phraseTokens[index + 1]}`));
      return { pattern, frequency, bigrams };
    });
    const documentFrequency = new Map();
    for (const document of documents) for (const token of document.frequency.keys()) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
    for (const document of documents) {
      const weights = new Map();
      for (const [token, frequency] of document.frequency) {
        const idf = Math.log((documents.length + 1) / ((documentFrequency.get(token) || 0) + 0.5)) + 1;
        weights.set(token, (1 + Math.log(frequency)) * idf);
      }
      document.weights = weights;
    }
    models.set(slug, documents);
  }

  return (slug, review) => {
    const rating = Number(review.rating) || 0;
    const reviewText = String(review.text || "");

    for (const [name, nameEn, polarity, pattern] of NICHE_EXACT[slug] || []) {
      if (ratingMatches(polarity, rating) && pattern.test(reviewText)) return { name, nameEn, polarity, scope: "niche" };
    }

    const reviewTokens = tokens(review.text);
    const unique = new Set(reviewTokens);
    const reviewBigrams = new Set(reviewTokens.slice(0, -1).map((token, index) => `${token} ${reviewTokens[index + 1]}`));
    const candidates = [];

    for (const model of models.get(slug) || []) {
      if (!ratingMatches(model.pattern.polarity, rating)) continue;
      let score = 0;
      let matches = 0;
      let bigramMatches = 0;
      for (const token of unique) {
        const weight = model.weights.get(token);
        if (weight) {
          score += weight;
          matches++;
        }
      }
      for (const bigram of reviewBigrams) if (model.bigrams.has(bigram)) bigramMatches++;
      score += bigramMatches * 5;
      // A niche label needs both vocabulary overlap and an intact phrase.
      // This is intentionally conservative: otherwise generic words such as
      // "app", "calendar" or "photo" manufacture a false product insight.
      if (matches >= 3 && bigramMatches >= 1) candidates.push({ model, score, matches, bigramMatches });
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    const second = candidates[1];
    if (best && best.score >= 10 && (!second || best.bigramMatches > second.bigramMatches || best.score >= second.score * 1.2)) {
      return {
        name: shorten(best.model.pattern.title),
        nameEn: shorten(best.model.pattern.titleEn || best.model.pattern.title),
        polarity: best.model.pattern.polarity,
        scope: "niche",
      };
    }

    for (const [, name, nameEn, polarity, pattern] of UNIVERSAL) {
      if (ratingMatches(polarity, rating) && pattern.test(reviewText)) {
        return { name, nameEn, polarity, scope: "universal" };
      }
    }

    return rating >= 4 ? FALLBACKS.love : rating <= 2 ? FALLBACKS.pain : FALLBACKS.mixed;
  };
}

export function summarizeThemes(reviews, metadata) {
  const counts = new Map();
  for (const review of reviews) counts.set(review.theme, (counts.get(review.theme) || 0) + 1);
  return [...counts.entries()]
    .map(([name, count]) => {
      const theme = metadata.get(name) || (name === FALLBACKS.love.name ? FALLBACKS.love : name === FALLBACKS.pain.name ? FALLBACKS.pain : FALLBACKS.mixed);
      return { name, nameEn: theme.nameEn, polarity: theme.polarity, count, ...(theme.fallback ? { fallback: true } : {}), ...(theme.scope ? { scope: theme.scope } : {}) };
    })
    .sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count);
}
