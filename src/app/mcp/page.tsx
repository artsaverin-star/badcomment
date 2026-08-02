import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { getSessionUser } from "@/lib/session";
import { mintApiKey } from "@/lib/mcp/apiKey";
import { TOOLS } from "@/lib/mcp/tools";
import { RATING_BY_SLUG } from "@/data/peoplesRating";
import { listNiches, getNiche, totals, type ReviewTheme } from "@/lib/reviews";
import { FRIEND_PRICE_RUB, CATEGORY_PRICE_RUB } from "@/lib/tokenConfig";
import { plural } from "@/lib/format";
import CopyLine from "@/components/CopyLine";

export const dynamic = "force-dynamic";

const ENDPOINT = "https://inapp.pro/api/mcp";
const CLI = `claude mcp add inapp --scope user --transport http ${ENDPOINT}`;
const CURSOR_JSON = `{"mcpServers":{"inapp":{"url":"${ENDPOINT}"}}}`;

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const title = ru ? "MCP-сервер inApp: исследование ниш прямо в редакторе" : "inApp MCP: niche research inside your editor";
  const description = ru
    ? "Подключи inApp к Claude Code, Cursor или другому агенту. 72 ниши, 4400 приложений, 1,4 млн прочитанных отзывов: на что жалуются пользователи, кто реально лидирует, сколько люди платят."
    : "Connect inApp to Claude Code, Cursor or any agent. 72 niches, 4,400 apps, 1.4M reviews read: what users complain about, who genuinely leads, what people pay.";
  return {
    title,
    description,
    alternates: {
      canonical: "/mcp",
      languages: { ru: "https://inapp.pro/ru/mcp", en: "https://inapp.pro/en/mcp", "x-default": "https://inapp.pro/en/mcp" },
    },
    openGraph: { title, description, type: "website", siteName: "inApp" },
  };
}

type Rating = { apps?: unknown[]; totalReviews?: number };

function Section({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16 border-t border-[var(--color-border-subtle)] pt-8 sm:mt-20">
      <p className="text-footnote text-[var(--color-text-tertiary)]">{kicker}</p>
      <h2 className="mt-2 text-title2 text-balance text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="w-5 shrink-0 pt-0.5 text-footnote tabular-nums text-[var(--color-text-tertiary)]">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="text-subhead text-[var(--color-text-primary)]">{title}</h3>
        <div className="mt-2.5">{children}</div>
      </div>
    </li>
  );
}

