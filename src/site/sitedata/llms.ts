// /llms.txt, /llms-full.txt, /llms-full.ru.txt — the site as plain Markdown for language models
// (llmstxt.org). No AI vendor documents reading these files, so they are a cheap extra next to
// what actually gets a site cited (server-rendered pages, the sitemaps, IndexNow, robots.txt that
// welcomes the AI crawlers); they must simply be true and useful.
//
// PUBLIC content only — exactly what a signed-out visitor sees on the site: the rating (free
// since 2026-09-25), «Пульс» needs without their gated quotes, the research catalog cards (name
// and summary), the free breakdown and the free ideas in full. Locked breakdowns and ideas are
// never read here (ARCHITECTURE §2: paid text never reaches a viewer without access).
// Server-only; built at build time (the routes are force-static).

import "server-only";

import { APP_STORE_URL, SITE_URL } from "../config";
import { getCatalog, getIdea, getManifest, getResearch } from "../content";
import type { ResearchFile } from "../content/types";
import { aboutAppsPhrase, byStrength, countsFacts, needText } from "../features/pulse/query";
import { pulseStrings } from "../features/pulse/strings";
import type { PulseNeed } from "../features/pulse/types";
import { h1Name } from "../features/rating/seo";
import { ratingStrings } from "../features/rating/strings";
import { displayTitle } from "../features/rating/text";
import { format } from "../i18n/strings";
import { FREE_CATEGORY, FREE_IDEAS } from "../manifest.generated";
import { routes } from "../routing";
import { getPulseCategoryNames, getPulseDemand, pulseCategoryHref } from "./pulse";
import { getRatingNiche, listRatingNiches } from "./rating";

type L = "en" | "ru";

/** Apps per rating topic in llms-full (the page lists them all). */
const FULL_TOP_APPS = 5;
/** Strongest needs in llms.txt. */
const INDEX_TOP_NEEDS = 25;

const abs = (path: string) => `${SITE_URL}${path}`;
const oneLine = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
const num = (l: L, n: number) => n.toLocaleString(l === "ru" ? "ru-RU" : "en-US");

