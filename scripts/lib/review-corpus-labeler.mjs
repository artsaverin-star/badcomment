const topic = (name, nameEn, polarity, pattern, scope = "universal") => ({ name, nameEn, polarity, pattern, scope });

// Per-review topics are deliberately short and literal. Strategic niche
// findings live in reviewNichePatterns.json and are shown separately: using
// those editorial conclusions as if they were literal labels made the reader
// hard to scan and forced unrelated texts into an attractive-sounding story.
const TOPICS = [
  topic("триал, списание и возврат", "trial, charge and refund", "pain", /\b(?:free trial|trial period).{0,100}(?:charg|bill|refund|cancel)|(?:charg|bill|refund).{0,100}(?:free trial|trial period)\b/i),
  topic("дорогая подписка или пейволл", "expensive subscription or paywall", "pain", /\b(?:subscription|premium|paywall|membership|paid plan|in-app purchase).{0,100}(?:expensive|overpriced|too much|not worth|useless|can'?t|cannot|nothing|still (?:have|need) to pay|locked|forced)|(?:pay|paid|payed|paying).{0,80}(?:again|extra|more|everything|feature|even after|but still)|(?:no|without any) free features?|nothing.{0,30}(?:is|for)? free|everything.{0,35}(?:costs|paid|paywall)|have to pay for (?:every|anything)|(?:need|needed|have|required|forced|asks? you) to pay|(?:can'?t|cannot|won'?t|doesn'?t).{0,65}(?:use|start|continue|click|play|listen|access).{0,45}(?:unless|without).{0,20}(?:pay|subscription)|(?:unless|without).{0,20}(?:you )?(?:pay|subscribe)\b/i),
  topic("списание без согласия", "charge without consent", "pain", /\b(?:(?:charg(?:ed|ing)?|took|withdrawn?|deducted).{0,90}(?:without (?:me knowing|my knowledge|my permission|permission|consent|approval)|never (?:purchased|subscribed|agreed|signed up)|didn'?t (?:buy|purchase|subscribe|agree|approve|authori[sz]e))|(?:never (?:purchased|subscribed|agreed|signed up)|didn'?t (?:buy|purchase|subscribe|agree|approve|authori[sz]e)).{0,90}(?:charg(?:ed|ing)?|took money|payment))\b/i),
  topic("ошибка оплаты или двойное списание", "payment failure or duplicate charge", "pain", /\b(?:payment|card|purchase|transaction|charg).{0,100}(?:fail|declin|error|twice|double|duplicate|multiple|again|not (?:work|go through)|unrecogn|after (?:i )?cancel)|(?:double|duplicate|multiple|unauthori[sz]ed|didn'?t authori[sz]e|did not authori[sz]e|without (?:my )?authori[sz]ation).{0,70}(?:charg|payment|transaction|money)|(?:charg|took money).{0,70}(?:without (?:my )?authori[sz]ation|didn'?t authori[sz]e|did not authori[sz]e|after (?:i )?cancel)\b/i),
  topic("возврат денег не приходит", "refund is missing or refused", "pain", /\b(?:(?:refund|money back|reimbursement).{0,110}(?:never (?:arriv|came|got)|not (?:arriv|received|got)|still waiting|months?|weeks?|refus|denied|declined|coupon|instead|missing|nothing|won'?t|wouldn'?t)|(?:never (?:received|got)|still waiting for|refus(?:ed|ing)?|denied).{0,85}(?:refund|money back|reimbursement)|reembolso.{0,100}(?:nunca|no llega|meses|semanas|cup[oó]n|nada)|(?:no devuelv|no regres).{0,80}(?:dinero|pago|reembolso))\b/i),
  topic("покупка или премиум не разблокировались", "purchase or premium did not unlock", "pain", /\b(?:paid|purchased|bought|subscribed).{0,110}(?:still (?:ask|prompt)|not (?:unlock|show|work)|can'?t (?:use|access)|without (?:premium|features?)|buy (?:again|the paid)|restore)|(?:restore purchases?|premium features?|paid features?).{0,100}(?:not work|missing|locked|can'?t|cannot|fail)\b/i),
  topic("реклама мешает пользоваться", "ads disrupt the experience", "pain", /\b(?:ads?|advert|advertisement|commercials?)\b.{0,70}\b(?:annoy|intrusive|unusable|constant|remove|interrupt|disrupt|freeze|nonstop|too many|pops? up)|\b(?:too many|constant|intrusive|annoying|unskippable|nonstop|every (?:single )?(?:tap|click|time|button)).{0,70}\b(?:ads?|advert|advertisement|commercials?)\b|реклам.{0,90}(?:меша|кажд|много|постоян)|(?:cada|muchos?|demasiados?) anuncios?/i),
  topic("вылеты, зависания и ошибки", "crashes, freezes and errors", "pain", /\b(?:crash(?:es|ed|ing)?|freez(?:e|es|ing)?|frozen|buggy|glitch(?:y|es|ed|ing)?|software bugs?|error messages?|black screen|white screen|won'?t open|doesn'?t open|stopped working|not working|broken|unresponsive|none of the (?:buttons?|features?) work|buttons? (?:do not|don'?t|won'?t) work|(?:app|software|update|version|feature).{0,20}(?:has|have|with|introduced|full of).{0,12}bugs?|bugs?.{0,18}(?:in|with).{0,12}(?:app|software|update|version|feature)|bug fixes?|fix(?:ed|ing)?.{0,18}bugs?)\b|(?:не работает|не открывается|вылетает|зависает|ошибка|белый экран)|(?:no funciona|mensaje de error|se cierra|se queda pensando)/i),
  topic("обновление сломало привычный сценарий", "an update broke a familiar workflow", "pain", /\b(?:after|since|latest|new|recent).{0,50}(?:updates?|upgrades?|versions?).{0,110}(?:worse|broke|broken|crash|freez|missing|removed|change|unusable|ruined|awful)|(?:updates?|upgrades?|versions?).{0,90}(?:ruined|worse|broke|removed|destroyed|awful)\b|(?:после|с).{0,40}(?:обновлен|новой верси).{0,100}(?:хуже|слом|пропал|не работа)/i),
  topic("не получается войти или зарегистрироваться", "login or signup does not work", "pain", /\b(?:can'?t|cannot|unable|won'?t|doesn'?t).{0,75}(?:log ?in|sign ?in|register|create (?:an )?account|access (?:my )?account|reset (?:my )?password)|(?:login|sign ?in|password|verification code|account access).{0,75}(?:fail|error|problem|issue|loop|locked|not work)|(?:creat(?:e|ing)|mak(?:e|ing)|set(?:ting)? up).{0,45}(?:an? )?account.{0,80}(?:fail|error|problem|issue|can'?t|cannot|won'?t|not work|too many accounts)|too many accounts.{0,70}(?:device|phone|app)\b/i),
  topic("не проходит проверка личности", "identity verification fails", "pain", /\b(?:(?:identity|id|document|selfie|face|kyc).{0,40}verif(?:y|ication).{0,90}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|reject|stuck|not work)|verif(?:y|ication).{0,70}(?:identity|id|document|selfie|face|passport|driver'?s? licen[cs]e).{0,90}(?:fail|error|reject|doesn'?t|won'?t|can'?t|cannot|not work)|no matter how clear.{0,80}(?:id|document|passport|licen[cs]e).{0,60}(?:fail|reject))\b/i),
  topic("чужой доступ или кража аккаунта", "unauthorized access or account theft", "pain", /\b(?:(?:someone|somebody|another person).{0,80}(?:using|used|stole|hacked|accessed).{0,55}(?:my )?(?:account|email|profile|identity)|(?:identity theft|stolen (?:account|email|identity)|account (?:was |got )?hacked|hacked (?:my )?account|unauthori[sz]ed access))\b/i),
  topic("аккаунт заблокировали сразу после регистрации", "account blocked immediately after signup", "pain", /\b(?:(?:immediately|instantly|right away|within (?:a few )?(?:seconds?|minutes?|hours?)).{0,100}(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out)|(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out).{0,100}(?:immediately|instantly|right away|within (?:a few )?(?:seconds?|minutes?|hours?)|before (?:i|we) (?:could|even got to) use)|(?:new|brand new).{0,45}(?:account|profile).{0,100}(?:ban(?:ned)?|suspend(?:ed)?|blocked|disabled|locked out|booted out))\b/i),
  topic("аккаунт заблокирован или удалён", "account blocked or deleted", "pain", /\b(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|locked out|disabled|terminated|deleted my account)\b.{0,110}(?:account|reason|appeal|support|explanation|profile)|\b(?:account|profile).{0,90}(?:ban(?:ned)?|suspend(?:ed|ing)?|blocked|disabled|terminated|deleted|remov(?:ed|al)|deactivat(?:ed|ion))\b/i),
  topic("апелляция на блокировку не помогла", "account-ban appeal did not help", "pain", /\b(?:appeal(?:ed|ing)?|filed an appeal).{0,160}(?:ban (?:was )?upheld|upheld (?:the )?ban|denied|rejected|declined|refused|no proof|no evidence|no explanation|without (?:proof|evidence|explanation)|nothing)|(?:ban|suspension|account removal).{0,120}(?:appeal).{0,100}(?:denied|rejected|declined|refused|upheld|didn'?t help|did not help|no response)\b/i),
  topic("блокировка после жалобы пользователя", "account blocked after another user's report", "pain", /\b(?:(?:ban(?:ned)?|blocked|suspend(?:ed)?|account (?:was |has been )?removed).{0,220}(?:reported me|reported my (?:account|profile)|false report|fake report|mass report)|(?:reported me|reported my (?:account|profile)|false report|fake report|mass report).{0,220}(?:ban(?:ned)?|blocked|suspend(?:ed)?|account (?:was |has been )?removed))\b/i),
  topic("поддержка не отвечает", "support does not respond", "pain", /\b(?:(?:customer (?:service|support)|support team|help desk|developer|support).{0,120}(?:(?:no|zero) (?:response|reply)|never (?:respond(?:ed|s|ing)?|repl(?:y|ied|ies|ying))|(?:didn'?t|doesn'?t|won'?t|will not) (?:respond|reply)|got nothing back|didn'?t hear back|ignor(?:e|es|ed|ing))|(?:(?:no|zero) (?:response|reply)|never (?:respond(?:ed|s|ing)?|repl(?:y|ied|ies|ying))|got nothing back|didn'?t hear back|ignor(?:e|es|ed|ing)).{0,100}(?:support|customer service|email|ticket|message))\b/i),
  topic("нет способа связаться с поддержкой", "no way to contact support", "pain", /\b(?:(?:write to us|contact us|contact support|get in touch|reach (?:them|support)).{0,130}(?:without (?:any )?contact|no (?:contact|email|phone|form|way)|can'?t|cannot|how to reach|only (?:on|through|via)|facebook messenger|instagram)|(?:no (?:contact|email|phone|form|way)|without (?:any )?contact).{0,110}(?:support|customer service|contact|reach (?:them|support)))\b/i),
  topic("поддержка не помогает", "support does not help", "pain", /\b(?:customer (?:service|support)|support team|help desk|developer|support).{0,110}(?:no response|never (?:respond|reply)|unhelpful|useless|terrible|poor|bad|ignore|robot|bot|can'?t help|won'?t help|doesn'?t help|didn'?t understand|hung up|refus)|(?:no response|never (?:respond|reply)|ignored).{0,90}(?:support|email|ticket|message)\b/i),
  topic("поддержка решила проблему", "support resolved the issue", "love", /\b(?:customer (?:service|support)|support team|developer|support).{0,100}(?:helpful|amazing|excellent|great|quick|fast|resolved|fixed)|(?:resolved|fixed|helped).{0,80}(?:support|service|team)\b/i),
  topic("пропали данные или прогресс", "data or progress disappeared", "pain", /\b(?:lost|lose|delet|disappear|gone|wiped|eras|restart).{0,95}(?:data|history|progress|entries|record|project|photo|video|notes?|account|playlist|recipe)|(?:data|history|progress|entries|record|project|playlist|recipe).{0,95}(?:lost|lose|delet|disappear|gone|wiped|eras|reset|restart)|(?:lost|deleted) my work\b|(?:пропал|потерял|удалил|сбросил).{0,70}(?:данн|прогресс|истори|запис)/i),
  topic("синхронизация или резервная копия не работают", "sync or backup does not work", "pain", /\b(?:sync|cloud|backup).{0,110}(?:fail|problem|issue|doesn'?t|won'?t|can'?t|lost|duplicate|wrong|stuck|not work)|(?:devices?|iphone|ipad|watch|computer).{0,100}(?:sync|cloud|backup).{0,70}(?:fail|problem|issue|doesn'?t|won'?t|not)\b/i),
  topic("медленная работа и долгие загрузки", "slow performance and long loading", "pain", /\b(?:very slow|so slow|too slow|sluggish|laggy|lagging|takes forever|loading forever|long load|slow performance|slow to load|slow to open)\b/i),
  topic("быстро и без задержек", "fast and responsive", "love", /\b(?:super fast|very fast|quick and easy|fast and easy|loads? (?:very )?quickly|responsive|instant(?:ly)?).{0,50}(?:app|result|work|load|process|use)?\b/i),
  topic("расход батареи или перегрев", "battery drain or overheating", "pain", /\b(?:battery).{0,70}(?:drain|kill|die|usage|consume)|\b(?:overheat|heats? (?:up )?(?:my )?(?:phone|device))\b/i),
  topic("лишние разрешения и приватность", "privacy and excessive permissions", "pain", /\b(?:(?:privacy|personal data|data collection|location access|permission|microphone access|contacts access).{0,80}(?:concern|issue|problem|without|force|require|why|bad|unsafe|invasive|violation|risk|worried|records?|too much|excessive)|(?:track my location|sell(?:ing)? (?:my )?(?:data|information)|data breach|breached|dark web|spyware))\b/i),
  topic("уведомления или напоминания не работают", "notifications or reminders do not work", "pain", /\b(?:notification|reminder|alert).{0,95}(?:too many|spam|annoy|doesn'?t|don'?t|won'?t|not work|late|missing|wrong|never|fail)|(?:too many|spam|never (?:get|receive)|not receiving).{0,70}(?:notification|reminder|alert)\b/i),
  topic("поиск или фильтры не находят нужное", "search or filters fail", "pain", /\b(?:search|filter).{0,100}(?:doesn'?t|don'?t|won'?t|can'?t|cannot|bad|poor|useless|wrong|not work)|(?:can'?t|cannot|unable to).{0,65}(?:find|search|filter)\b/i),
  topic("неточные результаты или данные", "inaccurate results or data", "pain", /\b(?:inaccurate|incorrect|wrong (?:data|result|answer|location|calculation|information|reading|distance|pace|translation)|not (?:very |overly )?accurate|accuracy (?:is|problem)|false information|hallucinat)\b|(?:неточн|неверн|неправильн|ошибочн|путаниц).{0,70}(?:данн|результат|расч[её]т|недел|показ)|(?:resultado|datos?|respuesta).{0,50}(?:incorrect|inexact|equivoc)/i),
  topic("не соответствует рекламе или описанию", "does not match its ads or description", "pain", /\b(?:bait and switch|false advertis(?:e|ing|ement)|misleading (?:ad|ads|advertis(?:e|ing|ement)|description|marketing|claim)|not (?:what|as) (?:advertised|described|promised|shown)|nothing like (?:the )?(?:ad|advertisement|description)|ad(?:s|vertisement)?.{0,90}(?:misleading|lied|lie|different)|(?:lied|lying) about (?:being|it being|the app)|no es lo que (?:anuncia|promete))\b/i),
  topic("подозрение на мошенничество", "suspected scam or fraud", "pain", /\b(?:is (?:a |an )?(?:total )?scam|scam app|total scam|fraud(?:ulent)? app|scammed me|rip(?:ped)? me off|estafa(?:dores?)?|es una estafa|son estafadores)\b/i),
  topic("не получается вывести деньги", "money cannot be withdrawn", "pain", /\b(?:(?:can'?t|cannot|unable to|won'?t|doesn'?t|not able to).{0,60}(?:withdraw|cash out|take out|get (?:my )?money)|(?:withdrawal|cash ?out).{0,90}(?:fail|error|stuck|pending|blocked|disabled|unavailable|not work|won'?t|doesn'?t)|(?:funds?|money|bitcoin|crypto).{0,75}(?:hostage|stuck|locked).{0,45}(?:account|app|platform)?|no (?:puedo|deja) (?:retirar|sacar).{0,40}(?:dinero|fondos?))\b/i),
  topic("точные результаты и данные", "accurate results and data", "love", /\b(?:very accurate|highly accurate|surprisingly accurate|accurate (?:results?|reading|tracking|translation)|spot on|dead accurate)\b/i),
  topic("не получается сохранить или экспортировать", "saving or exporting fails", "pain", /\b(?:export|save|download|share).{0,105}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|stuck|lost|quality|watermark|not work)|(?:can'?t|cannot|unable to|doesn'?t|does not|won'?t).{0,65}(?:export|save|download|share)|changes? (?:are not|aren'?t|won'?t be|don'?t get) saved\b/i),
  topic("не хватает нужной функции", "a needed feature is missing", "mixed", /\b(?:please (?:add|bring back)|needs? (?:a|an|the).{0,45}(?:way|option|feature|button|setting|ability|function)|wish (?:it|there|you|i could)|missing feature|no option|should have (?:an? |the )?(?:option|feature|button|setting|ability|function)|would (?:be great|like|love|help) (?:if|to)|feature request|needs to add|bring (?:it|them) back)\b|(?:добавьте|верните|не хватает|нет функции|нет возможности|хотелось бы|сделайте).{0,100}/i),
  topic("проблемы доступности", "accessibility problems", "pain", /\b(?:accessibility|voiceover|screen reader|visually impaired|hearing impaired).{0,90}(?:issue|problem|doesn'?t|not|poor|need|broken|unusable|nonfunction|inop)\b/i),
  topic("не работает на нужном устройстве", "device or platform compatibility problem", "pain", /\b(?:iphone|ipad|apple watch|android|mac|windows|tablet|device).{0,100}(?:not supported|doesn'?t work|won'?t work|can'?t|cannot|incompatible|missing|unavailable|no (?:landscape|portrait) mode)|(?:not compatible|unsupported|no (?:landscape|portrait) mode).{0,70}(?:device|phone|tablet|watch|platform|ipad|iphone)\b/i),
  topic("нет офлайн-режима или соединения", "offline or connection problem", "pain", /\b(?:offline|internet|connection|network|wi-?fi).{0,90}(?:doesn'?t|won'?t|can'?t|cannot|fail|problem|issue|required|need|lost|disconnect|not work)|(?:no internet|without internet).{0,65}(?:can'?t|cannot|doesn'?t|won'?t|useless)\b/i),
  topic("импорт или загрузка не работают", "import or upload does not work", "pain", /\b(?:import|upload|scan)\b.{0,100}(?:fail|error|doesn'?t|won'?t|can'?t|cannot|stuck|wrong|not work)|(?:can'?t|cannot|unable to).{0,65}\b(?:import|upload|scan)\b/i),
  topic("спам, мошенники или фейковые аккаунты", "spam, scammers or fake accounts", "pain", /\b(?:(?:scammers?|fake profiles?|fake accounts?|catfish(?:ing)?|spam accounts?)|(?:too many|full of|only|nothing but|mostly|all).{0,30}bots?|bots?.{0,45}(?:everywhere|fake|scam|spam|problem|avoid|ruin|annoy))\b/i),
  topic("опасный контент не модерируется", "dangerous content is not moderated", "pain", /\b(?:(?:child trafficking|human trafficking|selling (?:babies|children|kids)|illegal listings?|dangerous content|disturbing (?:content|listings?|descriptions?)).{0,130}(?:app|allow|report|moder|remove|fix|stop|quiet|nothing|disgust)|(?:app|platform|moderation).{0,120}(?:allow|ignore|doesn'?t remove|won'?t remove|does nothing).{0,80}(?:trafficking|illegal|dangerous|disturbing|abuse))\b/i),
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
    topic("боты и фейковые анкеты", "bots and fake profiles", "pain", /\b(?:fake profiles?|scammers?|catfish(?:ing)?|(?:too many|full of|only|nothing but|mostly|all).{0,30}bots?|bots?.{0,45}(?:everywhere|fake|scam|spam|problem|avoid|ruin|annoy))\b/i, "niche"),
    topic("нельзя увидеть лайки без оплаты", "seeing likes is locked behind payment", "pain", /\b(?:pay|paid|premium|subscription).{0,80}(?:see|view|find out).{0,40}(?:who )?(?:liked|likes)|(?:see|view).{0,40}(?:who )?(?:liked|likes).{0,80}(?:pay|paid|premium|subscription)\b/i, "niche"),
    topic("не проходит проверка лица", "face verification fails", "pain", /\b(?:face|selfie|video).{0,35}verif|\bverif.{0,35}(?:face|selfie|video)\b/i, "niche"),
  ],
  "ai-avatars-headshots": [
    topic("результат не похож на человека", "the result does not resemble the person", "pain", /\b(?:doesn'?t|does not|didn'?t|did not|nothing|not).{0,30}(?:look like|resemble).{0,20}(?:me|my face|person)|\b(?:look|looks|looked).{0,20}nothing like\b/i, "niche"),
  ],
};

DOMAIN_TOPICS["ride-hailing"] = [
  topic("водитель отменяет или не приезжает", "driver cancels or never arrives", "pain", /\b(?:(?:driver|chauffeur).{0,90}(?:cancel|never (?:arriv|show)|doesn'?t (?:arrive|show)|won'?t (?:arrive|show)|no show)|(?:cancel|never (?:arriv|show)|doesn'?t (?:arrive|show)).{0,70}(?:driver|ride)|conductores?.{0,90}(?:cancel|no llega|nunca llega|no aparece)|(?:cancelan|no llega|nunca llega).{0,70}(?:conductor|viaje))\b/i, "niche"),
  topic("не удаётся найти водителя", "no drivers are available", "pain", /\b(?:(?:no|never any|can'?t find|cannot find|not enough).{0,45}(?:drivers?|cars?|rides?)|(?:drivers?|cars?).{0,55}(?:not available|unavailable|none available)|(?:no hay|nunca hay).{0,35}(?:conductores?|carros?|viajes?))\b/i, "niche"),
  topic("списали деньги за несостоявшуюся поездку", "charged for a ride that did not happen", "pain", /\b(?:(?:charg(?:ed|ing)?|paid|payment).{0,90}(?:driver cancel|ride cancel|trip cancel|never (?:arriv|happen)|no ride|didn'?t (?:arrive|happen))|(?:driver|ride|trip).{0,80}(?:cancel|never (?:arriv|happen)).{0,80}(?:charg|paid|payment)|(?:cobran|cobrado|pagu[ée]).{0,80}(?:no llega|cancel|sin viaje)|(?:conductor|viaje).{0,70}(?:cancel|no llega).{0,70}(?:cobran|cobrado|pagu[ée]))\b/i, "niche"),
];

DOMAIN_TOPICS["workout-fitness"] = [
  topic("план не учитывает домашние тренировки и инвентарь", "plan ignores home-workout and equipment choices", "pain", /\b(?:(?:selected|chose|asked for|wanted|set).{0,60}(?:home|chair|no equipment|bodyweight).{0,120}(?:gym equipment|weights?|machines?|gym based)|(?:home|chair|no equipment|bodyweight).{0,100}(?:plan|workout|exercise).{0,100}(?:gym equipment|weights?|machines?|gym based|required equipment)|(?:plan|workout|exercise).{0,100}(?:ignores?|doesn'?t respect|didn'?t respect).{0,60}(?:equipment|home|preference|selection))\b/i, "niche"),
];

DOMAIN_TOPICS["crypto-investing"] = [
  topic("майнинг останавливается без ежедневной активности", "mining stops without daily activity", "pain", /\b(?:(?:mining|miner|hash ?rate).{0,100}(?:stall|stop|pause|go down|decrease|loss|maintain).{0,100}(?:daily|every day|watch (?:ads?|videos?))|(?:watch (?:ads?|videos?)|log ?in every day|daily login).{0,100}(?:mining|miner|hash ?rate).{0,80}(?:work|run|maintain|keep))\b/i, "niche"),
];

DOMAIN_TOPICS["fishing"] = [
  topic("карты, прогноз и точки помогают на рыбалке", "maps, forecasts and spots help with fishing", "love", /\b(?:(?:maps?|spots?|tides?|bite score|wind|weather|catch log|route planning).{0,120}(?:help|useful|great|amazing|plan|find|catch|fish)|(?:find|finding|marking|plan|planning|catch).{0,90}(?:fish|fishing|fishing spots?|fishing trip))\b/i, "niche"),
];

DOMAIN_TOPICS["meditation-mindfulness"] = [
  topic("медитации успокаивают и снижают тревогу", "meditations calm the mind and ease anxiety", "love", /\b(?:(?:meditation|breathing|teaching|session).{0,110}(?:helps? (?:me )?(?:relax|calm|sleep|with anxiety)|calms?|relax(?:es|ing)?|un-?stress|reduces? (?:stress|anxiety)|anxiety relief|peace|comfort)|(?:relax|calm|peace|anxiety relief|reduce stress|un-?stress).{0,90}(?:meditation|breathing|session|app))\b/i, "niche"),
  topic("полезные медитации и практики", "useful meditations and practices", "love", /\b(?:(?:(?:guided )?meditations?|mindfulness (?:practice|course)|teachings?|breathing (?:practice|exercise)).{0,90}(?:helpful|supportive|well done|authentic|wisdom|daily practice|all levels|great|amazing)|(?:helpful|supportive|well done|authentic|great|amazing).{0,70}(?:meditations?|practice|teachings?|course))\b/i, "niche"),
];

DOMAIN_TOPICS["calendars-tasks"] = [
  topic("удобно планировать календарь и задачи", "calendar and task planning is convenient", "love", /\b(?:(?:planner|calendar|agenda|task list|to-?do list).{0,100}(?:organize|plan|runs? my life|effective|easy|convenient|sync|merge|everything|use it for)|(?:organize|plan|planning|runs? my life).{0,80}(?:day|week|life|tasks?).{0,60}(?:planner|calendar|agenda|app))\b/i, "niche"),
];

DOMAIN_TOPICS["ai-chatbot"] = [
  topic("полезные и качественные ответы", "useful, high-quality answers", "love", /\b(?:(?:answers?|responses?).{0,75}(?:quality|useful|complete|on point|helpful|readable|good|great|accurate)|(?:quality|useful|complete|on point|helpful|readable|good|great|accurate).{0,55}(?:answers?|responses?))\b/i, "niche"),
];

DOMAIN_TOPICS["focus-productivity"] = [
  topic("помогает сосредоточиться и меньше отвлекаться", "helps focus and avoid distractions", "love", /\b(?:helps? me (?:to )?focus|helping me (?:to )?focus|keeps? me focused|stay focused|without getting distracted|less distracted|stop (?:doom )?scrolling|phone addict(?:ed|ion).{0,70}(?:help|reality|focus)|cross off my to-?do list.{0,55}without.{0,30}distract)\b/i, "niche"),
];

DOMAIN_TOPICS["workout-fitness"] = [
  ...(DOMAIN_TOPICS["workout-fitness"] || []),
  topic("тренировки улучшают форму и уменьшают боль", "workouts improve fitness and reduce pain", "love", /\b(?:(?:workout|exercise|training|program).{0,120}(?:pain relief|relief|recovery|stronger|strength|balance|stay in shape|results?|feel better|helped immensely)|(?:pain relief|recovery|stronger|strength|balance|stay in shape|feel better).{0,100}(?:workout|exercise|training|program))\b/i, "niche"),
];

const MEAL_KIT_TOPICS = [
  topic("доставка ломает план питания", "delivery disrupts meal planning", "pain", /\b(?:counting on (?:their )?(?:food|meal|delivery)|scramble for meals|(?:delivery|box|order|shipment).{0,100}(?:late|delay|missing|doesn'?t arrive|not arrive).{0,180}(?:schedule|meal plan|planned dinner)|(?:schedule|meal plan|planned dinner).{0,180}(?:delivery|box|order|shipment).{0,100}(?:late|delay|missing|doesn'?t arrive|not arrive))\b/i, "niche"),
  topic("не хватает ингредиентов", "ingredients are missing", "pain", /\b(?:missing|forgot|left out|didn'?t include|not included|wrong).{0,55}(?:ingredient|ingredients|recipe card|meal kit)|(?:ingredient|ingredients|recipe card).{0,55}(?:missing|wrong|forgot|not included)\b/i, "niche"),
  topic("рецепт или инструкция недоступны", "recipe or instructions are unavailable", "pain", /\b(?:(?:instructions?|menu cards?|recipe cards?|directions?).{0,35}(?:are |is |were |was )?(?:missing|not included|unavailable|left out|forgotten)|recipes?.{0,35}(?:doesn'?t|won'?t|cannot|can'?t).{0,20}(?:load|open|show|appear|display)|(?:can'?t|cannot|won'?t|doesn'?t|unable to).{0,60}(?:open|pull up|find|see|access|load).{0,45}(?:recipe|instructions?|menu cards?|recipe cards?)|no instructions?\b(?!\s+(?:needed|required|necessary)))\b/i, "niche"),
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
    const unresolvedSupport = matches.some((match) => ["поддержка не отвечает", "поддержка не помогает", "нет способа связаться с поддержкой"].includes(match.name))
      || /\b(?:support|customer service|support team).{0,100}(?:never|not|no|didn'?t|hasn'?t).{0,35}(?:helpful|resolved|fixed|solution)\b/i.test(reviewText);
    if (unresolvedSupport) {
      const resolvedSupportIndex = matches.findIndex((match) => match.name === "поддержка решила проблему");
      if (resolvedSupportIndex !== -1) matches.splice(resolvedSupportIndex, 1);
    }
    const priceComplaint = matches.some((match) => ["дорогая подписка или пейволл", "слишком дорого или много сборов"].includes(match.name));
    const negatedValue = /\b(?:not|isn'?t|wasn'?t|never|hardly).{0,16}(?:worth (?:every penny|the money|it)|good value|great value|best value|affordable|reasonably priced|fair price|cost effective)\b/i.test(reviewText);
    if (priceComplaint || negatedValue) {
      const goodValueIndex = matches.findIndex((match) => match.name === "хорошее соотношение цены и пользы");
      if (goodValueIndex !== -1) matches.splice(goodValueIndex, 1);
    }
    const explicitlyStable = /\b(?:(?:no|never|not|doesn'?t|didn'?t|won'?t|hasn'?t|haven'?t|without|zero).{0,28}(?:crash(?:es|ed|ing)?|freez(?:e|es|ing)?|glitch(?:es|ed|ing)?|software bugs?)|glitch[ -~]?free)\b/i.test(reviewText);
    const positiveStability = /\b(?:stable|smooth(?:ly)?|flawless(?:ly)?|well[ -]optimized|reliable performance|runs? perfectly|works? flawlessly)\b/i.test(reviewText);
    const activeFailure = /\b(?:but|however|although|sometimes|occasionally|few|some|still|keeps?|started|often|constantly).{0,45}(?:crash|freez|glitch|software bug|not working)\b/i.test(reviewText);
    if (Number(review.rating) >= 4 && (explicitlyStable || (positiveStability && !activeFailure))) {
      const failureIndex = matches.findIndex((match) => match.name === "вылеты, зависания и ошибки");
      if (failureIndex !== -1) matches.splice(failureIndex, 1);
    }
    const positiveFreeMention = /\bfree\b/i.test(reviewText)
      && !/\b(?:free trial|not free|isn'?t free|wasn'?t free|said.{0,20}free|supposed to be free|free.{0,45}(?:but|however).{0,35}(?:pay|charg|subscription))\b/i.test(reviewText);
    const explicitlyFree = matches.some((match) => ["бесплатная версия действительно полезна", "хорошее соотношение цены и пользы"].includes(match.name))
      || positiveFreeMention
      || /\b(?:(?:do not|don'?t|doesn'?t|no need to|not have to|not required to|without (?:me |you )?having to).{0,28}(?:pay|subscription|premium)|no (?:monthly )?(?:subscriptions?|paywalls?)|one[ -]time (?:purchase|payment|fee)|pay once|nothing.{0,30}locked behind (?:a )?subscription|premium.{0,25}(?:optional|unnecessary|don'?t need|not needed)|(?:free app|app (?:is|was) (?:actually |completely |truly )?free|completely free|actually free|truly free).{0,70}(?:love|great|nice|happy|thank|recommend|everything|exactly|support|generous|premium)|(?:love|great|nice|happy|thank|recommend).{0,70}(?:free app|completely free|actually free|truly free)|other apps?.{0,70}(?:subscription|pay).{0,45}this one does not)\b/i.test(reviewText);
    if (Number(review.rating) >= 4 && explicitlyFree) {
      const paywallIndex = matches.findIndex((match) => match.name === "дорогая подписка или пейволл");
      if (paywallIndex !== -1) matches.splice(paywallIndex, 1);
    }
    const negatedEase = /\b(?:not|isn'?t|wasn'?t|never|no longer|hardly).{0,24}(?:easy to use|simple to use|user[ -]?friendly|intuitive|straightforward|easy to navigate)|\bused to be.{0,18}(?:easy to use|user[ -]?friendly|intuitive)\b/i.test(reviewText);
    if (negatedEase) {
      const easyIndex = matches.findIndex((match) => match.name === "понятно и удобно пользоваться");
      if (easyIndex !== -1) matches.splice(easyIndex, 1);
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