export default async function McpPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const user = await getSessionUser();
  const key = user ? mintApiKey(user.id) : null;

  const sets = Object.values(RATING_BY_SLUG as Record<string, Rating>);
  const niches = sets.length;
  const apps = sets.reduce((n, s) => n + (s.apps?.length ?? 0), 0);
  const reviews = sets.reduce((n, s) => n + (s.totalReviews ?? 0), 0);
  const t = totals();

  // A live example instead of an invented one: the biggest labelled niche and
  // its loudest complaint themes, straight from the same data the server sends.
  const labelled = listNiches(locale).sort((a, b) => b.reviews - a.reviews);
  const example = labelled[0];
  const exampleNiche = example ? getNiche(example.slug) : null;
  const examplePains: ReviewTheme[] = exampleNiche
    ? exampleNiche.apps
        .flatMap((a) => a.themes)
        .filter((th) => th.polarity === "pain")
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
    : [];

  const PROMPTS = ru
    ? [
        "На что жалуются пользователи трекеров привычек? Дай реальные цитаты с рейтингами.",
        "Кто реально лидирует среди сканеров документов и у кого рейтинг накручен?",
        "Сколько люди платят за приложения для сна и за что именно они готовы платить?",
        "Разбери нишу заметок и предложи, чем новое приложение может отличаться.",
        "Спроектируй онбординг так, чтобы он закрывал главную боль ниши трезвости.",
        "Откуда приходят пользователи в нишу изучения языков?",
      ]
    : [
        "What do habit tracker users complain about? Give me real quotes with ratings.",
        "Who genuinely leads among document scanners, and whose rating is inflated?",
        "What do people pay for sleep apps, and what exactly are they paying for?",
        "Break down the notes niche and suggest how a new app could differ.",
        "Design an onboarding that closes the biggest pain in the sobriety niche.",
        "Where do users of language learning apps come from?",
      ];

  const GIVES = ru
    ? [
        {
          h: "Реальные отзывы вместо догадок",
          p: "Агент видит темы, на которые распадаются отзывы каждого приложения, и может процитировать сами тексты. С фильтром по теме и звёздам.",
        },
        {
          h: "Честный рейтинг ниш",
          p: "Кто лидирует по реальному качеству, а у кого рейтинг накручен. По каждому приложению есть вердикт с объяснением.",
        },
        {
          h: "Разборы и идеи",
          p: "Тезис ниши, сегменты аудитории, каналы привлечения и идеи со скорингом. Всё то же, что на сайте, но в контексте твоего кода.",
        },
      ]
    : [
        {
          h: "Real reviews instead of guesses",
          p: "The agent sees the themes each app's reviews fall into and can quote the texts themselves. Filterable by theme and stars.",
        },
        {
          h: "An honest niche rating",
          p: "Who leads on real quality and whose rating is inflated. Every app comes with an explained verdict.",
        },
        {
          h: "Breakdowns and ideas",
          p: "The niche thesis, audience segments, acquisition channels and scored ideas. Everything the site has, in the context of your code.",
        },
      ];

  const RU_LABEL: Record<string, string> = {
    list_niches: "все ниши каталога с деньгами и объёмом",
    get_niche_brief: "тезис ниши, рынок и сегменты аудитории",
    list_niche_findings: "выводы разбора с числом наблюдений",
    get_distribution_channels: "откуда приходят пользователи",
    find_apps: "найти приложение по названию",
    list_niche_apps: "конкурентное поле ниши",
    get_app_verdict: "честная оценка приложения и проверка на накрутку",
    get_niche_rating: "народный рейтинг ниши целиком",
    search_themes: "поиск повторяющихся тем по всем отзывам",
    get_app_themes: "темы одного приложения с долями",
    get_app_reviews: "сами тексты отзывов, с фильтром по теме и звёздам",
    list_ideas: "идеи ниши со скорингом",
    get_idea: "полный разбор идеи, платный слой",
  };

  const GROUPS = [
    { name: ru ? "Ниша" : "Niche", names: ["list_niches", "get_niche_brief", "list_niche_findings", "get_distribution_channels"] },
    { name: ru ? "Приложения" : "Apps", names: ["find_apps", "list_niche_apps", "get_app_verdict", "get_niche_rating"] },
    { name: ru ? "Отзывы" : "Reviews", names: ["search_themes", "get_app_themes", "get_app_reviews"] },
    { name: ru ? "Идеи" : "Ideas", names: ["list_ideas", "get_idea"] },
  ];

  const FAQ = ru
    ? [
        {
          q: "Что такое MCP?",
          a: "Model Context Protocol, открытый стандарт, по которому редакторы и агенты подключают внешние источники данных. Его поддерживают Claude Code, Claude Desktop, Cursor и другие. Ты один раз добавляешь сервер, и агент сам решает, когда к нему обратиться.",
        },
        {
          q: "Нужен ли аккаунт?",
          a: "Нет. Ниши, рейтинг, отзывы по темам, каналы и выводы разбора открыты без ключа. Ключ нужен только для полного текста идей: питч, что строить, чего не строить и как брать деньги.",
        },
        {
          q: "Откуда данные?",
          a: `Из отзывов App Store, которые мы прочитали и разметили. ${reviews.toLocaleString(lc)} отзывов о ${apps.toLocaleString(lc)} приложениях в ${niches} нишах. Каждое число ведёт к конкретным отзывам, ничего не придумано моделью.`,
        },
        {
          q: "С какими клиентами работает?",
          a: "С любым, кто умеет в удалённый MCP по HTTP: Claude Code, Claude Desktop, Cursor и другие. Транспорт обычный, без SSE и сессий.",
        },
        {
          q: "Сколько стоит?",
          a: `Всё, кроме идей, бесплатно и без регистрации. Одна ниша целиком ${CATEGORY_PRICE_RUB} рублей, весь каталог навсегда ${FRIEND_PRICE_RUB} рублей. Покупка на сайте открывает те же идеи и в редакторе.`,
        },
        {
          q: "Данные обновляются?",
          a: "Да. Мы дочитываем ниши и добавляем новые, разметка отзывов по темам расширяется на весь каталог. Сервер всегда отдаёт текущий срез.",
        },
      ]
    : [
        {
          q: "What is MCP?",
          a: "Model Context Protocol, an open standard editors and agents use to plug in external data sources. Claude Code, Claude Desktop, Cursor and others support it. You add the server once and the agent decides when to reach for it.",
        },
        {
          q: "Do I need an account?",
          a: "No. Niches, ratings, reviews by theme, channels and breakdown findings are open without a key. A key is only needed for the full idea payload: the pitch, what to build, what to skip and how to charge.",
        },
        {
          q: "Where does the data come from?",
          a: `From App Store reviews we read and labelled. ${reviews.toLocaleString(lc)} reviews across ${apps.toLocaleString(lc)} apps in ${niches} niches. Every number traces to specific reviews, nothing is invented by a model.`,
        },
        {
          q: "Which clients work?",
          a: "Any client that speaks remote MCP over HTTP: Claude Code, Claude Desktop, Cursor and others. Plain transport, no SSE and no sessions.",
        },
        {
          q: "What does it cost?",
          a: `Everything except ideas is free and needs no account. One full niche is ${CATEGORY_PRICE_RUB} RUB, the whole catalog forever is ${FRIEND_PRICE_RUB} RUB. Buying on the site unlocks the same ideas in your editor.`,
        },
        {
          q: "Is the data refreshed?",
          a: "Yes. We keep reading more niches and adding new ones, and theme labelling is expanding across the whole catalog. The server always serves the current cut.",
        },
      ];

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
      <header>
        <p className="text-footnote text-[var(--color-text-tertiary)]">MCP</p>
        <h1 className="mt-2 text-display font-bold text-balance text-[var(--color-text-primary)]">
          {ru ? "inApp прямо в редакторе" : "inApp inside your editor"}
        </h1>
        <p className="mt-5 max-w-[62ch] text-lead text-pretty text-[var(--color-text-secondary)]">
          {ru
            ? "Агент, который пишет твоё приложение, обычно угадывает рынок. Подключи inApp, и он сможет спросить: на что жалуются пользователи в этой нише, кто там лидирует по-настоящему, за что люди платят. Ответ придёт из реальных отзывов с цитатами."
            : "The agent writing your app usually guesses about the market. Connect inApp and it can ask instead: what users of this niche complain about, who genuinely leads, what people pay for. The answer comes back from real reviews, with quotes."}
        </p>
        <p className="mt-3 max-w-[62ch] text-footnote text-[var(--color-text-tertiary)]">
          {ru
            ? "MCP расшифровывается как Model Context Protocol. Это открытый стандарт, по которому Claude Code, Cursor и другие агенты подключают внешние источники данных."
            : "MCP stands for Model Context Protocol, an open standard Claude Code, Cursor and other agents use to plug in external data sources."}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-6 border-y border-[var(--color-border-subtle)] py-5 sm:grid-cols-4">
        {[
          { n: niches, l: ru ? plural(niches, "ниша", "ниши", "ниш") : "niches" },
          { n: apps, l: ru ? plural(apps, "приложение", "приложения", "приложений") : "apps" },
          { n: reviews, l: ru ? `${plural(reviews, "отзыв", "отзыва", "отзывов")} прочитано` : "reviews read" },
          { n: TOOLS.length, l: ru ? plural(TOOLS.length, "инструмент", "инструмента", "инструментов") : "tools" },
        ].map((x) => (
          <div key={x.l}>
            <div className="text-stat tabular-nums text-[var(--color-text-primary)]">{x.n.toLocaleString(lc)}</div>
            <div className="mt-0.5 text-caption text-[var(--color-text-tertiary)]">{x.l}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <CopyLine value={CLI} label={ru ? "Подключение в Claude Code, одна команда" : "Connect in Claude Code, one command"} ru={ru} />
        <p className="mt-2.5 text-caption text-[var(--color-text-tertiary)]">
          {ru ? "Другой клиент? Ниже пошаговое подключение." : "Another client? Step-by-step setup below."}
        </p>
      </div>

      <Section kicker={ru ? "Что даёт" : "What it gives"} title={ru ? "Три вещи, которых нет у агента из коробки" : "Three things your agent lacks out of the box"}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
          {GIVES.map((g) => (
            <div key={g.h}>
              <h3 className="text-subhead text-[var(--color-text-primary)]">{g.h}</h3>
              <p className="mt-1.5 text-footnote text-[var(--color-text-secondary)]">{g.p}</p>
            </div>
          ))}
        </div>
      </Section>

      {example && examplePains.length > 0 && (
        <Section kicker={ru ? "Как это выглядит" : "What it looks like"} title={ru ? "Живой пример на наших данных" : "A live example on our data"}>
          <p className="text-callout text-[var(--color-text-secondary)]">
            {ru ? (
              <>Спроси агента: «На что жалуются в нише „{example.name}“?»</>
            ) : (
              <>Ask the agent: &ldquo;What do people complain about in the {example.name} niche?&rdquo;</>
            )}
          </p>
          <p className="mt-4 text-caption text-[var(--color-text-tertiary)]">
            {ru ? "Он вызовет search_themes и вернёт самые громкие темы жалоб:" : "It calls search_themes and returns the loudest complaint themes:"}
          </p>
          <ul className="mt-2 border-t border-[var(--color-border-subtle)]">
            {examplePains.map((p) => (
              <li key={p.name} className="flex items-baseline gap-3 border-b border-[var(--color-border-subtle)] py-2.5">
                <span className="min-w-0 flex-1 text-footnote text-[var(--color-text-primary)]">{ru ? p.name : p.nameEn}</span>
                <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                  {p.count} {ru ? plural(p.count, "отзыв", "отзыва", "отзывов") : "reviews"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 max-w-[62ch] text-footnote text-[var(--color-text-tertiary)]">
            {ru ? (
              <>
                Это реальные цифры из разметки, а не сочинённый пример. По каждой теме агент может процитировать сами отзывы. Проверить можно руками:{" "}
                <Link href={`${lp}/reviews/${example.slug}`} className="text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--color-text-primary)]">
                  {ru ? "отзывы ниши" : "niche reviews"}
                </Link>
                .
              </>
            ) : (
              <>
                These are real numbers from the labelling, not a made-up example. For every theme the agent can quote the reviews themselves. Check it by hand:{" "}
                <Link href={`${lp}/reviews/${example.slug}`} className="text-[var(--color-text-secondary)] underline underline-offset-2 transition-colors hover:text-[var(--color-text-primary)]">
                  niche reviews
                </Link>
                .
              </>
            )}
          </p>
        </Section>
      )}

      <Section kicker={ru ? "Подключение" : "Setup"} title={ru ? "Три шага, около минуты" : "Three steps, about a minute"}>
        <ol className="flex flex-col gap-8">
          <Step n={1} title={ru ? "Добавь сервер в свой клиент" : "Add the server to your client"}>
            <div className="flex flex-col gap-4">
              <CopyLine value={CLI} label="Claude Code" ru={ru} />
              <CopyLine value={CURSOR_JSON} label={ru ? "Cursor, файл ~/.cursor/mcp.json" : "Cursor, the ~/.cursor/mcp.json file"} ru={ru} />
              <p className="text-caption text-[var(--color-text-tertiary)]">
                {ru ? "Любой другой клиент: адрес сервера " : "Any other client: server URL "}
                <code className="font-mono text-[var(--color-text-secondary)]">{ENDPOINT}</code>
                {ru ? ", транспорт http, без ключа." : ", http transport, no key."}
              </p>
            </div>
          </Step>
          <Step n={2} title={ru ? "Разреши инструменты" : "Allow the tools"}>
            <p className="max-w-[62ch] text-footnote text-[var(--color-text-secondary)]">
              {ru
                ? "При первом вопросе клиент спросит, можно ли вызвать инструмент inApp. Разреши, регистрация и ключ для этого не нужны."
                : "On the first question your client asks whether the inApp tool may run. Allow it, no account or key needed."}
            </p>
          </Step>
          <Step n={3} title={ru ? "Спрашивай обычным языком" : "Ask in plain language"}>
            <p className="max-w-[62ch] text-footnote text-[var(--color-text-secondary)]">
              {ru
                ? "Имена инструментов знать не нужно. Опиши, что хочешь узнать про нишу или приложение, и агент сам выберет, что вызвать. Примеры ниже."
                : "No need to know tool names. Describe what you want to learn about a niche or an app and the agent picks the right call. Examples below."}
            </p>
          </Step>
        </ol>
      </Section>

      <Section kicker={ru ? "Как спрашивать" : "How to ask"} title={ru ? "Вопросы, с которых стоит начать" : "Questions to start with"}>
        <ul className="border-t border-[var(--color-border-subtle)]">
          {PROMPTS.map((p) => (
            <li key={p} className="border-b border-[var(--color-border-subtle)] py-3 text-callout text-[var(--color-text-secondary)]">
              {p}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        kicker={ru ? "Что внутри" : "What's inside"}
        title={ru ? `${TOOLS.length} ${plural(TOOLS.length, "инструмент", "инструмента", "инструментов")} на один спуск по нише` : `${TOOLS.length} tools, one descent through a niche`}
      >
        <div className="flex flex-col gap-6">
          {GROUPS.map((g) => (
            <div key={g.name}>
              <h3 className="text-subhead text-[var(--color-text-primary)]">{g.name}</h3>
              <ul className="mt-2.5 flex flex-col">
                {g.names.map((n) => {
                  const tool = TOOLS.find((x) => x.name === n);
                  if (!tool) return null;
                  return (
                    <li key={n} className="border-b border-[var(--color-border-subtle)] py-2.5 last:border-b-0">
                      <code className="font-mono text-footnote text-[var(--color-text-primary)]">{tool.name}</code>
                      <p className="mt-1 text-footnote text-[var(--color-text-tertiary)]">{ru ? RU_LABEL[n] ?? tool.title : tool.title}</p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-footnote text-[var(--color-text-secondary)]">
          {ru
            ? `Разметка отзывов по темам сейчас покрывает ${t.niches} ниш и ${t.reviews.toLocaleString(lc)} отзывов, и растёт на весь каталог. Всё остальное доступно по всем ${niches} нишам.`
            : `Theme-level review data currently covers ${t.niches} niches and ${t.reviews.toLocaleString(lc)} reviews, and is expanding across the catalog. Everything else covers all ${niches} niches.`}
        </p>
      </Section>

      <Section kicker={ru ? "Ключ" : "Key"} title={ru ? "Платный слой идей" : "The paid idea layer"}>
        <p className="max-w-[62ch] text-callout text-[var(--color-text-secondary)]">
          {ru
            ? "Всё, кроме полного текста идей, работает без ключа. Ключ привязан к аккаунту и открывает в редакторе ровно те ниши и идеи, которые куплены на сайте."
            : "Everything except the full idea payload works with no key. A key is tied to your account and unlocks in your editor exactly the niches and ideas bought on the site."}
        </p>
        {key ? (
          <div className="mt-5 flex flex-col gap-3">
            <CopyLine value={key} label={ru ? "Твой личный ключ" : "Your personal key"} mask ru={ru} />
            <CopyLine
              value={`claude mcp add inapp --scope user --transport http ${ENDPOINT} --header "Authorization: Bearer ${key}"`}
              label={ru ? "Подключение с ключом" : "Connect with the key"}
              mask
              ru={ru}
            />
            <p className="text-caption text-[var(--color-text-tertiary)]">
              {ru ? "Ключ равен доступу к аккаунту, не публикуй его." : "The key equals account access, do not publish it."}
            </p>
          </div>
        ) : (
          <p className="mt-5 text-callout text-[var(--color-text-secondary)]">
            {ru ? "Войди на сайте, и ключ появится здесь." : "Sign in on the site and your key appears here."}
          </p>
        )}
      </Section>

      <Section kicker="FAQ" title={ru ? "Короткие ответы" : "Short answers"}>
        <div className="border-t border-[var(--color-border-subtle)]">
          {FAQ.map((f) => (
            <details key={f.q} className="group/f border-b border-[var(--color-border-subtle)]">
              <summary className="flex cursor-pointer list-none items-start gap-5 py-4 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 text-body font-medium text-[var(--color-text-primary)]">{f.q}</span>
                <svg width="13" height="13" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="mt-1.5 shrink-0 text-[var(--color-text-tertiary)] transition-transform duration-300 group-open/f:rotate-180">
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </summary>
              <div className="details-reveal pb-5 pr-1 sm:pr-8">
                <p className="max-w-[62ch] text-callout text-[var(--color-text-secondary)]">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </Section>

      <nav className="mt-12 flex flex-wrap gap-2">
        <Link href={`${lp}/reviews`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
          {ru ? "Посмотреть отзывы" : "Browse the reviews"}
        </Link>
        <Link href={`${lp}/rating`} className="rounded-full border border-[var(--color-border-subtle)] px-3.5 py-1.5 text-footnote text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]">
          {ru ? "Народный рейтинг" : "People's rating"}
        </Link>
      </nav>
    </main>
  );
}