const COPY = {
  en: {
    title: "inApp",
    fullTitle: "inApp — public content in full (English)",
    intro: (f: Facts) =>
      `inApp reads App Store reviews at scale (${aboutAppsPhrase("en", pulseStrings.en, f.reviews, f.apps)}) and turns them into research for people who build and choose apps: a free app rating scored from review text (${num("en", f.ratedApps)} apps in ${f.ratingTopics} categories), «Pulse» — ${f.needs} concrete user needs scored by how much they hurt, breakdowns of ${f.topics} app categories and product ideas grounded in reviews. Site languages: English, Russian, German, French, Japanese. There is an iPhone app and an MCP server for AI assistants.`,
    rating: "App ratings (free, from review text)",
    ratingLead: "Every app gets a 0–100 score from what its reviews say, not from its store stars; each page shows what people praise, what they complain about and who the app suits.",
    pulse: "Pulse: what app users need",
    pulseLead: "Concrete needs and pains mentioned in reviews, each with a pain score from 1 to 10 (share of the category's reviews, breadth across apps, volume).",
    pulseAll: "All needs",
    research: "Research breakdowns of app categories",
    researchLead: (free: string) => `Each breakdown reads a category's reviews and explains what users value and what they miss. «${free}» is free; the others are part of inApp Plus.`,
    tools: "Tools",
    mcp: "MCP server for AI assistants",
    mcpLead: "Connect inApp to Claude Code, Claude Desktop, Cursor, VS Code and other MCP clients (OAuth): niche themes, needs, ratings and ideas as tools.",
    app: "inApp for iPhone",
    appLead: "The breakdowns and ideas with bookmarks and notes.",
    full: "Full content",
    fullEn: "Everything public on the site as Markdown — English",
    fullRu: "Everything public on the site as Markdown — Russian",
    optional: "Optional",
    reviews: "Review archive: reviews of each app grouped by theme",
    methodology: "How the scores are made",
    contacts: "Contacts and support",
    terms: "Terms of use",
    privacy: "Privacy",
    painScore: (n: number) => `pain ${n}/10`,
    needFacts: (need: PulseNeed) => countsFacts("en", pulseStrings.en, need).join(", "),
    score: (n: number) => `${n}/100`,
    store: (avg: number, n: number) => `App Store ★${avg.toFixed(1)} from ${num("en", n)} ratings`,
    loved: "Praised",
    weak: "Complaints",
    whoFor: "Suits",
    appsCount: (n: number) => `${num("en", n)} apps`,
    top: "top",
    free: "free",
    freeArticle: (name: string) => `Free breakdown in full: ${name}`,
    freeIdeas: "Free ideas in full",
    audiences: "Who it is for",
    directions: "Other directions",
    source: (date: string) => `Source: ${SITE_URL} · content updated ${date}`,
    page: "Page",
  },
  ru: {
    title: "inApp",
    fullTitle: "inApp — всё открытое содержимое сайта (русский)",
    intro: (f: Facts) =>
      `inApp читает отзывы из App Store (${aboutAppsPhrase("ru", pulseStrings.ru, f.reviews, f.apps)}) и превращает их в исследования для тех, кто делает и выбирает приложения: бесплатный рейтинг приложений по тексту отзывов (приложений — ${num("ru", f.ratedApps)}, категорий — ${f.ratingTopics}), «Пульс» — конкретные потребности пользователей с оценкой того, насколько они болят (всего ${f.needs}), разборы категорий приложений (${f.topics}) и идеи продуктов по отзывам. Языки сайта: русский, английский, немецкий, французский, японский. Есть приложение для iPhone и MCP-сервер для ИИ-ассистентов.`,
    rating: "Рейтинги приложений (бесплатно, по тексту отзывов)",
    ratingLead: "Каждое приложение получает оценку от 0 до 100 по тому, что пишут в отзывах, а не по звёздам в сторе; на странице — за что хвалят, на что жалуются и кому подойдёт.",
    pulse: "Пульс: что нужно пользователям приложений",
    pulseLead: "Конкретные потребности и боли из отзывов, у каждой — оценка боли от 1 до 10 (доля отзывов категории, охват приложений, объём).",
    pulseAll: "Все потребности",
    research: "Разборы категорий приложений",
    researchLead: (free: string) => `Каждый разбор читает отзывы категории и объясняет, что людям важно и чего не хватает. «${free}» — бесплатно, остальные входят в inApp Plus.`,
    tools: "Инструменты",
    mcp: "MCP-сервер для ИИ-ассистентов",
    mcpLead: "Подключите inApp к Claude Code, Claude Desktop, Cursor, VS Code и другим MCP-клиентам (OAuth): темы ниш, потребности, рейтинги и идеи как инструменты.",
    app: "inApp для iPhone",
    appLead: "Разборы и идеи с закладками и заметками.",
    full: "Полное содержимое",
    fullEn: "Всё открытое содержимое сайта в Markdown — английский",
    fullRu: "Всё открытое содержимое сайта в Markdown — русский",
    optional: "Дополнительно",
    reviews: "Архив отзывов: отзывы о каждом приложении по темам",
    methodology: "Как считаются оценки",
    contacts: "Контакты и поддержка",
    terms: "Условия использования",
    privacy: "Конфиденциальность",
    painScore: (n: number) => `боль ${n}/10`,
    needFacts: (need: PulseNeed) => countsFacts("ru", pulseStrings.ru, need).join(", "),
    score: (n: number) => `${n}/100`,
    store: (avg: number, n: number) => `App Store ★${avg.toFixed(1).replace(".", ",")}, оценок: ${num("ru", n)}`,
    loved: "Хвалят",
    weak: "Жалуются",
    whoFor: "Кому",
    appsCount: (n: number) => `приложений: ${num("ru", n)}`,
    top: "лидер",
    free: "бесплатно",
    freeArticle: (name: string) => `Бесплатный разбор целиком: ${name}`,
    freeIdeas: "Бесплатные идеи целиком",
    audiences: "Для кого",
    directions: "Другие направления",
    source: (date: string) => `Источник: ${SITE_URL} · содержимое обновлено ${date}`,
    page: "Страница",
  },
} as const;

