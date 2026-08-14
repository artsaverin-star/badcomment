const topic = (name, nameEn, polarity, pattern, scope = "universal") => ({ name, nameEn, polarity, pattern, scope });

// Per-review topics are deliberately short and literal. Strategic niche
// findings live in reviewNichePatterns.json and are shown separately: using
// those editorial conclusions as if they were literal labels made the reader
// hard to scan and forced unrelated texts into an attractive-sounding story.
const TOPICS = [
  topic("триал, списание и возврат", "trial, charge and refund", "pain", /\b(?:free trial|trial period).{0,100}(?:charg|bill|refund|cancel)|(?:charg|bill|refund).{0,100}(?:free trial|trial period)\b/i),
  topic("дорогая подписка или пейволл", "expensive subscription or paywall", "pain", /\b(?:subscription|premium|paywall|membership|paid plan|in-app purchase).{0,100}(?:expensive|overpriced|too much|not worth|useless|can'?t|cannot|nothing|still (?:have|need) to pay|locked|forced)|(?:pay|paid|payed|paying).{0,80}(?:again|extra|more|everything|feature|even after|but still)|(?:no|without any) free features?|nothing.{0,30}(?:is|for)? free|everything.{0,35}(?:costs|paid|paywall)|have to pay for (?:every|anything)\b/i),
  topic("ошибка оплаты или двойное списание", "payment failure or duplicate charge", "pain", /\b(?:payment|card|purchase|transaction|charg).{0,100}(?:fail|declin|error|twice|double|duplicate|multiple|again|not (?:work|go through)|unrecogn|after (?:i )?cancel)|(?:double|duplicate|multiple|unauthori[sz]ed|didn'?t authori[sz]e|did not authori[sz]e|without (?:my )?authori[sz]ation).{0,70}(?:charg|payment|transaction|money)|(?:charg|took money).{0,70}(?:without (?:my )?authori[sz]ation|didn'?t authori[sz]e|did not authori[sz]e|after (?:i )?cancel)\b/i),
  topic("покупка или премиум не разблокировались", "purchase or premium did not unlock", "pain", /\b(?:paid|purchased|bought|subscribed).{0,110}(?:still (?:ask|prompt)|not (?:unlock|show|work)|can'?t (?:use|access)|without (?:premium|features?)|buy (?:again|the paid)|restore)|(?:restore purchases?|premium features?|paid features?).{0,100}(?:not work|missing|locked|can'?t|cannot|fail)\b/i),
  topic("реклама мешает пользоваться", "ads disrupt the experience", "pain", /\b(?:ads?|advert|advertisement|commercials?)\b.{0,70}\b(?:annoy|intrusive|unusable|constant|remove|interrupt|disrupt|freeze|nonstop|too many|pops? up)|\b(?:too many|constant|intrusive|annoying|unskippable|nonstop|every (?:single )?(?:tap|click|time|button)).{0,70}\b(?:ads?|advert|advertisement|commercials?)\b|реклам.{0,90}(?:меша|кажд|много|постоян)|(?:cada|muchos?|demasiados?) anuncios?/i),
  topic("вылеты, зависания и ошибки", "crashes, freezes and errors", "pain", /\b(?:crash(?:es|ed|ing)?|freez(?:e|es|ing)?|frozen|buggy|glitch(?:y|es|ed|ing)?|bugs?|error messages?|black screen|white screen|won'?t open|doesn'?t open|stopped working|not working|broken|unresponsive|none of the (?:buttons?|features?) work|buttons? (?:do not|don'?t|won'?t) work)\b|(?:не работает|не открывается|вылетает|зависает|ошибка|белый экран)|(?:no funciona|mensaje de error|se cierra|se queda pensando)/i),
  topic("обновление сломало привычный сценарий", "an update broke a familiar workflow", "pain", /\b(?:after|since|latest|new|recent).{0,50}(?:updates?|upgrades?|versions?).{0,110}(?:worse|broke|broken|crash|freez|missing|removed|change|unusable|ruined|awful)|(?:updates?|upgrades?|versions?).{0,90}(?:ruined|worse|broke|removed|destroyed|awful)\b|(?:после|с).{0,40}(?:обновлен|новой верси).{0,100}(?:хуже|слом|пропал|не работа)/i),
  topic("не получается войти или зарегистрироваться", "login or signup does not work", "pain", /\b(?:can'?t|cannot|unable|won'?t|doesn'?t).{0,75}(?:log ?in|sign ?in|register|create (?:an )?account|access (?:my )?account|reset (?:my )?password)|(?:login|sign ?in|password|verification code|account access).{0,75}(?:fail|error|problem|issue|loop|locked|not work)\b/i),
  topic("аккаунт заблокировали сразу после регистрации", "account blocked immediately after signup", "pain", /\b(?:(?:immediately|instantly|right away|within (?:a few )?(?:seconds?|minutes?|hours?)).{0,100}(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out)|(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out).{0,100}(?:immediately|instantly|right away|within (?:a few )?(?:seconds?|minutes?|hours?)|before (?:i|we) (?:could|even got to) use)|(?:new|brand new).{0,45}(?:account|profile).{0,100}(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out))\b/i),
  topic("аккаунт заблокирован или удалён", "account blocked or deleted", "pain", /\b(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|locked out|disabled|terminated|deleted my account).{0,110}(?:account|reason|appeal|support|explanation|profile)|(?:account|profile).{0,90}(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|disabled|terminated|deleted)\b/i),
  topic("поддержка не отвечает", "support does not respond", "pain", /\b(?:(?:customer (?:service|support)|support team|help desk|developer|support).{0,120}(?:(?:no|zero) (?:response|reply)|never (?:respond(?:ed|s|ing)?|repl(?:y|ied|ies|ying))|(?:didn'?t|doesn'?t|won'?t|will not) (?:respond|reply)|got nothing back|didn'?t hear back|ignor(?:e|es|ed|ing))|(?:(?:no|zero) (?:response|reply)|never (?:respond(?:ed|s|ing)?|repl(?:y|ied|ies|ying))|got nothing back|didn'?t hear back|ignor(?:e|es|ed|ing)).{0,100}(?:support|customer service|email|ticket|message))\b/i),
  topic("поддержка не помогает", "support does not help", "pain", /\b(?:customer (?:service|support)|support team|help desk|developer|support).{0,110}(?:no response|never (?:respond|reply)|unhelpful|useless|terrible|poor|bad|ignore|robot|bot|can'?t help|won'?t help|doesn'?t help|didn'?t understand|hung up|refus)|(?:no response|never (?:respond|reply)|ignored).{0,90}(?:support|email|ticket|message)\b/i),
  topic("поддержка решила проблему", "support resolved the issue", "love", /\b(?:customer (?:service|support)|support team|developer|support).{0,100}(?:helpful|amazing|excellent|great|quick|fast|resolved|fixed|responded)|(?:resolved|fixed|helped).{0,80}(?:support|service|team)\b/i),
  topic("пропали данные или прогресс", "data or progress disappeared", "pain", /\b(?:lost|lose|delet|disappear|gone|wiped|eras|restart).{0,95}(?:data|history|progress|entries|record|project|photo|video|notes?|account|playlist|recipe)|(?:data|history|progress|entries|record|project|playlist|recipe).{0,95}(?:lost|lose|delet|disappear|gone|wiped|eras|reset|restart)|(?:lost|deleted) my work\b|(?:пропал|потерял|удалил|сбросил).{0,70}(?:данн|прогресс|истори|запис)/i),
  topic("синхронизация или резервная копия не работают", "sync or backup does not work", "pain", /\b(?:sync|cloud|backup).{0,110}(?:fail|problem|issue|doesn'?t|won'?t|can'?t|lost|duplicate|wrong|stuck|not work)|(?:devices?|iphone|ipad|watch|computer).{0,100}(?:sync|cloud|backup).{0,70}(?:fail|problem|issue|doesn'?t|won'?t|not)\b/i),
  topic("медленная работа и долгие загрузки", "slow performance and long loading", "pain", /\b(?:very slow|so slow|too slow|sluggish|laggy|lagging|takes forever|loading forever|long load|slow performance|slow to load|slow to open)\b/i),
  topic("быстро и без задержек", "fast and responsive", "love", /\b(?:super fast|very fast|quick and easy|fast and easy|loads? (?:very )?quickly|responsive|instant(?:ly)?).{0,50}(?:app|result|work|load|process|use)?\b/i),
  topic("расход батареи или перегрев", "battery drain or overheating", "pain", /\b(?:battery).{0,70}(?:drain|kill|die|usage|consume)|\b(?:overheat|heats? (?:up )?(?:my )?(?:phone|device))\b/i),
  topic("лишние разрешения и приватность", "privacy and excessive permissions", "pain", /\b(?:privacy|track my location|location access|personal data|sell(?:ing)? (?:my )?(?:data|information)|data collection|data breach|breached|dark web|permission|spyware|microphone access|contacts access).{0,80}(?:concern|issue|without|force|require|why|bad|unsafe|invasive|records?)?\b/i),
  topic("уведомления или напоминания не работают", "notifications or reminders do not work", "pain", /\b(?:notification|reminder|alert).{0,95}(?:too many|spam|annoy|doesn'?t|don'?t|won'?t|not work|late|missing|wrong|never|fail)|(?:too many|spam|never (?:get|receive)|not receiving).{0,70}(?:notification|reminder|alert)\b/i),
  topic("поиск или фильтры не находят нужное", "search or filters fail", "pain", /\b(?:search|filter).{0,100}(?:doesn'?t|don'?t|won'?t|can'?t|cannot|bad|poor|useless|wrong|find|not work)|(?:can'?t|cannot|unable to).{0,65}(?:find|search|filter)\b/i),
  topic("неточные результаты или данные", "inaccurate results or data", "pain", /\b(?:inaccurate|incorrect|wrong (?:data|result|answer|location|calculation|information|reading|distance|pace|translation)|not (?:very |overly )?accurate|accuracy (?:is|problem)|false information|hallucinat)\b|(?:неточн|неверн|неправильн|ошибочн|путаниц).{0,70}(?:данн|результат|расч[её]т|недел|показ)|(?:resultado|datos?|respuesta).{0,50}(?:incorrect|inexact|equivoc)/i),
  topic("точные результаты и данные", "accurate results and data", "love", /\b(?:very accurate|highly accurate|surprisingly accurate|accurate (?:results?|reading|tracking|translation)|spot on|dead accurate)\b/i),
  topic("не получается сохранить или экспортировать", "saving or exporting fails", "pain", /\b(?:export|save|download|share).{0,105}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|stuck|lost|quality|watermark|not work)|(?:can'?t|cannot|unable to|doesn'?t|does not|won'?t).{0,65}(?:export|save|download|share)|changes? (?:are not|aren'?t|won'?t be|don'?t get) saved\b/i),
  topic("не хватает нужной функции", "a needed feature is missing", "pain", /\b(?:please (?:add|bring back)|needs? (?:a|an|the).{0,45}(?:way|option|feature|button|setting|ability|function)|wish (?:it|there|you|i could)|missing feature|no option|should have (?:an? |the )?(?:option|feature|button|setting|ability|function)|would (?:be great|like|love|help) (?:if|to)|feature request|needs to add|bring (?:it|them) back)\b|(?:добавьте|верните|не хватает|нет функции|нет возможности|хотелось бы|сделайте).{0,100}/i),
  topic("проблемы доступности", "accessibility problems", "pain", /\b(?:accessibility|voiceover|screen reader|visually impaired|hearing impaired).{0,90}(?:issue|problem|doesn'?t|not|poor|need|broken|unusable|nonfunction|inop)\b/i),
  topic("не работает на нужном устройстве", "device or platform compatibility problem", "pain", /\b(?:iphone|ipad|apple watch|android|mac|windows|tablet|device).{0,100}(?:not supported|doesn'?t work|won'?t work|can'?t|cannot|incompatible|missing|unavailable|no (?:landscape|portrait) mode)|(?:not compatible|unsupported|no (?:landscape|portrait) mode).{0,70}(?:device|phone|tablet|watch|platform|ipad|iphone)\b/i),
  topic("нет офлайн-режима или соединения", "offline or connection problem", "pain", /\b(?:offline|internet|connection|network|wi-?fi).{0,90}(?:doesn'?t|won'?t|can'?t|cannot|fail|problem|issue|required|need|lost|disconnect|not work)|(?:no internet|without internet).{0,65}(?:can'?t|cannot|doesn'?t|won'?t|useless)\b/i),
  topic("импорт или загрузка не работают", "import or upload does not work", "pain", /\b(?:import|upload|scan)\b.{0,100}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|stuck|wrong|not work)|(?:can'?t|cannot|unable to).{0,65}\b(?:import|upload|scan)\b/i),
  topic("спам, мошенники или фейковые аккаунты", "spam, scammers or fake accounts", "pain", /\b(?:scammers?|fake profiles?|fake accounts?|catfish(?:ing)?|spam accounts?|bots?)\b.{0,80}(?:many|full|everywhere|avoid|danger|problem|report|block|waste|scam)?\b/i),
  topic("модерация или цензура работают плохо", "moderation or censorship is poor", "pain", /\b(?:moderation|moderator|censor|content policy|community guideline|reported).{0,100}(?:unfair|bad|poor|random|nothing|ignored|wrong|remove|ban|allow|problem|issue)\b/i),
  topic("рекомендации и алгоритм не подходят", "recommendations or algorithm miss the mark", "pain", /\b(?:recommendation|algorithm|suggested|feed).{0,100}(?:bad|poor|wrong|irrelevant|same|repeat|doesn'?t|not interested|worse|random)\b/i),
  topic("не хватает контента или выбора", "content or selection is too limited", "pain", /\b(?:not enough|limited|small|lack of|missing).{0,55}(?:content|songs?|movies?|shows?|books?|courses?|lessons?|recipes?|options?|choices?|selection|templates?|workouts?)\b/i),
  topic("контент повторяется", "content keeps repeating", "pain", /\b(?:same|repeated|repeating|repetitive)\s+(?:content|songs?|movies?|shows?|books?|courses?|lessons?|recipes?|questions?|workouts?|things?|messages?|advice)\b|\b(?:content|songs?|movies?|shows?|books?|courses?|lessons?|recipes?|questions?|workouts?|messages?|advice)\b.{0,55}\b(?:repeats?|repetitive|same (?:thing|things) over and over)\b|\b(?:same thing|same things|same message|same advice)\b.{0,35}\b(?:over and over|again and again)\b/i),
  topic("большой выбор контента", "large content selection", "love", /\b(?:huge|massive|great|excellent|wide|large|tons of|lots of|so many).{0,55}(?:selection|library|variety|content|songs?|movies?|shows?|courses?|lessons?|recipes?|options?|workouts?)\b/i),
  topic("звук или видео не воспроизводятся", "audio or video playback fails", "pain", /\b(?:audio|sound|music|song|video|playback|stream).{0,100}(?:stop|skip|buffer|doesn'?t|won'?t|can'?t|no sound|fail|stutter|not play|cuts? out|freeze)\b/i),
  topic("GPS, геолокация или трекинг ошибаются", "GPS, location or tracking is wrong", "pain", /\b(?:gps|location|route|distance|tracking|map).{0,100}(?:wrong|inaccurate|doesn'?t|won'?t|lost|jump|fail|off by|not work|problem)\b/i),
  topic("доставка опаздывает или не приезжает", "delivery is late or never arrives", "pain", /\b(?:delivery|deliveries|order|box|shipment|package).{0,110}(?:late|delay|never arriv|didn'?t arrive|doesn'?t arrive|not arrive|not here|not at all|lost|postpon|missing|no show|wrong address|past dinner)|(?:late|delay|lost|never arrived|all day wait|supposed to be here).{0,90}(?:delivery|deliveries|order|box|shipment|package|dinner)|(?:box|order) never (?:sent|shipped)\b/i),
  topic("в заказе не хватает позиций", "items are missing or wrong in the order", "pain", /\b(?:order|box|delivery|package).{0,100}(?:missing|wrong|incorrect|left out|not included|forgot)|(?:missing|wrong|incorrect|left out).{0,60}(?:item|ingredient|meal|order|product|protein|meat|menu card|recipe card)\b/i),
  topic("еда или товар испорчены", "food or goods arrived spoiled", "pain", /\b(?:food|meal|meat|ingredient|produce|vegetable|box|package|item).{0,85}(?:spoiled|rotten|stale|mold|mould|warm|thawed|damaged|broken|leak|expired|bad quality)|(?:spoiled|rotten|stale|mold|mould|warm|thawed|damaged|broken|expired).{0,70}(?:food|meal|meat|ingredient|produce|item|package)|(?:delivery|box).{0,45}(?:4[5-9]|5\d|6\d)\s*°?f\b/i),
  topic("сложно отменить заказ или подписку", "cancellation is difficult", "pain", /\b(?:cancel|cancellation|unsubscribe|close (?:my )?account).{0,110}(?:can'?t|cannot|won'?t|impossible|difficult|hard|hidden|hell|hassle|ridiculous|cult|jump through|still charg|no option|not allow)|(?:can'?t|cannot|unable to).{0,65}(?:cancel|unsubscribe|close (?:my )?account)|trying to cancel.{0,80}(?:hell|hassle|ridiculous|cult|jump through)\b/i),
  topic("слишком дорого или много сборов", "too expensive or too many fees", "pain", /\b(?:expensive|overpriced|too (?:much|expensive)|high price|pricey|pricy|rip-?off|not worth|costs? too much|fees? (?:are|is|cost)|service fee|delivery fee|shipping fee|hidden fee)\b/i),
  topic("промокод или скидка не сработали", "promo code or discount did not work", "pain", /\b(?:promo|coupon|voucher|discount|deal).{0,100}(?:doesn'?t|didn'?t|won'?t|not (?:work|apply|applied)|invalid|disappear|charged full|mislead|fail)\b/i),
  topic("неудобный или запутанный интерфейс", "confusing or cumbersome interface", "pain", /\b(?:confusing|clunky|cumbersome|hard to (?:use|navigate|find)|difficult to (?:use|navigate|find)|poor interface|bad ui|terrible ui|unintuitive|not user friendly)\b/i),
  topic("понятно и удобно пользоваться", "clear and easy to use", "love", /\b(?:easy to use|simple to use|user[ -]?friendly|intuitive|straightforward|easy to navigate|clean interface|well designed|simple and easy)\b/i),
  topic("стабильно и надёжно работает", "stable and reliable", "love", /\b(?:reliable|works perfectly|works great|never had (?:a )?problem|no issues|does exactly what|always works|flawless|works every time)\b/i),
  topic("помогает добиться результата", "helps achieve the intended result", "love", /\b(?:helped me|helps me|changed my life|life saver|lifesaver|made it (?:easy|possible)|couldn'?t (?:do|have done).{0,45}without|achieve|reached my goal|made a difference)\b/i),
  topic("заметный эффект от продукта", "noticeable product benefit", "love", /\b(?:it (?:really|actually) works|works for me|i (?:feel|am feeling) (?:much )?better|noticeable difference|real results?|seeing results?|improved my|is helping me)|\b(?:lost|gained|put on)\s+\d+(?:\.\d+)?\s*(?:lb|lbs|pounds?|kg|kilos?)\b/i),
  topic("полезные функции и материалы", "useful features and resources", "love", /\b(?:great|excellent|amazing|invaluable|useful|helpful).{0,40}(?:resource|tool|features?|information|content)\b/i),
  topic("бесплатная версия действительно полезна", "the free version is genuinely useful", "love", /\b(?:completely free|actually free|free version).{0,100}(?:enough|great|useful|works|love|everything (?:i|you) need|no ads|without ads)|\bfree\b.{0,80}(?:great|useful|excellent|amazing|everything (?:i|you) need|never (?:had|need) to pay|no ads)|(?:no ads|without ads).{0,80}(?:free|great|love|perfect)\b/i),
  topic("гибкие настройки под себя", "flexible customization", "love", /\b(?:customiz|personaliz|many options|lots of options|flexible|set it up).{0,95}(?:need|want|preference|workflow|way|own|like)\b/i),
  topic("хорошее соотношение цены и пользы", "good value for money", "love", /\b(?:worth (?:every penny|the money|it)|good value|great value|best value|affordable|reasonably priced|fair price|cost effective)\b/i),
  topic("приятный дизайн", "pleasant design", "love", /\b(?:beautiful|gorgeous|elegant|clean|lovely|great|nice).{0,45}(?:design|interface|ui|layout|animation)|(?:design|interface|ui|layout).{0,45}(?:beautiful|gorgeous|elegant|clean|lovely|great|nice)\b/i),
  topic("виден прогресс и хочется продолжать", "visible progress and motivation", "love", /\b(?:motivates? me|keeps? me motivated|stay consistent|keeps? me on track|track my progress|see my progress|reached my goal|streak).{0,75}(?:help|love|great|work|daily|goal)?\b/i),
  topic("совместная работа и обмен", "collaboration and sharing", "love", /\b(?:share|shared|collaborat|together).{0,90}(?:family|partner|team|coworker).{0,50}(?:use|sync|work)|(?:family|partner|team|coworker).{0,70}(?:shared|collaborat|together)\b/i),
  topic("вкусная и свежая еда", "tasty and fresh food", "love", /\b(?:food|meal|meals|ingredient|ingredients|produce|meat).{0,80}(?:delicious|tasty|fresh|flavorful|yummy|excellent|amazing|great quality|great tasting|enjoyable|loved)|(?:delicious|tasty|fresh|flavorful|yummy|tastiest|great tasting|loved).{0,60}(?:food|meal|meals|ingredient|ingredients|produce)\b/i),
  topic("доставка вовремя", "delivery arrives on time", "love", /\b(?:delivery|order|box|shipment|package).{0,70}(?:on time|reliable|always arrives|arrived early|prompt)|(?:on time|reliable|prompt).{0,55}(?:delivery|order|box|shipment|package)\b/i),
  topic("слишком жёсткие лимиты использования", "usage limits are too restrictive", "pain", /\b(?:usage|message|generation|daily|weekly|monthly|token|time).{0,70}(?:limits?|cap).{0,90}(?:low|excessive|restrict|useless|hour|hit|reach|stop|wait)|(?:limits?|cap).{0,70}(?:usage|messages?|generations?|queries|tokens?).{0,80}(?:low|restrict|excessive|useless|hit|reach)\b/i),
  topic("плохое качество результата", "poor output quality", "pain", /\b(?:result|output|photo|image|video|answer|translation).{0,95}(?:terrible|awful|bad quality|blurry|distorted|wrong|useless|nothing like|poor)|(?:terrible|awful|blurry|distorted|poor).{0,65}(?:result|output|photo|image|video|answer|translation)\b/i),
  topic("хорошее качество результата", "high output quality", "love", /\b(?:result|output|photo|image|video|answer|translation).{0,80}(?:amazing|excellent|beautiful|realistic|high quality|perfect|great)|(?:amazing|excellent|beautiful|realistic|perfect).{0,60}(?:result|output|photo|image|video|answer|translation)\b/i),
];

const DOMAIN_TOPICS = {
  "dating-apps": [
    topic("боты и фейковые анкеты", "bots and fake profiles", "pain", /\b(?:bots?|fake profiles?|scammers?|catfish(?:ing)?)\b/i, "niche"),
    topic("нельзя увидеть лайки без оплаты", "seeing likes is locked behind payment", "pain", /\b(?:pay|paid|premium|subscription).{0,80}(?:see|view|find out).{0,40}(?:who )?(?:liked|likes)|(?:see|view).{0,40}(?:who )?(?:liked|likes).{0,80}(?:pay|paid|premium|subscription)\b/i, "niche"),
    topic("не проходит проверка лица", "face verification fails", "pain", /\b(?:face|selfie|video).{0,35}verif|\bverif.{0,35}(?:face|selfie|video)\b/i, "niche"),
  ],
  "ai-avatars-headshots": [
    topic("результат не похож на человека", "the result does not resemble the person", "pain", /\b(?:doesn'?t|does not|didn'?t|did not|nothing|not).{0,30}(?:look like|resemble).{0,20}(?:me|my face|person)|\b(?:look|looks|looked).{0,20}nothing like\b/i, "niche"),
  ],
};

const MEAL_KIT_TOPICS = [
  topic("доставка ломает план питания", "delivery disrupts meal planning", "pain", /\b(?:counting on (?:their )?(?:food|meal|delivery)|scramble for meals|(?:delivery|box|order|shipment).{0,100}(?:late|delay|missing|doesn'?t arrive|not arrive).{0,180}(?:schedule|meal plan|planned dinner)|(?:schedule|meal plan|planned dinner).{0,180}(?:delivery|box|order|shipment).{0,100}(?:late|delay|missing|doesn'?t arrive|not arrive))\b/i, "niche"),
  topic("не хватает ингредиентов", "ingredients are missing", "pain", /\b(?:missing|forgot|left out|didn'?t include|not included|wrong).{0,55}(?:ingredient|ingredients|recipe card|meal kit)|(?:ingredient|ingredients|recipe card).{0,55}(?:missing|wrong|forgot|not included)\b/i, "niche"),
  topic("рецепт или инструкция недоступны", "recipe or instructions are unavailable", "pain", /\b(?:recipe|instructions?|menu cards?|recipe cards?|directions?).{0,85}(?:missing|not included|can'?t|cannot|won'?t|doesn'?t|unavailable|left out|forgot)|(?:can'?t|cannot|won'?t|doesn'?t|unable to).{0,60}(?:open|pull up|find|see).{0,45}(?:recipe|instructions?|menu cards?|recipe cards?)|no instructions?\b/i, "niche"),
  topic("слишком маленькие порции", "portions are too small", "pain", /\b(?:portion|serving|protein).{0,65}(?:small|tiny|skimpy|not enough|minimal|limited|smaller|hungry)|(?:small|tiny|skimpy|minimal).{0,45}(?:portion|serving|protein)\b/i, "niche"),
  topic("низкое качество ингредиентов", "ingredient quality is poor", "pain", /\b(?:food|meal|meat|ingredient|produce|vegetable|protein).{0,70}(?:low quality|poor quality|bad quality|bland|flavorless|tough|inedible|not fresh)|(?:low quality|poor quality|bad quality|bland|flavorless|tough|inedible).{0,55}(?:food|meal|meat|ingredient|produce|vegetable|protein)\b/i, "niche"),
  topic("нельзя заменить блюдо или ингредиент", "meals or ingredients cannot be substituted", "pain", /\b(?:can'?t|cannot|unable to|no option to).{0,65}(?:substitute|swap|replace|change (?:the )?(?:side|ingredient|meal))|(?:substitute|swap|replacement).{0,60}(?:not available|no option|can'?t|cannot)\b/i, "niche"),
  topic("сложно изменить или пропустить заказ", "changing or skipping an order is difficult", "pain", /\b(?:skip|change|edit|modify|pause).{0,75}(?:order|week|delivery|meal).{0,75}(?:difficult|hard|issue|problem|can'?t|cannot|won'?t|wrong|not work)|(?:difficult|hard|can'?t|cannot|unable to).{0,65}(?:skip|change|edit|modify|pause).{0,45}(?:order|week|delivery|meal)\b/i, "niche"),
  topic("слишком много упаковки", "too much packaging", "pain", /\b(?:too much|excessive|wasteful|so much|amount of).{0,45}(?:packaging|plastic)|(?:packaging|plastic).{0,55}(?:waste|excessive|environment|guilt|too much)\b/i, "niche"),
  topic("удобно готовить и планировать", "cooking and planning become easier", "love", /\b(?:meal planning|planning meals|cook|cooking|dinner).{0,110}(?:easy|easier|convenient|saves? time|less stress|game changer)|(?:easy|easier|convenient|saves? time).{0,90}(?:meal|dinner|cook|cooking|planning)\b/i, "niche"),
  topic("подходит для занятой семьи", "works well for a busy household", "love", /\b(?:busy|working).{0,45}(?:family|families|mom|dad|household|schedule|life).{0,90}(?:easy|easier|convenient|help|perfect|great)|(?:easy|easier|convenient|perfect|great).{0,75}(?:busy|working).{0,35}(?:family|families|mom|dad|household|schedule|life)\b/i, "niche"),
  topic("учит готовить", "helps people learn to cook", "love", /\b(?:learn(?:ed|ing)? to cook|taught me to cook|cooking skills?.{0,45}(?:improv|better)|feel like (?:i )?can cook|food prep school)\b/i, "niche"),
  topic("экономит покупки и продукты", "saves shopping and food waste", "love", /\b(?:save|saving|saves).{0,55}(?:groceries|grocery|shopping|food|money|waste|time)|(?:less|no more).{0,45}(?:food waste|grocery shopping|shopping trips)|(?:nothing|less).{0,30}(?:goes to waste|wasted)\b/i, "niche"),
  topic("понятные рецепты", "recipes are easy to follow", "love", /\b(?:recipe|instructions?|directions?).{0,65}(?:easy to follow|clear|simple|straightforward)|(?:easy to follow|clear|simple|straightforward).{0,45}(?:recipe|instructions?|directions?)\b/i, "niche"),
];
DOMAIN_TOPICS["food-delivery"] = [...(DOMAIN_TOPICS["food-delivery"] || []), ...MEAL_KIT_TOPICS];
DOMAIN_TOPICS["recipes-meal-planning"] = [...(DOMAIN_TOPICS["recipes-meal-planning"] || []), ...MEAL_KIT_TOPICS];
DOMAIN_TOPICS["meal-prep-grocery"] = [...(DOMAIN_TOPICS["meal-prep-grocery"] || []), ...MEAL_KIT_TOPICS];

const FALLBACKS = {
  love: { name: "общая положительная оценка", nameEn: "overall positive experience", polarity: "love", fallback: true, scope: "fallback" },
  mixed: { name: "смешанная оценка без конкретной причины", nameEn: "mixed experience without a specific reason", polarity: "mixed", fallback: true, scope: "fallback" },
  pain: { name: "негативный опыт без конкретной причины", nameEn: "negative experience without a specific reason", polarity: "pain", fallback: true, scope: "fallback" },
};

const publicTheme = ({ name, nameEn, polarity, scope, fallback }) => ({ name, nameEn, polarity, scope, ...(fallback ? { fallback: true } : {}) });

export function createCorpusLabeler() {
  return (slug, review) => {
    const reviewText = String(review.text || "").replace(/[’‘]/g, "'").replace(/\s+/g, " ");
    const matches = [];
    const seen = new Set();
    for (const candidate of [...(DOMAIN_TOPICS[slug] || []), ...TOPICS]) {
      candidate.pattern.lastIndex = 0;
      if (!candidate.pattern.test(reviewText) || seen.has(candidate.name)) continue;
      seen.add(candidate.name);
      matches.push(publicTheme(candidate));
    }
    const lateDelivery = matches.some((match) => match.name === "доставка опаздывает или не приезжает");
    if (lateDelivery) {
      const onTimeIndex = matches.findIndex((match) => match.name === "доставка вовремя");
      if (onTimeIndex !== -1) matches.splice(onTimeIndex, 1);
    }
    const immediateBlock = matches.some((match) => match.name === "аккаунт заблокировали сразу после регистрации");
    if (immediateBlock) {
      const genericBlockIndex = matches.findIndex((match) => match.name === "аккаунт заблокирован или удалён");
      if (genericBlockIndex !== -1) matches.splice(genericBlockIndex, 1);
    }
    const unansweredSupport = matches.some((match) => match.name === "поддержка не отвечает");
    if (unansweredSupport) {
      const genericSupportIndex = matches.findIndex((match) => match.name === "поддержка не помогает");
      if (genericSupportIndex !== -1) matches.splice(genericSupportIndex, 1);
    }
    if (matches.length) return matches.slice(0, 8);
    const rating = Number(review.rating) || 0;
    return [rating >= 4 ? FALLBACKS.love : rating <= 2 ? FALLBACKS.pain : FALLBACKS.mixed];
  };
}

export function summarizeThemes(reviews, metadata) {
  const counts = new Map();
  for (const review of reviews) {
    const names = Array.isArray(review.themes) && review.themes.length ? review.themes : review.theme ? [review.theme] : [];
    for (const name of new Set(names)) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => {
      const theme = metadata.get(name) || (name === FALLBACKS.love.name ? FALLBACKS.love : name === FALLBACKS.pain.name ? FALLBACKS.pain : FALLBACKS.mixed);
      return { name, nameEn: theme.nameEn, polarity: theme.polarity, count, ...(theme.fallback ? { fallback: true } : {}), ...(theme.scope ? { scope: theme.scope } : {}) };
    })
    .sort((a, b) => Number(Boolean(a.fallback)) - Number(Boolean(b.fallback)) || b.count - a.count);
}
