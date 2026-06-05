import { readFileSync, writeFileSync } from "node:fs";

// One-off cleanup: trim the 90-cluster Calm insights down to the top 40 by
// observation count, and rewrite each title in plain Russian. The original
// agent output mixed English/jargon/version-numbers/proper-nouns — readable to
// the team that wrote the prompt, opaque to anyone else. This pass replaces
// each title with a one-line plain-Russian description of the mechanism a
// product person not steeped in Calm should still understand.

const PRODUCT_ID = "cmpstwzc422tyug8p31xzftzd";

// Map keyed by current title. Manually authored — these are NOT auto-derived.
// Edit here when titles need further tightening.
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
    "Платным и lifetime-подписчикам всё равно показывают рекламу других продуктов Calm без возможности отключить",
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
    "Lifetime-подписка не защищает от рекламного спама и удаления купленного контента — продолжают предлагать доплатить",
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
};

const all = JSON.parse(readFileSync("src/data/insights.json", "utf8")) as Array<{
  productId: string;
  insights: Array<{ title: string; novelty: string; observationCount?: number }>;
}>;

const calm = all.find((p) => p.productId === PRODUCT_ID);
if (!calm) throw new Error(`no entry for ${PRODUCT_ID}`);

const before = calm.insights.length;

// Sort by observation count desc, keep top 40.
calm.insights.sort((a, b) => (b.observationCount ?? 0) - (a.observationCount ?? 0));
calm.insights = calm.insights.slice(0, 40);

// Apply rewrites.
let rewritten = 0;
let missing: string[] = [];
calm.insights.forEach((i) => {
  if (REWRITES[i.title]) {
    i.title = REWRITES[i.title];
    rewritten++;
  } else {
    missing.push(i.title);
  }
});

writeFileSync("src/data/insights.json", JSON.stringify(all, null, 2));

console.log(`trimmed ${before} → ${calm.insights.length} insights (top 40 by mention count)`);
console.log(`rewrote ${rewritten} titles`);
if (missing.length > 0) {
  console.log(`\nWARN: ${missing.length} titles in top-40 have no rewrite — they keep the original:`);
  for (const m of missing) console.log(`  · ${m}`);
}
