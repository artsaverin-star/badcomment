import { readFileSync, writeFileSync } from "node:fs";

// Editorial category-level synthesis ("инсайты категории") for a segment page.
// Each category insight is defined by a list of EXACT member insight titles
// drawn from src/data/insights.json. The script resolves those members back to
// their real cluster sizes (observationCount) and verbatim evidence, so every
// number on the category block traces to real reviews — nothing is invented.
//
// Run: npx tsx scripts/build-segment-insights.ts

type Evidence = { rating: number; date: string; reviewId: string; quote: string };
type Insight = { id: string; title: string; theme?: string; observationCount?: number; evidence: Evidence[] };
type ProductInsights = { productId: string; reviewsScanned: number; insights: Insight[] };
type Meta = Record<string, { productId?: string; name: string }>;

const INSIGHTS = "src/data/insights.json";
const CATS = "src/data/categories.json";
const META = "src/data/categories-meta.json";
const OUT = "src/data/segment-insights.json";

type CatItemDef = { id: string; theme: string; title: string; body: string; members: string[] };
type SegmentDef = { slug: string; lead: string; items: CatItemDef[] };
// Narrative editorial sections that thread the category insights into a
// magazine-style long-read instead of a flat theme-bucketed card grid. Each
// section has an authored heading + dek (lede paragraph) and a list of category
// item ids; the items themselves still carry real obs counts + verbatim
// evidence, so the prose is narrative but every figure stays traceable.
type SectionDef = { id: string; heading: string; dek: string; itemIds: string[] };

