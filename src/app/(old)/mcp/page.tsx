import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "@/lib/i18n.server";
import { getAccess } from "@/lib/access";
import { TOOLS } from "@/lib/mcp/tools";
import { listNiches, getNiche, totals, type ReviewTheme } from "@/lib/reviews";
import { ACCESS_PRICE_RUB } from "@/lib/tokenConfig";
import BuyButton from "@/components/BuyButton";
import InstallPicker from "./InstallPicker";
import McpConnections, { type McpConnectionView } from "./McpConnections";
import { plural } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ru = (await getLocale()) !== "en";
  const corpus = totals();
  const title = ru ? "MCP-сервер inApp: исследование ниш прямо в редакторе" : "inApp MCP: niche research inside your editor";
  const description = ru
    ? `Подключи inApp к Claude Code, Cursor или другому агенту. ${corpus.sourceNiches} ниш, ${corpus.sourceApps.toLocaleString("ru-RU")} приложений, ${corpus.sourceReviews.toLocaleString("ru-RU")} отзывов: на что жалуются пользователи, кто лидирует, сколько люди платят.`
    : `Connect inApp to Claude Code, Cursor or any agent. ${corpus.sourceNiches} niches, ${corpus.sourceApps.toLocaleString("en-US")} apps, ${corpus.sourceReviews.toLocaleString("en-US")} reviews: what users complain about, who leads, and what people pay.`;
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