type Facts = { reviews: number; apps: number; ratedApps: number; ratingTopics: number; needs: number; topics: number };

async function facts(l: L): Promise<Facts> {
  const [manifest, pulse, catalog] = await Promise.all([getManifest(), getPulseDemand(), getCatalog(l)]);
  const niches = listRatingNiches(l);
  return {
    reviews: manifest.corpus.reviews,
    apps: manifest.corpus.apps,
    ratedApps: niches.reduce((sum, n) => sum + n.count, 0),
    ratingTopics: niches.length,
    needs: pulse.needs.length,
    topics: catalog.categories.length,
  };
}

function ratingIndexLines(l: L): string[] {
  const s = ratingStrings[l];
  return listRatingNiches(l).flatMap((card) => {
    const niche = getRatingNiche(l, card.slug);
    if (!niche) return [];
    const leader = niche.apps[0];
    const top = leader ? `; ${COPY[l].top}: ${displayTitle(leader.short)}${leader.realScore !== null ? ` (${leader.realScore}/100)` : ""}` : "";
    return [`- [${format(s.nicheH1, { name: h1Name(l, niche) })}](${abs(routes.ratingNiche(l, card.slug))}): ${COPY[l].appsCount(niche.count)}${top}`];
  });
}

/** /llms.txt — the map (English, the llms.txt default; links to both full files). */
export async function buildLlmsIndex(): Promise<string> {
  const l: L = "en";
  const c = COPY[l];
  const [f, pulse, catalog] = await Promise.all([facts(l), getPulseDemand(), getCatalog(l)]);
  const names = await getPulseCategoryNames(l, pulse);
  const freeName = catalog.categories.find((cat) => cat.slug === FREE_CATEGORY)?.name ?? FREE_CATEGORY;
  const out: string[] = [`# ${c.title}`, "", `> ${c.intro(f)}`, ""];

  out.push(`## ${c.rating}`, "", c.ratingLead, "", `- [${ratingStrings[l].catalogTitle}](${abs(routes.rating(l))})`, ...ratingIndexLines(l), "");

  out.push(`## ${c.pulse}`, "", c.pulseLead, "", `- [${c.pulseAll}](${abs(routes.pulse(l))})`);
  for (const need of [...pulse.needs].sort(byStrength).slice(0, INDEX_TOP_NEEDS)) {
    out.push(`- [${oneLine(needText(need.title, l))}](${abs(routes.pulseNeed(l, need.id))}): ${oneLine(needText(need.summary, l))} (${names.get(need.categoryId) ?? need.categoryId}; ${c.painScore(need.score)})`);
  }
  out.push("");

  out.push(`## ${c.research}`, "", c.researchLead(freeName), "", `- [${c.research}](${abs(routes.research(l))})`);
  for (const cat of catalog.categories) {
    out.push(`- [${cat.name}](${abs(routes.topic(l, cat.slug))})${cat.free ? ` (${c.free})` : ""}: ${oneLine(cat.summary)}`);
  }
  out.push("");

  out.push(`## ${c.tools}`, "", `- [${c.mcp}](${abs(routes.mcp(l))}): ${c.mcpLead}`, `- [${c.app}](${APP_STORE_URL}): ${c.appLead}`, "");
  out.push(`## ${c.full}`, "", `- [${c.fullEn}](${SITE_URL}/llms-full.txt)`, `- [${COPY.ru.fullRu}](${SITE_URL}/llms-full.ru.txt)`, "");
  out.push(
    `## ${c.optional}`,
    "",
    `- [${c.reviews}](${abs(routes.reviews(l))})`,
    `- [${c.methodology}](${abs(routes.reviewsMethodology(l))})`,
    `- [${c.contacts}](${abs(routes.contacts(l))})`,
    `- [${c.terms}](${abs(routes.offer(l))})`,
    `- [${c.privacy}](${abs(routes.privacy(l))})`,
    "",
  );
  return out.join("\n");
}