// --- meditation-mindfulness synthesis ---------------------------------------
// Aura ("Aura: Meditation & Sleep, CBT") is excluded on purpose: its linked
// productId resolves to the identity-protection Aura (VPN / data-broker /
// credit-monitoring reviews), not the meditation app — citing it would be a lie.
const DEFS: SegmentDef[] = [
  {
    slug: "meditation-mindfulness",
    lead:
      "Сведено из реальных отзывов 1–5★ по приложениям категории. В этих отзывах виден не только повод уйти — биллинг-ловушки, обновления, ломающие ритуал, аудио, которое будит вместо сна, — но и то, что удерживает людей годами: конкретные голоса, привычка перед сном, помощь при тревоге и бессоннице. Ниже — механизмы, которые повторяются у разных брендов, а не придирки к одному приложению.",
    items: [
      {
        id: "mm-billing-trap",
        theme: "payment",
        title: "Отмена «прошла», а деньги списывают дальше",
        body:
          "Один и тот же механизм у разных брендов: отмена подтверждена письмом и экраном, но авто-renew продолжает списывать; уведомления перед списанием нет, а отмена растянута на несколько экранов. Это главный драйвер гневных отзывов и возвратов.",
        members: [
          "Отмена подтверждена в письме и на экране, а годовая подписка всё равно списывается",
          "После отмены подписки — через приложение, Apple или email — списания продолжаются, а возврат отклоняется",
          "Отмена подписки намеренно растянута на несколько экранов — пользователь не проходит все шаги и его снова списывают",
          "Перед авторенувом не приходит никакого уведомления — пользователь узнаёт о списании только постфактум",
          "Пользователь не помнит, что подписывался, но деньги списываются месяцами — квитанций и уведомлений нет",
        ],
      },
      {
        id: "mm-fake-trial",
        theme: "payment",
        title: "«Бесплатный пробный период» списывает полную сумму сразу",
        body:
          "Кнопка «7 дней бесплатно» / экран с обещанием триала на деле списывает полную годовую подписку в момент нажатия — пробного доступа нет. Повторяется у нескольких приложений.",
        members: [
          "Кнопка «7 дней бесплатно» сразу списывает полную годовую подписку, без пробного периода",
          "Экран оформления обещает пробный период, но деньги списываются сразу — без пробного доступа",
        ],
      },
      {
        id: "mm-bypass-apple",
        theme: "payment",
        title: "Подписка в обход Apple — отменить штатно нельзя",
        body:
          "Оплата уходит через сайт или PayPal мимо страницы подписок Apple, поэтому управлять и отменять стандартными средствами iOS невозможно — пользователь оказывается заперт в платеже.",
        members: [
          "Подписка оформлена напрямую через сайт и обходит страницу подписок Apple — управлять или отменить стандартными средствами iOS невозможно",
          "Подаренная подписка превращается в параллельную через PayPal и не отменяется через Google Play",
        ],
      },
      {
        id: "mm-update-breaks",
        theme: "reliability",
        title: "Каждое обновление ломает запуск или убирает функции",
        body:
          "Сквозной паттерн по брендам: после апдейта приложение виснет на заставке, уходит в цикл с App Store или теряет базовые функции (таймеры, интеграции). Единственный «фикс» от поддержки — переустановка со сбросом загрузок.",
        members: [
          "Обновление создаёт бесконечный цикл между приложением и App Store — платные пользователи полностью теряют доступ к сервису",
          "Каждое обновление убирает базовые функции — таймер на фоновом звуке, sleep-таймер плейлиста, интеграции с Sonos и iOS",
          "После обновления приложение зависает на заставке или не запускается на Android — переустановка не помогает",
          "После каждого обновления приложение перестаёт запускаться — единственный способ восстановить работу — переустановка со сбросом загрузок",
          "После очередного обновления приложение перестаёт открываться или падает при запуске",
        ],
      },
      {
        id: "mm-auth-broken",
        theme: "reliability",
        title: "Сломанный вход: регистрация есть, залогиниться нельзя",
        body:
          "Регистрация проходит, но логин не работает; письмо для сброса пароля не приходит; валидатор отбрасывает нормальный ввод. Людей выбивает из аккаунта в самый уязвимый момент — при засыпании.",
        members: [
          "Регистрация проходит, но логин не работает — auth-pipeline между регистрацией и логином системно сломан",
          "Письмо для сброса пароля просто не приходит, и нет способа достучаться до живого оператора — пользователи годами заблокированы",
          "Пользователя выкидывает из аккаунта в момент засыпания и пропадают скачанные медитации — стресс-баг в уязвимой точке",
          "При регистрации постоянно возникает серверная ошибка — пользователь несколько месяцев не может создать аккаунт",
        ],
      },
      {
        id: "mm-night-cutout",
        theme: "playback",
        title: "Аудио обрывается среди ночи и будит",
        body:
          "Длинные sleep-аудио и сонные истории обрываются посреди ночи, зацикливают бодрое вступление или включают громкий следующий трек — то есть будят вместо того чтобы держать сон. Device-specific регрессии (Pixel) усиливают эффект.",
        members: [
          "После последнего обновления сонная история зацикливается и заново играет бодрое вступление вместо перехода в фоновый звук",
          "Длинные sleep-аудио обрываются среди ночи и пробуждают пользователя — повторяющийся многолетний баг",
          "После сонной истории автоматически включается громкий бодрый следующий трек, игнорируя настройку — будит ночью",
          "На Pixel 8/9/10 медитации обрываются через секунды или минуты — массовый device-specific регрессионный баг",
          "Слипкаст произвольно прерывается посреди ночи в тихих паузах между эпизодами — пользователь обнаруживает это только утром",
        ],
      },
      {
        id: "mm-resume-reset",
        theme: "playback",
        title: "Любое прерывание сбрасывает сессию в начало",
        body:
          "Звонок, переключение приложения или переподключение наушников сбрасывают медитацию на старт; фон не глушится после закрытия; офлайн-контент всё равно требует сети. Непрерывность аудио — фундамент продукта — ломается.",
        members: [
          "Любое прерывание — звонок, переключение приложения, переподключение наушников — сбрасывает медитацию в начало",
          "Фоновый звук продолжает играть даже после полного закрытия приложения — помогает только перезагрузка телефона",
          "Скачанный для офлайна контент перестаёт играть без интернета — приложение проверяет подписку даже когда нет сети",
          "Медитация ставится на паузу при блокировке экрана — background playback не работает в sleep-сценарии",
        ],
      },
      {
        id: "mm-home-clutter",
        theme: "ui",
        title: "Главный экран — рекламная карусель вместо «нажал и начал»",
        body:
          "Чтобы дойти до медитации, надо закрыть 3–10 окон с апселлом, а таймер и дыхание спрятаны в подразделах. Редизайн добавил скролл и решения «как в соцсетях» — перегрузка прямо противоречит обещанию спокойствия.",
        members: [
          "Перед домашним экраном пользователь обязан закрыть 3-10 окон с предложениями подписки и уведомлений",
          "Главный экран превратился в рекламную карусель — таймер, дыхание и курсы спрятаны в подразделах",
          "Новый главный экран требует скроллинга и принятия решений вместо мгновенного начала медитации — перегрузка как в соцсетях",
        ],
      },
      {
        id: "mm-lost-collections",
        theme: "ui",
        title: "Обновление стирает многолетние коллекции и заставляет проходить анкеты",
        body:
          "Редизайны удаляют закладки, папки и «Избранное» без предупреждения, а обязательные check-in экраны без кнопки «пропустить» встают между пользователем и контентом.",
        members: [
          "Обновление удалило закладки и папки с медитациями — пользователи потеряли многолетнюю ручную коллекцию без предупреждения",
          "Обязательный flow с выбором намерения и кнопкой «I commit» блокирует доступ к контенту — нет кнопки пропуска",
          "При каждом запуске появляются обязательные check-in экраны и анкеты — нет способа пропустить и сразу начать медитацию",
          "После редизайна Favourites недоступны половину времени или показываются разбросанно — категоризация потеряна",
        ],
      },
      {
        id: "mm-content-anchors",
        theme: "content",
        title: "Удерживают конкретные записи, а не каталог — и их тихо удаляют",
        body:
          "Подписку держат не «каталог вообще», а конкретные голоса и треки (знаменитости-рассказчики, любимые истории). Тихое удаление этих записей ломает многолетний ритуал постоянных пользователей.",
        members: [
          "Знаменитости-рассказчики (Леброн Джеймс, Гарри Стайлс, Макконахи) — главная причина почему люди остаются с приложением",
          "На подписку конвертирует не каталог в целом, а конкретные записи — например аудиокниги Pride & Prejudice или Little Women",
          "Удаление конкретных треков (Лин-Мануэль Миранда, Tanama Lake, Gently Back to Sleep, Post Malone) тихо ломает многолетний ритуал постоянных пользователей",
        ],
      },
      {
        id: "mm-stale-catalog",
        theme: "content",
        title: "При ежедневном использовании каталог быстро ощущается застойным",
        body:
          "Тем, кто заходит каждый день, новинок не хватает: повторяются куски скриптов, любимый рассказчик молчит больше года, бесплатного для «попробовать» почти не осталось.",
        members: [
          "Ежедневные медитации и сессии Джеффа Уоррена дословно повторяют куски — это замечают те кто слушает годами",
          "Каталог воспринимается как застойный при ежедневном использовании — новые медитации выходят редко",
          "Любимый рассказчик не выпускает нового больше года — застой по конкретным голосам",
          "После обновления бесплатный контент сократился до минимума — попробовать продукт перед оплатой практически невозможно",
        ],
      },
      {
        id: "mm-real-jobs",
        theme: "strategy",
        title: "Реальные сценарии шире «сна и медитации»",
        body:
          "Люди используют приложения для работы, поездок, реабилитации после травм, чтобы успокоить ребёнка или собаку — и слушают совместно. Продукт, заточенный только под «сон + медитация», эти задачи не закрывает.",
        members: [
          "Calm используют не для сна и медитации, а для работы, поездок, успокоить собаку, реабилитации после травм",
          "Постоянные пользователи строят ритуал «медитация → сонная история → фон» — между этапами нужны плавные переходы",
          "Совместное прослушивание дома: дочь, партнёр, кошка, собака слушают параллельно или с одного устройства",
          "Семья использует медитации с детьми как ритуал отхода ко сну, дети сами просят запустить сессию",
        ],
      },
      {
        id: "mm-acquisition-b2b",
        theme: "strategy",
        title: "Главный канал привлечения — работодатель и страховка, а не сам пользователь",
        body:
          "Большинство постоянных пользователей пришли через корпоративный wellness или медстраховку, а до самостоятельной покупки люди годами обдумывают цену и сравнивают с альтернативами; конвертирует часто внешнее событие (ковид, госпитализация).",
        members: [
          "Большинство постоянных пользователей пришли через работодателя или медицинскую страховку, а не сами",
          "До подписки люди обдумывают цену годами и возвращаются к Calm после сравнения с альтернативами — конвертирует ковид или госпитализация",
          "Пользователи называют конкретные альтернативы которыми пользуются параллельно: Slumber, Insight Timer, YouTube ASMR, Apple Music",
        ],
      },
      {
        id: "mm-underserved",
        theme: "strategy",
        title: "Недообслуженные сегменты: «только звук+таймер» и режим без речи",
        body:
          "Есть устойчивый спрос на минимализм (просто дождь + таймер) и на режим без голоса/музыки (бессонница, тиннитус, аутизм). Перегруженные приложения этих людей вытесняют, хотя могли бы удержать.",
        members: [
          "Сегмент «просто звук дождя плюс таймер» хочет минималистичную альтернативу — Calm их вытесняет своей перегруженностью",
          "Сегмент с бессонницей, тиннитусом и аутизмом хочет режим без речи и без музыки — Calm заточен под обратное и им не подходит",
          "Контент с частотами и бинауральными ритмами (альфа, тета, EMDR) — отдельный сегмент со своими ожиданиями от поиска",
        ],
      },
      {
        id: "mm-bot-support",
        theme: "support",
        title: "Бот-поддержка не передаёт живому и описывает несуществующие кнопки",
        body:
          "Поддержка отвечает ботом, который ссылается на элементы, которых в приложении нет, и не эскалирует на человека; каналы связи часто просто не работают, а ответы идут неделями шаблонами.",
        members: [
          "В поддержке отвечает бот — описывает кнопки которых нет в приложении и не передаёт живому оператору",
          "Кнопки «оставить отзыв» и «связаться с поддержкой» в приложении не найти, ответы шаблонные и идут неделями",
          "После нескольких обращений поддержка перестаёт отвечать — проблема остаётся нерешённой",
          "Кнопка «Связаться с нами» в приложении не работает или показывает ошибку — получить помощь поддержки невозможно",
        ],
      },
    ],
  },
];