function Section({ kicker, title, children, id }: { kicker: string; title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="mt-16 scroll-mt-24 border-t border-[var(--color-border-subtle)] pt-8 sm:mt-20">
      <p className="text-footnote text-[var(--color-text-tertiary)]">{kicker}</p>
      <h2 className="mt-2 text-title2 text-balance text-[var(--color-text-primary)]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function McpPage() {
  const locale = await getLocale();
  const ru = locale !== "en";
  const lc = ru ? "ru-RU" : "en-US";
  const lp = ru ? "/ru" : "/en";
  const access = await getAccess();
  const user = access.user;
  const paid = access.unlimited;
  const connections: McpConnectionView[] = user
    ? (await prisma.mcpConnection.findMany({
        where: { userId: user.id },
        orderBy: [{ revokedAt: "asc" }, { lastUsedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true, clientName: true, redirectUri: true, createdAt: true, lastUsedAt: true, revokedAt: true },
      })).map((connection) => ({
        ...connection,
        createdAt: connection.createdAt.toISOString(),
        lastUsedAt: connection.lastUsedAt?.toISOString() ?? null,
        revokedAt: connection.revokedAt?.toISOString() ?? null,
      }))
    : [];

  const t = totals();
  const niches = t.sourceNiches;
  const apps = t.sourceApps;
  const reviews = t.sourceReviews;

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
        "Кто лидирует среди сканеров документов и у кого витринная звезда сильнее всего расходится с отзывами?",
        "Сколько люди платят за приложения для сна и за что именно они готовы платить?",
        "Разбери нишу заметок и предложи, чем новое приложение может отличаться.",
        "Спроектируй онбординг так, чтобы он закрывал главную боль ниши трезвости.",
        "Откуда приходят пользователи в нишу изучения языков?",
      ]
    : [
        "What do habit tracker users complain about? Give me real quotes with ratings.",
        "Who leads among document scanners, and whose storefront star diverges most from the review text?",
        "What do people pay for sleep apps, and what exactly are they paying for?",
        "Break down the notes niche and suggest how a new app could differ.",
        "Design an onboarding that closes the biggest pain in the sobriety niche.",
        "Where do users of language learning apps come from?",
      ];

  const GIVES = ru
    ? [
        {
          h: "Реальные отзывы вместо догадок",
          p: "Агент получает размеченные темы каждого приложения и может показать исходные отзывы. Есть фильтры по теме и оценке.",
        },
        {
          h: "Рейтинг по отзывам",
          p: "Кто лидирует по опыту пользователей и где витринная звезда расходится с текстами. По каждому приложению есть вердикт с объяснением.",
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
          h: "A review-based niche rating",
          p: "Who leads on user experience and where the storefront star diverges from review text. Every app comes with an explained verdict.",
        },
        {
          h: "Breakdowns and ideas",
          p: "The niche thesis, audience segments, acquisition channels and scored ideas. Everything the site has, in the context of your code.",
        },
      ];

  const RU_LABEL: Record<string, string> = {
    account_status: "проверить подключение и доступ аккаунта",
    list_niches: "все ниши каталога с деньгами и объёмом",
    research_niche: "быстрый полный разбор ниши в одном вызове",
    get_niche_brief: "тезис ниши, рынок и сегменты аудитории",
    list_niche_findings: "выводы разбора с числом наблюдений",
    get_distribution_channels: "откуда приходят пользователи",
    find_apps: "найти приложение по названию",
    list_niche_apps: "конкурентное поле ниши",
    get_app_verdict: "честная оценка приложения и проверка на накрутку",
    get_niche_rating: "народный рейтинг ниши целиком",
    list_niche_themes: "главные жалобы и похвала без заранее известного слова",
    search_themes: "поиск повторяющихся тем по всем отзывам",
    get_app_themes: "темы одного приложения с долями",
    get_app_reviews: "сами тексты отзывов, с фильтром по теме и звёздам",
    list_ideas: "идеи ниши со скорингом",
    get_idea: "полный разбор идеи: питч, фичи, монетизация",
  };

  const GROUPS = [
    { name: ru ? "Старт" : "Start", names: ["account_status", "list_niches", "research_niche"] },
    { name: ru ? "Ниша" : "Niche", names: ["get_niche_brief", "list_niche_findings", "get_distribution_channels"] },
    { name: ru ? "Приложения" : "Apps", names: ["find_apps", "list_niche_apps", "get_app_verdict", "get_niche_rating"] },
    { name: ru ? "Отзывы" : "Reviews", names: ["list_niche_themes", "search_themes", "get_app_themes", "get_app_reviews"] },
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
          a: "Да. При подключении клиент откроет браузер: войдёшь на сайте и нажмёшь «Разрешить». Проверка подключения, каталог ниш и полный разбор демо-ниши работают бесплатно; остальные исследования — после оплаты пожизненного доступа.",
        },
        {
          q: "Откуда данные?",
          a: `Из отзывов App Store, которые мы прочитали и разметили. ${reviews.toLocaleString(lc)} отзывов о ${apps.toLocaleString(lc)} приложениях в ${niches} нишах. Каждое число ведёт к конкретным отзывам, ничего не придумано моделью.`,
        },
        {
          q: "С какими клиентами работает?",
          a: "Claude Code, Cursor, Claude Desktop, VS Code, Codex и любой другой клиент с удалёнными MCP по HTTP. Вход через браузер, ключи вставлять не нужно.",
        },
        {
          q: "Сколько стоит?",
          a: `Один платёж ${ACCESS_PRICE_RUB} рублей открывает весь сайт навсегда: разборы, идеи, рейтинг, отзывы и MCP-сервер. Без подписок и отдельных тарифов.`,
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
          a: "Yes. On connect the client opens the browser: sign in and tap allow. Connection checks, the niche catalog and one complete sample are free; the remaining research unlocks with lifetime access.",
        },
        {
          q: "Where does the data come from?",
          a: `From App Store reviews we read and labelled. ${reviews.toLocaleString(lc)} reviews across ${apps.toLocaleString(lc)} apps in ${niches} niches. Every number traces to specific reviews, nothing is invented by a model.`,
        },
        {
          q: "Which clients work?",
          a: "Claude Code, Cursor, Claude Desktop, VS Code, Codex and any other client that speaks remote MCP over HTTP. Sign-in happens in the browser, no keys to paste.",
        },
        {
          q: "What does it cost?",
          a: `One payment of ${ACCESS_PRICE_RUB} RUB opens the whole site forever: breakdowns, ideas, the rating, the reviews and the MCP server. No subscriptions and no separate tiers.`,
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
            ? "Подключи inApp к агенту, чтобы он работал с данными рынка: находил повторяющиеся жалобы, сравнивал приложения и показывал, за что пользователи готовы платить. Каждый вывод можно проверить по исходным отзывам."
            : "Connect inApp so your agent can work with market data: find recurring complaints, compare apps and show what users pay for. Every conclusion can be checked against the source reviews."}
        </p>
        <p className="mt-3 max-w-[62ch] text-footnote text-[var(--color-text-tertiary)]">
          {ru
            ? "MCP расшифровывается как Model Context Protocol. Это открытый стандарт, по которому Claude Code, Cursor и другие агенты подключают внешние источники данных."
            : "MCP stands for Model Context Protocol, an open standard Claude Code, Cursor and other agents use to plug in external data sources."}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-y border-[var(--color-border-subtle)] py-5">
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

      {!paid && (
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
          <BuyButton loggedIn={!!user} locale={locale} source="mcp_page" />
          <p className="max-w-[38ch] text-footnote text-[var(--color-text-secondary)]">
            {ru
              ? `MCP входит в пожизненный доступ: один платёж ${ACCESS_PRICE_RUB} ₽ открывает весь сайт и сервер навсегда.`
              : `MCP is part of the lifetime tier: one payment of ${ACCESS_PRICE_RUB} ₽ opens the whole site and the server forever.`}
          </p>
        </div>
      )}

      <Section kicker={ru ? "Возможности" : "Capabilities"} title={ru ? "Что получает агент после подключения" : "What your agent gets after connecting"}>
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
        <Section
          kicker={ru ? "Пример ответа" : "Example result"}
          title={ru ? `Главные проблемы в категории «${example.name}»` : `Top problems in ${example.name}`}
        >
          <p className="text-callout text-[var(--color-text-secondary)]">
            {ru
              ? `Три самые частые темы среди ${example.reviews.toLocaleString(lc)} ${plural(example.reviews, "отзыва", "отзывов", "отзывов")}:`
              : `The three most common themes across ${example.reviews.toLocaleString(lc)} reviews:`}
          </p>
          <ul className="mt-5 border-t border-[var(--color-border-subtle)]">
            {examplePains.map((p) => (
              <li key={p.name} className="flex items-baseline gap-3 border-b border-[var(--color-border-subtle)] py-2.5">
                <span className="min-w-0 flex-1 text-footnote text-[var(--color-text-primary)]">{ru ? p.name : p.nameEn}</span>
                <span className="shrink-0 text-caption tabular-nums text-[var(--color-text-tertiary)]">
                  {p.count} {ru ? plural(p.count, "отзыв", "отзыва", "отзывов") : "reviews"}
                </span>
              </li>
            ))}
          </ul>
          <Link href={`${lp}/reviews/${example.slug}`} className="mt-5 inline-flex text-footnote font-semibold text-[var(--color-text-secondary)] underline underline-offset-3 transition-colors hover:text-[var(--color-text-primary)]">
            {ru ? "Открыть все темы и исходные отзывы →" : "Browse every theme and source review →"}
          </Link>
        </Section>
      )}

      <Section id="install" kicker={ru ? "Подключение" : "Setup"} title={ru ? "Пара минут в любом клиенте" : "A couple of minutes in any client"}>
        <InstallPicker ru={ru} paid={paid} />
      </Section>

      {user && (
        <Section id="connections" kicker={ru ? "Безопасность" : "Security"} title={ru ? "Подключённые клиенты" : "Connected clients"}>
          <McpConnections initial={connections} ru={ru} />
        </Section>
      )}

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
        title={ru ? `${TOOLS.length} ${plural(TOOLS.length, "инструмент", "инструмента", "инструментов")} для исследования ниши` : `${TOOLS.length} tools for niche research`}
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
            ? `Базовая разметка есть у всех ${reviews.toLocaleString(lc)} отзывов в ${niches} нишах. Для ${t.niches} ниш и ${t.reviews.toLocaleString(lc)} отзывов есть дополнительный слой узких тем конкретных приложений.`
            : `All ${reviews.toLocaleString(lc)} reviews across ${niches} niches have corpus-level labels. ${t.niches} niches and ${t.reviews.toLocaleString(lc)} reviews also have a deeper app-specific theme layer.`}
        </p>
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