function researchMarkdown(l: L, r: ResearchFile, ideaTitles: Map<string, string>): string[] {
  const c = COPY[l];
  const out: string[] = [`## ${c.freeArticle(r.name)}`, "", `${c.page}: ${abs(routes.topic(l, r.category))}`, "", oneLine(r.summary), "", oneLine(r.lead), ""];
  if (r.audiences.length) {
    out.push(`### ${c.audiences}`, "");
    for (const a of r.audiences) out.push(`- **${oneLine(a.title)}** — ${oneLine(a.body)}`);
    out.push("");
  }
  for (const section of r.sections) {
    out.push(`### ${oneLine(section.title)}`, "");
    if (section.intro) out.push(oneLine(section.intro), "");
    for (const obs of section.observations) {
      out.push(`#### ${oneLine(obs.title)}`, "");
      for (const p of obs.passages) out.push(oneLine(p), "");
      for (const q of obs.quotes) out.push(`> «${oneLine(q.text)}» — ${q.app}, ${q.rating}★`, "");
      for (const pl of obs.placements) {
        const ideas = pl.ideas.map((id) => ideaTitles.get(id)).filter(Boolean);
        out.push(`- **${oneLine(pl.title)}** — ${oneLine(pl.body)}${ideas.length ? ` (${ideas.join("; ")})` : ""}`);
      }
      if (obs.placements.length) out.push("");
    }
  }
  if (r.remainingDirections.length) {
    out.push(`### ${c.directions}`, "");
    for (const pl of r.remainingDirections) out.push(`- **${oneLine(pl.title)}** — ${oneLine(pl.body)}`);
    out.push("");
  }
  if (r.conclusion) out.push(`### ${oneLine(r.conclusion.title)}`, "", oneLine(r.conclusion.body), "");
  return out;
}