const SECTIONS: Record<string, SectionDef[]> = {
  "meditation-mindfulness": [
    {
      id: "sec-money",
      heading: "Деньги: где спокойствие превращается в ловушку",
      dek: "Платёж — самая частая точка, где доверие к категории даёт трещину. Отмена, подтверждённая письмом и экраном, не останавливает списания; «бесплатный пробный период» снимает полную годовую сумму в момент нажатия; а оплата, уведённая мимо Apple через сайт или PayPal, лишает человека штатной кнопки «отменить». Это не разовые сбои отдельных брендов, а повторяющийся по всей категории сценарий.",
      itemIds: ["mm-billing-trap", "mm-fake-trial", "mm-bypass-apple"],
    },
    {
      id: "sec-ritual",
      heading: "Ритуал, который ломает само приложение",
      dek: "Медитация живёт как привычка — и тем заметнее, когда приложение рвёт собственный ритуал. Обновления зависают на заставке или вырезают таймеры и интеграции; редизайны стирают годами собранные коллекции и встречают обязательными анкетами; главный экран превращается в карусель апселла вместо «нажал и начал»; счётчик серии вместо поддержки внушает вину; а сломанный вход выбивает из аккаунта в самый уязвимый момент — при засыпании.",
      itemIds: ["mm-update-breaks", "mm-lost-collections", "mm-home-clutter", "mm-onboarding-gate", "mm-streak-guilt", "mm-notification-spam", "mm-auth-broken"],
    },
    {
      id: "sec-night-audio",
      heading: "Звук, который должен усыплять, — будит",
      dek: "Категория обещает держать сон до утра, но аудио ведёт себя наоборот: длинные sleep-истории обрываются среди ночи, зацикливают бодрое вступление или включают громкий следующий трек. Любое прерывание — звонок, переключение приложения, наушники — сбрасывает сессию в начало, а скачанный «офлайн» всё равно требует сети. Непрерывность звука — фундамент продукта — оказывается самой хрупкой его частью.",
      itemIds: ["mm-night-cutout", "mm-resume-reset", "mm-no-offline"],
    },
    {
      id: "sec-content",
      heading: "Чем держат — и что теряют, когда это убирают",
      dek: "Подписку удерживает не «каталог вообще», а конкретные голоса и записи: знаменитости-рассказчики, любимые истории, отдельные треки. Это самая сильная позитивная привязка в категории — и одновременно самый незаметный риск: тихое удаление этих записей ломает многолетний ритуал, при ежедневном использовании каталог быстро ощущается застойным, а замена живых рассказчиков на синтетические AI-голоса подрывает то самое доверие, ради которого люди и остаются.",
      itemIds: ["mm-content-anchors", "mm-stale-catalog", "mm-ai-voices"],
    },
    {
      id: "sec-jobs",
      heading: "Зачем приходят на самом деле",
      dek: "За «сном и медитацией» скрывается куда более широкий список задач: люди слушают на работе и в поездках, восстанавливаются после травм, успокаивают ребёнка или собаку, включают на двоих с одного устройства. Приходят чаще через работодателя или страховку, чем сами, а до самостоятельной покупки годами сравнивают цену. И есть устойчивый недообслуженный спрос — на минимализм «просто звук плюс таймер» и режим без речи для тех, кому голос мешает.",
      itemIds: ["mm-real-jobs", "mm-acquisition-b2b", "mm-underserved"],
    },
    {
      id: "sec-trust",
      heading: "Когда что-то ломается — по ту сторону тишина",
      dek: "Замыкает картину поддержка и доверие к данным: на обращение отвечает бот, описывающий кнопки, которых в приложении нет, и не передающий живому оператору; формы «связаться» отвечают шаблонами неделями или не работают вовсе; а чувствительные данные о психическом здоровье собираются без понятной возможности отказаться. В категории про заботу о себе этот контраст пользователи замечают особенно остро.",
      itemIds: ["mm-bot-support", "mm-data-privacy"],
    },
    {
      id: "sec-infra",
      heading: "Инфраструктурный фон",
      dek: "Базовая гигиена, которую ждут от любого приложения и без которой остальное не имеет значения: стабильный запуск и работа на планшете.",
      itemIds: ["mm-crash-on-launch", "mm-tablet-landscape"],
    },
  ],
};

// Member additions synthesized across the full app set (see
// scripts/build-segment-insights — the new apps' titles assigned to category
// insights, produced by an Opus synthesis pass over segment-meta/mm-new-titles).
const ADDITIONS = "src/data/segment-defs-additions.json";
type Additions = { extend: Record<string, string[]>; new: CatItemDef[] };

function applyAdditions(defs: SegmentDef[]) {
  let raw: string;
  try { raw = readFileSync(ADDITIONS, "utf8"); } catch { return; }
  const add = JSON.parse(raw) as Additions;
  const mm = defs.find((d) => d.slug === "meditation-mindfulness");
  if (!mm) return;
  for (const it of mm.items) {
    const extra = add.extend[it.id];
    if (extra) it.members.push(...extra);
  }
  for (const ni of add.new) {
    if (!mm.items.some((i) => i.id === ni.id)) mm.items.push(ni);
  }
}

function main() {
  applyAdditions(DEFS);
  const products = JSON.parse(readFileSync(INSIGHTS, "utf8")) as ProductInsights[];
  const domains = JSON.parse(readFileSync(CATS, "utf8")) as { categories: { slug: string; apps: string[] }[] }[];
  const meta = JSON.parse(readFileSync(META, "utf8")) as Meta;

  const out: Record<string, unknown> = {};

  for (const def of DEFS) {
    // productIds in scope for this segment + pid → app name
    const cat = domains.flatMap((d) => d.categories).find((c) => c.slug === def.slug);
    if (!cat) { console.log(`!! no category ${def.slug}`); continue; }
    const pidName = new Map<string, string>();
    for (const app of cat.apps) {
      const m = meta[`${def.slug}:${app}`];
      if (m?.productId) pidName.set(m.productId, m.name);
    }
    const inScope = products.filter((p) => pidName.has(p.productId));

    // title → {obs, appName, evidence}
    const byTitle = new Map<string, { obs: number; app: string; evidence: Evidence[] }>();
    let reviewsScanned = 0;
    for (const p of inScope) {
      reviewsScanned += p.reviewsScanned ?? 0;
      for (const i of p.insights) {
        byTitle.set(i.title, {
          obs: i.observationCount ?? i.evidence.length,
          app: pidName.get(p.productId)!,
          evidence: i.evidence ?? [],
        });
      }
    }

    const items = def.items.map((it) => {
      const apps = new Set<string>();
      let observationCount = 0;
      const evidence: (Evidence & { app: string })[] = [];
      const missing: string[] = [];
      for (const title of it.members) {
        const hit = byTitle.get(title);
        if (!hit) { missing.push(title); continue; }
        apps.add(hit.app);
        observationCount += hit.obs;
        const top = [...hit.evidence].sort((a, b) => b.rating - a.rating)[0] ?? hit.evidence[0];
        if (top) evidence.push({ ...top, app: hit.app });
      }
      if (missing.length) console.log(`  [${def.slug}/${it.id}] UNMATCHED members:\n    - ${missing.join("\n    - ")}`);
      evidence.sort((a, b) => b.rating - a.rating);
      return {
        id: it.id,
        theme: it.theme,
        title: it.title,
        body: it.body,
        apps: [...apps],
        observationCount,
        evidence: evidence.slice(0, 4),
      };
    });

    // Thread the resolved items into narrative editorial sections. Items are
    // sorted loudest-first within a section; any item not placed in a section
    // falls into a trailing catch-all so nothing is silently dropped.
    const itemById = new Map(items.map((it) => [it.id, it]));
    const placed = new Set<string>();
    const sectionDefs = SECTIONS[def.slug] ?? [];
    const sections = sectionDefs
      .map((s) => {
        const secItems = s.itemIds
          .map((id) => itemById.get(id))
          .filter((it): it is (typeof items)[number] => Boolean(it))
          .sort((a, b) => b.observationCount - a.observationCount);
        for (const id of s.itemIds) placed.add(id);
        return { id: s.id, heading: s.heading, dek: s.dek, items: secItems };
      })
      .filter((s) => s.items.length > 0);
    const orphans = items.filter((it) => !placed.has(it.id));
    if (orphans.length) {
      console.log(`  [${def.slug}] ${orphans.length} item(s) not in any section: ${orphans.map((o) => o.id).join(", ")}`);
      sections.push({ id: "sec-other", heading: "Прочие наблюдения", dek: "", items: orphans.sort((a, b) => b.observationCount - a.observationCount) });
    }

    out[def.slug] = {
      slug: def.slug,
      lead: def.lead,
      asOf: new Date().toISOString().slice(0, 10),
      appsCount: inScope.length,
      reviewsScanned,
      items,
      sections,
    };
    const totalObs = items.reduce((s, i) => s + i.observationCount, 0);
    console.log(`[${def.slug}] ${items.length} category insights · ${inScope.length} apps · ${reviewsScanned} reviews · ${totalObs} obs aggregated`);
  }

  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${OUT}`);
}

main();