/** /llms-full.txt (en) and /llms-full.ru.txt (ru): everything public, as Markdown. */
export async function buildLlmsFull(l: L): Promise<string> {
  const c = COPY[l];
  const [f, manifest, pulse, catalog] = await Promise.all([facts(l), getManifest(), getPulseDemand(), getCatalog(l)]);
  const names = await getPulseCategoryNames(l, pulse);
  const freeName = catalog.categories.find((cat) => cat.slug === FREE_CATEGORY)?.name ?? FREE_CATEGORY;
  const out: string[] = [`# ${c.fullTitle}`, "", `> ${c.intro(f)}`, "", c.source(manifest.contentBuiltAt.slice(0, 10)), ""];

  // The rating: every topic with its intro and its first apps (the page has them all).
  const rs = ratingStrings[l];
  out.push(`## ${c.rating}`, "", c.ratingLead, "", `${c.page}: ${abs(routes.rating(l))} · ${c.methodology}: ${abs(routes.reviewsMethodology(l))}`, "");
  for (const card of listRatingNiches(l)) {
    const niche = getRatingNiche(l, card.slug);
    if (!niche) continue;
    out.push(`### ${format(rs.nicheH1, { name: h1Name(l, niche) })}`, "", `${c.page}: ${abs(routes.ratingNiche(l, niche.slug))} · ${c.appsCount(niche.count)}`, "");
    if (niche.intro) out.push(oneLine(niche.intro), "");
    niche.apps.slice(0, FULL_TOP_APPS).forEach((app, i) => {
      const bits = [
        app.realScore !== null ? c.score(app.realScore) : null,
        app.storeAvg !== null && app.ratings ? c.store(app.storeAvg, app.ratings) : null,
      ].filter(Boolean);
      out.push(`${i + 1}. **[${displayTitle(app.short)}](${abs(routes.ratingApp(l, niche.slug, app.slug))})**${bits.length ? ` — ${bits.join(", ")}` : ""}`);
      if (app.verdict) out.push(`   ${oneLine(app.verdict)}`);
      if (app.loved) out.push(`   - ${c.loved}: ${oneLine(app.loved)}`);
      if (app.weak) out.push(`   - ${c.weak}: ${oneLine(app.weak)}`);
      if (app.whoFor) out.push(`   - ${c.whoFor}: ${oneLine(app.whoFor)}`);
    });
    out.push("");
  }

  // «Пульс»: every need by category (strongest first), without the gated review quotes.
  out.push(`## ${c.pulse}`, "", c.pulseLead, "", `${c.page}: ${abs(routes.pulse(l))}`, "");
  const byCategory = new Map<string, PulseNeed[]>();
  for (const need of [...pulse.needs].sort(byStrength)) byCategory.set(need.categoryId, [...(byCategory.get(need.categoryId) ?? []), need]);
  const categories = [...byCategory.keys()].sort((a, b) => (names.get(a) ?? a).localeCompare(names.get(b) ?? b, l));
  for (const id of categories) {
    // The category's own page (its breakdown or its rating): the filtered feed is not indexable.
    const home = pulseCategoryHref(l, id);
    out.push(`### ${names.get(id) ?? id}`, "", ...(home ? [`${c.page}: ${abs(home.href)}`, ""] : []));
    for (const need of byCategory.get(id) ?? []) {
      out.push(`- **[${oneLine(needText(need.title, l))}](${abs(routes.pulseNeed(l, need.id))})** — ${oneLine(needText(need.summary, l))} (${c.painScore(need.score)}; ${c.needFacts(need)})`);
    }
    out.push("");
  }

  // The research catalog: the public card of every breakdown.
  out.push(`## ${c.research}`, "", c.researchLead(freeName), "");
  for (const cat of catalog.categories) {
    out.push(`- **[${cat.name}](${abs(routes.topic(l, cat.slug))})**${cat.free ? ` (${c.free})` : ""} — ${oneLine(cat.summary)}`);
  }
  out.push("");

  // The free breakdown and the free ideas, in full.
  const freeIdeas = (await Promise.all(FREE_IDEAS.map((id) => getIdea(l, id)))).filter((idea) => idea !== null);
  const ideaTitles = new Map(freeIdeas.map((idea) => [idea.slug, oneLine(idea.title)]));
  const research = await getResearch(l, FREE_CATEGORY);
  if (research) out.push(...researchMarkdown(l, research, ideaTitles));
  if (freeIdeas.length) {
    out.push(`## ${c.freeIdeas}`, "");
    for (const idea of freeIdeas) {
      out.push(`### ${oneLine(idea.title)}`, "", `${c.page}: ${abs(routes.idea(l, idea.slug))}`, "", oneLine(idea.description), "");
      for (const block of idea.blocks) {
        if (block.kind === "heading") out.push(`#### ${oneLine(block.text)}`, "");
        else if (block.kind === "paragraph") out.push(oneLine(block.text), "");
        else if (block.kind === "idea") out.push(`**${oneLine(block.title)}** — ${oneLine(block.text)}`, "");
        else if (block.kind === "quote") out.push(`> «${oneLine(block.quote.text)}» — ${block.quote.app}, ${block.quote.rating}★`, "");
      }
    }
  }

  out.push(`## ${c.tools}`, "", `- [${c.mcp}](${abs(routes.mcp(l))}): ${c.mcpLead}`, `- [${c.app}](${APP_STORE_URL}): ${c.appLead}`, "");
  return out.join("\n");
}
