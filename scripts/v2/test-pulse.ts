// «Пульс» — data and UI contract (SPEC: app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md,
// docs/site-v2/PULSE.md).
//
//   node --import tsx scripts/v2/test-pulse.ts
//
// 1. content/v2/pulse-demand.json: schema, URL-safe unique ids, five languages, score = formula
//    of source.score, category counts, order. Nothing here is hard-coded: ids, counts and
//    categories are derived from the file, which grows while the needs are mined.
// 2. Pure logic: query parsing (?kind= is retired), feed selection, retired/unknown route
//    resolution, phrases, the word-level thresholds, the gauge geometry, the score breakdown and
//    the dot grid (direction A «Прибор», owner 2026-09-25).
// 3. Server-rendered HTML of the real components (the gauge card, the need page's breakdown and
//    dot grid, the evidence gate, «Пульс категории» with its lead gauge and bar rows, its position
//    in the article and the locked preview, the review archive's hub and category blocks, the old
//    bridge on old topic pages) and the sitemap, in-process
//    ("server-only" and CSS imports stubbed). No kind label anywhere; one hue — no amber or red
//    in the rendered HTML or in the Pulse CSS; the block's subtitle prints the host page's own
//    figures; fact lines never break after a «·»; the gauge's box is trimmed to its ink.
// 4. Live HTTP against the running dev server (PULSE_BASE_URL, default http://localhost:3107):
//    feed (no kind switch; ?kind= ignored and still indexable), filters, the need page, evidence
//    gating as a guest, retired-id redirects, 404s, the topic-page embed (right under the hero,
//    first in the TOC, before the paywall when locked) and the review archive (new design: the hub
//    and category pages, right under the header); on each host page (topic, archive category,
//    archive hub, dossier) the block's reviews and apps equal the page's own. Skipped when no
//    server answers.

import { after, before, describe, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import Module from "node:module";
import os from "node:os";
import path from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "../../src/site/i18n/locales";
import { FREE_CATEGORY, LAUNCH_CATEGORIES } from "../../src/site/manifest.generated";
import { DOTS_PER_ROW, dotGrid, GAUGE, gaugeBox, gaugeTicks, PAIN_LEVELS, painLevel, painScore, scoreBreakdown } from "../../src/site/features/pulse/gauge";
import { PulseCard } from "../../src/site/features/pulse/PulseCard";
import { PulseBreakdown, PulseEvidenceList, PulseFacts, PulseStars, PulseWhere, visibleEvidence } from "../../src/site/features/pulse/PulseDetail";
import { PulseGauge } from "../../src/site/features/pulse/PulseGauge";
import { CategoryPulseHero } from "../../src/site/features/pulse/CategoryPulseHero";
import { PulseRows } from "../../src/site/features/pulse/PulseRows";
import { RESEARCH_ARTICLE_UI_KEYS } from "../../src/site/features/research/keys";
import {
  aboutAppsPhrase,
  allNeedsPhrase,
  categoryNeeds,
  countsLine,
  hasCategoryPulse,
  inAppsPhrase,
  isDefaultPulseQuery,
  levelScale,
  levelWord,
  needAria,
  needsPhrase,
  painOfPhrase,
  parsePulseQuery,
  PULSE_EMBED_LIMIT,
  resolvePulseRoute,
  reviewsPhrase,
  selectPulseNeeds,
  sharePercent,
  verifiedPhrase,
} from "../../src/site/features/pulse/query";
import { pulseStrings } from "../../src/site/features/pulse/strings";
import type { PulseDemand } from "../../src/site/features/pulse/types";
import { PULSE_LANGS } from "../../src/site/features/pulse/types";
import { acceptedScores, rawPainScore, validatePulseDemand } from "../../src/site/features/pulse/validate";
import { makeT } from "../../src/site/i18n/translate";
import { decideRoute } from "../../src/site/routing/decide";
import { isTabRoot, routes, tabOf, tabRoot } from "../../src/site/routing";

const FILE = path.resolve("content/v2/pulse-demand.json");
const data = JSON.parse(readFileSync(FILE, "utf8")) as PulseDemand;
const needs = data.needs;
const categoryIds = data.categories.map((c) => c.id);
const withNeeds = new Set(needs.map((n) => n.categoryId));
/** A need whose category is not free, with at least two quotes (the gate has something to hide). */
const gated = needs.find((n) => n.categoryId !== FREE_CATEGORY && n.evidence.length >= 2);
const launchWith = LAUNCH_CATEGORIES.find((c) => withNeeds.has(c));
const launchWithout = LAUNCH_CATEGORIES.find((c) => !withNeeds.has(c));
/** A topic a guest can read (the free one) and one a guest sees locked, both with needs. */
const readableWith = withNeeds.has(FREE_CATEGORY) ? FREE_CATEGORY : undefined;
const lockedWith = LAUNCH_CATEGORIES.find((c) => c !== FREE_CATEGORY && withNeeds.has(c));

/** The public catalogue per locale: a topic's corpus is what its page prints («Мы изучили 18 442 отзыва…»). */
const CATALOGS = Object.fromEntries(
  LOCALES.map((locale) => [locale, JSON.parse(readFileSync(path.resolve(`content/v2/${locale}/catalog.json`), "utf8")) as { categories: { slug: string; corpus: { reviews: number; apps: number } }[] }]),
) as Record<Locale, { categories: { slug: string; corpus: { reviews: number; apps: number } }[] }>;
type Stats = { reviewCount: number; appCount: number };
/**
 * The figures a host page prints for a category: the topic's corpus for a launch category; else a
 * stand-in that differs from the Pulse file's own count, so the tests can tell which one the block
 * printed (it must be the host's).
 */
function hostStats(id: string, locale: Locale = "en"): Stats {
  const corpus = CATALOGS[locale].categories.find((c) => c.slug === id)?.corpus;
  const own = data.categories.find((c) => c.id === id);
  return corpus ? { reviewCount: corpus.reviews, appCount: corpus.apps } : { reviewCount: (own?.reviewCount ?? 0) + 17, appCount: own?.appCount ?? 0 };
}
const render = (el: ReactElement | null) => (el ? renderToStaticMarkup(el) : "");
const unescapeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** «Пульс категории» exactly as CategoryPulse builds it (minus the file loader). */
function hero(id: string, locale: Locale = "en", stats: Stats = hostStats(id, locale)) {
  const own = categoryNeeds(data, id);
  const s = pulseStrings[locale];
  return render(
    CategoryPulseHero({
      needs: own,
      locale,
      strings: s,
      id: "category-pulse",
      categoryId: id,
      heading: s.embedTitle,
      stats,
      allLabel: allNeedsPhrase(locale, s, own.length),
      allHref: routes.pulse(locale, { category: id }),
      needHref: (needId) => routes.pulseNeed(locale, needId),
    }),
  );
}
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;
/** Integers in a text, group separators (space, NBSP, narrow NBSP, comma, dot) dropped: «18 442 отзыва о 61» → [18442, 61]. */
const nums = (text: string) => (text.match(/\d(?:[\d\u00a0\u202f ,.]*\d)?/g) ?? []).map((m) => Number(m.replace(/\D/g, "")));
/** Every «·» of a fact line opens a PulseFactList run («<span class="ia-pulse-kit-fact">· …»): no line ends in a separator. */
const separatorsGlued = (html: string) => count(html, /·/g) === count(html, /<span class="ia-pulse-kit-fact">· /g);
/** Visible text of a fragment: tags dropped, entities decoded, whitespace collapsed. */
const textOf = (html: string) => unescapeHtml(html.replace(/<[^>]+>/g, " ")).replace(/[ \t\r\n]+/g, " ").trim();
/** Ticks of the gauges in `html`: all, filled, needles. */
const ticks = (html: string) => ({
  all: count(html, /<line [^>]*data-tick="(?:on|off)"/g),
  on: count(html, /<line [^>]*data-tick="on"/g),
  needles: count(html, /<line [^>]*data-needle=""/g),
});
/** The old «Просят / Жалуются» labels and switch in all five locales (removed 2026-09-25: «это мусор»). */
const KIND_WORDS = ["Просят", "Жалуются", "Request", "Complaint", "Wunsch", "Beschwerde", "Demande", "Plainte", "要望", "不満"];
/**
 * `text` without the needs' own content (titles and summaries in `locale`): a title may use one of
 * the retired label words legitimately («auf Wunsch», "feature request"); only chrome must not.
 */
const withoutNeedContent = (text: string, locale: Locale) =>
  needs.reduce((acc, n) => acc.split(n.title[locale]).join(" ").split(n.summary[locale]).join(" "), text);
/** Markup that would carry the kind: the old label and switch classes, data-kind, a ?kind= link. */
const KIND_MARKUP = /ia-pulse-kinds?\b|data-kind=|[?&](?:amp;)?kind=/;
/** The retired amber → red ramp of the old PainMeter (#F4B63F at 1 … #E5484D at 10), and red. */
const OLD_RAMP = Array.from({ length: 10 }, (_, i) => {
  const t = i / 9;
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t).toString(16).padStart(2, "0");
  return `#${mix(0xf4, 0xe5)}${mix(0xb6, 0x48)}${mix(0x3f, 0x4d)}`;
});
const OFF_HUE = [...OLD_RAMP, "#c0443f", "#f4928c", "#ff3b30", "#d70015", "--ia-danger", "--ia-error-system"];
const hrefs = (html: string) => [...html.matchAll(/href="([^"]*)"/g)].map((m) => unescapeHtml(m[1]));
/** A distinctive plain run of the quote (letters, digits, spaces) that survives HTML/JSON escaping. */
function snippet(text: string): string {
  const runs = text.match(/[\p{L}\p{N} ]{20,}/gu) ?? [];
  return (runs.sort((a, b) => b.length - a.length)[0] ?? text).trim().slice(0, 48);
}

// ---------------------------------------------------------------------------
// 1. Data
// ---------------------------------------------------------------------------

describe("pulse-demand.json", () => {
  test("passes the shared validator (the same one check-content runs)", () => {
    assert.deepEqual(validatePulseDemand(data), []);
    assert.equal(data.schemaVersion, 1);
    assert.ok(needs.length > 0, "the development build has needs");
  });

  test("ids are unique, <category>--<slug> and URL-safe (no colons, nothing to encode)", () => {
    assert.equal(new Set(needs.map((n) => n.id)).size, needs.length);
    for (const n of needs) {
      assert.match(n.id, /^[a-z0-9]+(?:-[a-z0-9]+)*--[a-z0-9]+(?:-[a-z0-9]+)*$/, n.id);
      assert.ok(n.id.startsWith(`${n.categoryId}--`), n.id);
      assert.equal(encodeURIComponent(n.id), n.id);
      assert.ok(!n.id.includes(":"), n.id);
    }
  });

  test("every need has a title and a summary in all five languages", () => {
    for (const n of needs) {
      for (const lang of PULSE_LANGS) {
        assert.ok(n.title[lang]?.trim(), `${n.id} title.${lang}`);
        assert.ok(n.summary[lang]?.trim(), `${n.id} summary.${lang}`);
      }
    }
  });

  test("score is an integer 1..10 and follows source.score", () => {
    for (const n of needs) {
      assert.ok(Number.isInteger(n.score) && n.score >= 1 && n.score <= 10, `${n.id}: ${n.score}`);
      const raw = rawPainScore(n.reviewCount / n.categoryReviewCount, n.appCount, n.categoryAppCount, n.reviewCount, data.source.score);
      assert.ok(acceptedScores(raw).includes(n.score), `${n.id}: ${n.score} vs ${raw}`);
    }
    // The formula itself: floor share, no apps, floor volume → 1 (clamped); ceiling everywhere → 10.
    const p = data.source.score;
    assert.deepEqual(acceptedScores(rawPainScore(p.shareFloor, 0, 100, p.volumeFloor, p)), [1]);
    assert.deepEqual(acceptedScores(rawPainScore(p.shareCeil * 2, 100, 100, p.volumeCeil * 2, p)), [10]);
    assert.deepEqual(acceptedScores(8.5), [8, 9]);
  });

  test("every category is named in all five locales (a de/fr/ja card never shows an English category)", () => {
    for (const c of data.categories) for (const lang of PULSE_LANGS) assert.ok(c.name[lang]?.trim(), `${c.id} name.${lang}`);
  });

  test("categories list exactly the categories that have needs, with their counts", () => {
    assert.deepEqual([...categoryIds].sort(), [...withNeeds].sort());
    for (const c of data.categories) assert.equal(c.needCount, needs.filter((n) => n.categoryId === c.id).length, c.id);
    for (const id of categoryIds) assert.deepEqual(categoryNeeds(data, id).map((n) => n.rank), categoryNeeds(data, id).map((_, i) => i + 1), id);
  });
});

// ---------------------------------------------------------------------------
// 2. Pure logic
// ---------------------------------------------------------------------------

describe("routing and queries", () => {
  test("Pulse belongs to the new shell in every locale; the tab root is /<L>/pulse", () => {
    for (const locale of LOCALES) {
      for (const pathname of [routes.pulse(locale), routes.pulseNeed(locale, needs[0].id)]) {
        const result = decideRoute({ pathname });
        assert.equal(result.type, "rewrite", pathname);
        if (result.type === "rewrite") assert.equal(result.site, "new", pathname);
      }
      assert.equal(tabRoot(locale, "pulse"), routes.pulse(locale));
      assert.equal(isTabRoot(routes.pulse(locale)), true);
      assert.equal(isTabRoot(routes.pulseNeed(locale, needs[0].id)), false);
      assert.equal(tabOf(`/site/${locale}/pulse/x`), "pulse");
    }
    assert.equal(routes.pulse("ru", { category: "a", page: 1 }), "/ru/pulse?category=a");
    assert.equal(routes.pulse("ru", { q: "виджет", page: 2 }), "/ru/pulse?q=%D0%B2%D0%B8%D0%B4%D0%B6%D0%B5%D1%82&page=2");
  });

  test("query: retired keys (view, scope, sort and now kind) are ignored; category/page are normalized", () => {
    const normal = parsePulseQuery({});
    assert.deepEqual(normal, { q: "", category: "", page: 1 });
    assert.equal(isDefaultPulseQuery(normal), true);
    assert.deepEqual(parsePulseQuery({ view: "signals", sort: "reviews", scope: "universal" }), normal);
    // ?kind= (the removed «Все · Просят · Жалуются» switch) is retired: ignored, and the page it
    // opens is the unfiltered, indexable one (its canonical is the plain feed).
    for (const kind of ["request", "pain", "workaround", ""]) {
      assert.deepEqual(parsePulseQuery({ kind }), normal, kind);
      assert.equal(isDefaultPulseQuery(parsePulseQuery({ kind })), true, kind);
    }
    assert.deepEqual(parsePulseQuery({ kind: "pain", category: categoryIds[0] }), { q: "", category: categoryIds[0], page: 1 });
    assert.equal(parsePulseQuery({ category: "../x" }).category, "");
    assert.deepEqual(parsePulseQuery({ q: [" widget ", "ignored"], page: "NaN" }), { q: "widget", category: "", page: 1 });
    assert.equal(parsePulseQuery({ q: "x".repeat(999), page: "-1" }).q.length, 200);
    assert.equal(parsePulseQuery({ page: "1.5" }).page, 1);
    assert.equal(parsePulseQuery({ page: "3" }).page, 3);
    assert.equal(isDefaultPulseQuery(parsePulseQuery({ category: categoryIds[0] })), false);
    assert.equal(isDefaultPulseQuery(parsePulseQuery({ q: "widget" })), false);
    assert.equal(isDefaultPulseQuery(parsePulseQuery({ page: "2" })), false);
  });

  test("feed: file order (score, then share); category ∩ search; kind never filters", () => {
    const all = selectPulseNeeds(needs, parsePulseQuery({}), "en");
    assert.deepEqual(all.map((n) => n.id), needs.map((n) => n.id));
    assert.deepEqual(selectPulseNeeds(needs, parsePulseQuery({ kind: "pain" }), "en").map((n) => n.id), needs.map((n) => n.id));
    for (const id of categoryIds) {
      const got = selectPulseNeeds(needs, parsePulseQuery({ category: id, kind: "request" }), "ru");
      assert.deepEqual(got.map((n) => n.id), needs.filter((n) => n.categoryId === id).map((n) => n.id));
    }
    for (const locale of LOCALES) {
      const target = needs[needs.length - 1];
      const word = target.title[locale].split(/\s+/).sort((a, b) => b.length - a.length)[0];
      assert.ok(selectPulseNeeds(needs, parsePulseQuery({ q: word }), locale).some((n) => n.id === target.id), `${locale}: ${word}`);
    }
    assert.equal(selectPulseNeeds(needs, parsePulseQuery({ q: "zzzzNoMatch" }), "en").length, 0);
    assert.equal(selectPulseNeeds(needs, parsePulseQuery({ category: "no-such-category" }), "en").length, 0);
  });

  test("detail route: every need resolves; retired ids redirect to their category; unknown ids 404", () => {
    for (const n of needs) assert.deepEqual(resolvePulseRoute(n.id, data), { type: "need", need: n });
    const category = categoryIds[0];
    const retired = [`${category}:insight:a4c76cbc8c7a`, `${category}:signal:66dc308f153c`, `${category}:pattern:48808621cf51`, encodeURIComponent(`${category}:insight:a4c76cbc8c7a`), `insight/${category}:insight:a4c76cbc8c7a`, encodeURIComponent(`insight/${category}:insight:ff`)];
    for (const id of retired) assert.deepEqual(resolvePulseRoute(id, data), { type: "redirect", category }, id);
    for (const id of ["no-such-category:insight:abc", "insight", "insights"]) assert.deepEqual(resolvePulseRoute(id, data), { type: "redirect", category: null }, id);
    for (const id of ["bogus", `${category}--no-such-need`, "%ZZ", "../../x", `${needs[0].id}-x`, "a".repeat(400)]) assert.deepEqual(resolvePulseRoute(id, data), { type: "notFound" }, id);
  });

  test("the embed and its TOC entry use one data test", () => {
    for (const id of [...categoryIds, launchWithout ?? "no-such-category", "no-such-category"]) {
      assert.equal(hero(id).includes('id="category-pulse"'), hasCategoryPulse(data, id), id);
    }
  });
});

describe("phrases", () => {
  const ru = pulseStrings.ru;
  test("ru plurals of отзыв and приложение", () => {
    const want: Record<number, string> = { 1: "1 отзыв", 2: "2 отзыва", 5: "5 отзывов", 11: "11 отзывов", 21: "21 отзыв", 22: "22 отзыва", 112: "112 отзывов" };
    for (const [n, text] of Object.entries(want)) assert.equal(reviewsPhrase("ru", ru, Number(n)), text);
    assert.equal(inAppsPhrase("ru", ru, 67, 100), "в 67 из 100 приложений");
    assert.equal(inAppsPhrase("ru", ru, 3, 21), "в 3 из 21 приложения");
    assert.equal(inAppsPhrase("ru", ru, 1, 1), "в 1 из 1 приложения");
    assert.equal(countsLine("ru", ru, { reviewCount: 267, appCount: 67, categoryAppCount: 100 }), "267 отзывов · в 67 из 100 приложений");
  });
  test("«N потребностей», «Все N потребностей», «N отзывов о M приложениях»", () => {
    const want: Record<number, string> = {
      1: "1 потребность",
      2: "2 потребности",
      5: "5 потребностей",
      11: "11 потребностей",
      21: "21 потребность",
      24: "24 потребности",
      547: "547 потребностей",
    };
    for (const [n, text] of Object.entries(want)) assert.equal(needsPhrase("ru", ru, Number(n)), text);
    assert.equal(needsPhrase("en", pulseStrings.en, 1), "1 need");
    assert.equal(needsPhrase("en", pulseStrings.en, 8), "8 needs");
    assert.equal(needsPhrase("de", pulseStrings.de, 1), "1 Bedürfnis");
    assert.equal(needsPhrase("de", pulseStrings.de, 8), "8 Bedürfnisse");
    assert.equal(needsPhrase("fr", pulseStrings.fr, 1), "1 besoin");
    assert.equal(needsPhrase("fr", pulseStrings.fr, 8), "8 besoins");
    assert.equal(needsPhrase("ja", pulseStrings.ja, 8), "8件のニーズ");
    assert.equal(allNeedsPhrase("ru", ru, 7), "Все 7 потребностей");
    assert.equal(allNeedsPhrase("ru", ru, 3), "Все 3 потребности");
    assert.equal(allNeedsPhrase("ru", ru, 547), "Все 547 потребностей");
    assert.equal(allNeedsPhrase("en", pulseStrings.en, 7), "All 7 needs");
    assert.equal(allNeedsPhrase("de", pulseStrings.de, 7), "Alle 7 Bedürfnisse");
    assert.equal(allNeedsPhrase("fr", pulseStrings.fr, 7), "Voir les 7 besoins");
    assert.equal(allNeedsPhrase("ja", pulseStrings.ja, 7), "7件のニーズをすべて見る");
    // ru groups thousands with a no-break space (Intl).
    assert.equal(aboutAppsPhrase("ru", ru, 45975, 100), "45\u00a0975 отзывов о 100 приложениях");
    assert.equal(aboutAppsPhrase("ru", ru, 18425, 61), "18\u00a0425 отзывов о 61 приложении");
    assert.equal(aboutAppsPhrase("ru", ru, 1449861, 4623), "1\u00a0449\u00a0861 отзыв о 4\u00a0623 приложениях");
    assert.equal(aboutAppsPhrase("en", pulseStrings.en, 45975, 100), "45,975 reviews of 100 apps");
    assert.equal(aboutAppsPhrase("de", pulseStrings.de, 45975, 100), "45.975 Bewertungen zu 100 Apps");
    assert.match(aboutAppsPhrase("fr", pulseStrings.fr, 45975, 100), /^45\s975 avis sur 100 applis$/);
    assert.equal(aboutAppsPhrase("ja", pulseStrings.ja, 45975, 100), "100アプリの45,975件のレビュー");
  });
  test("the text alternative of a card or row: «Боль 7 из 10, сильная. 267 отзывов, в 67 из 100 приложений.»", () => {
    const need = { score: 7, reviewCount: 267, appCount: 67, categoryAppCount: 100 };
    assert.equal(needAria("ru", ru, need), "Боль 7 из 10, сильная. 267 отзывов, в 67 из 100 приложений.");
    assert.equal(needAria("en", pulseStrings.en, need), "Pain 7 out of 10, strong. 267 reviews, in 67 of 100 apps.");
    assert.equal(needAria("de", pulseStrings.de, need), "Schmerz 7 von 10, stark. 267 Bewertungen, in 67 von 100 Apps.");
    assert.equal(needAria("fr", pulseStrings.fr, { ...need, score: 9 }), "Douleur 9 sur 10, aiguë. 267 avis, dans 67 applis sur 100.");
    assert.equal(needAria("ja", pulseStrings.ja, need), "ペイン 10段階中7、強い。267件のレビュー、100アプリ中67アプリ。");
    assert.equal(painOfPhrase(ru, 7), "боль 7 из 10");
  });
  test("other languages", () => {
    assert.equal(reviewsPhrase("en", pulseStrings.en, 1), "1 review");
    assert.equal(countsLine("en", pulseStrings.en, { reviewCount: 1267, appCount: 67, categoryAppCount: 100 }), "1,267 reviews · in 67 of 100 apps");
    assert.equal(reviewsPhrase("de", pulseStrings.de, 1), "1 Bewertung");
    assert.equal(inAppsPhrase("de", pulseStrings.de, 67, 100), "in 67 von 100 Apps");
    assert.equal(inAppsPhrase("fr", pulseStrings.fr, 1, 100), "dans 1 appli sur 100");
    assert.equal(inAppsPhrase("fr", pulseStrings.fr, 67, 100), "dans 67 applis sur 100");
    assert.equal(reviewsPhrase("ja", pulseStrings.ja, 267), "267件のレビュー");
    assert.match(sharePercent("en", 0.0004), /^<0\.1\s?%$/);
    assert.match(sharePercent("en", 0.018662), /^1\.9\s?%$/);
    assert.equal(verifiedPhrase("ru", ru, { precision: 0.873, precisionSample: 55 }), "проверено вручную: 48 из 55");
    assert.equal(verifiedPhrase("ru", ru, { precision: null, precisionSample: 0 }), null);
  });
  test("every string table row is filled in all five locales", () => {
    const keys = Object.keys(pulseStrings.ru).sort();
    for (const locale of LOCALES) {
      assert.deepEqual(Object.keys(pulseStrings[locale]).sort(), keys, locale);
      for (const k of keys) assert.ok(pulseStrings[locale][k as keyof typeof pulseStrings.ru].trim(), `${locale}.${k}`);
    }
  });
  test("«Как считаем» states the published range 1..10 (SPEC) and the word levels, in every locale", () => {
    for (const locale of LOCALES) {
      const text = pulseStrings[locale].aboutScore;
      assert.match(text, /(?<!\d)1\s*(?:до|to|bis|à|〜)\s*10(?!\d)/, locale);
      assert.doesNotMatch(text, /(?<!\d)0\s*(?:до|to|bis|à|〜)\s*10(?!\d)/, locale);
    }
    assert.equal(levelScale("ru", ru), "1–3 фоновая · 4–6 заметная · 7–8 сильная · 9–10 острая");
    assert.equal(levelScale("en", pulseStrings.en), "1–3 mild · 4–6 noticeable · 7–8 strong · 9–10 acute");
  });
  test("no «Просят / Жалуются» in the interface strings (owner, 2026-09-25: «это мусор»)", () => {
    for (const locale of LOCALES) {
      const keys = Object.keys(pulseStrings[locale]);
      assert.ok(!keys.some((k) => /^kind|^filter(All|Request|Pain)$/.test(k)), `${locale}: ${keys.filter((k) => /kind|filter/.test(k))}`);
      for (const [key, value] of Object.entries(pulseStrings[locale])) {
        assert.ok(!/\b(?:просят|жалуются)\b|Просят|Жалуются/.test(value), `${locale}.${key}: ${value}`);
      }
    }
  });
});

describe("direction A «Прибор»: word level, gauge, breakdown, dot grid", () => {
  test("word levels: 1–3 mild, 4–6 noticeable, 7–8 strong, 9–10 acute — one function, five locales", () => {
    const want = ["mild", "mild", "mild", "mild", "noticeable", "noticeable", "noticeable", "strong", "strong", "acute", "acute"];
    for (let score = 0; score <= 10; score++) assert.equal(painLevel(score), want[score], String(score));
    assert.equal(painLevel(6.6), "strong");
    assert.equal(painLevel(42), "acute");
    // The bands cover 1..10 without gaps or overlaps, in order.
    assert.deepEqual(PAIN_LEVELS.flatMap((b) => Array.from({ length: b.to - b.from + 1 }, (_, i) => b.from + i)), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const words: Record<Locale, string[]> = {
      ru: ["Фоновая", "Заметная", "Сильная", "Острая"],
      en: ["Mild", "Noticeable", "Strong", "Acute"],
      de: ["Leicht", "Spürbar", "Stark", "Akut"],
      fr: ["Légère", "Notable", "Forte", "Aiguë"],
      ja: ["軽い", "目立つ", "強い", "深刻"],
    };
    for (const locale of LOCALES) assert.deepEqual([2, 5, 8, 10].map((score) => levelWord(pulseStrings[locale], score)), words[locale], locale);
  });

  test("gauge: 10 ticks, the first `score` on, the last of them the longer needle, all inside the box", () => {
    for (const size of ["card", "page"] as const) {
      const g = GAUGE[size];
      for (let score = 0; score <= 10; score++) {
        const t = gaugeTicks(score, g);
        assert.equal(t.length, 10);
        assert.deepEqual(t.map((x) => x.on), t.map((_, i) => i < score), `${size} ${score}`);
        assert.deepEqual(t.filter((x) => x.needle).map((x) => x.index), score ? [score] : [], `${size} ${score}`);
        for (const x of t) {
          const len = Math.hypot(x.x2 - x.x1, x.y2 - x.y1);
          assert.ok(Math.abs(len - (x.needle ? g.needleOuter - g.needleInner : g.outer - g.inner)) < 0.05, `${size} ${score} #${x.index}`);
          for (const [px, py] of [[x.x1, x.y1], [x.x2, x.y2]]) {
            assert.ok(px - g.stroke / 2 >= 0 && px + g.stroke / 2 <= g.width && py - g.stroke / 2 >= 0 && py + g.stroke / 2 <= g.height, `${size} ${score} #${x.index} leaves the box`);
          }
        }
        // Left to right: the ticks sweep 171° → 9°, 18° apart.
        const angles = t.map((x) => (Math.atan2(g.cy - x.y2, x.x2 - g.cx) * 180) / Math.PI);
        assert.ok(angles.every((a, i) => Math.abs(a - (180 - (i + 0.5) * 18)) < 0.05), `${size} ${score}: ${angles}`);
      }
    }
    assert.equal(painScore(7.4), 7);
    assert.equal(painScore(-3), 0);
    assert.equal(painScore(Number.NaN), 0);
    // Rendered: the same counts, the number inside, aria-hidden, and ids unique per gauge.
    for (let score = 1; score <= 10; score++) {
      const html = render(PulseGauge({ score, id: "pg-x" }));
      assert.deepEqual(ticks(html), { all: 10, on: score, needles: 1 }, String(score));
      assert.match(html, new RegExp(`<text class="ia-pulse-gauge__n"[^>]*>${score}</text>`));
      assert.match(html, /^<svg[^>]*aria-hidden="true"/);
      assert.ok(html.includes('id="pg-x-fill"') && html.includes('url(#pg-x-fill)') && html.includes('url(#pg-x-glow)'));
    }
    const page = render(PulseGauge({ score: 7, id: "pg-y", size: "page" }));
    assert.match(page, />1<\/text>/);
    assert.match(page, />10<\/text>/);
  });

  test("gauge box: trimmed to the ticks' ink, so the dial starts at the text column's edge; the CSS sizes match", () => {
    for (const size of ["card", "page"] as const) {
      const g = GAUGE[size];
      const box = gaugeBox(g);
      // All ten ticks at their normal length (a score of 0 has no needle): their outermost ink.
      const t = gaugeTicks(0, g);
      const left = Math.min(...t.flatMap((x) => [x.x1, x.x2])) - g.stroke / 2;
      const right = Math.max(...t.flatMap((x) => [x.x1, x.x2])) + g.stroke / 2;
      assert.ok(Math.abs(box.x - left) < 0.02, `${size}: box starts at ${box.x}, ink at ${left}`);
      assert.ok(Math.abs(box.x + box.width - right) < 0.02, `${size}: box ends at ${box.x + box.width}, ink at ${right}`);
      assert.equal(box.height, g.height, size);
      const html = render(PulseGauge({ score: 7, id: "pg-box", size }));
      assert.match(html, new RegExp(`^<svg[^>]* width="${box.width}" height="${box.height}" viewBox="${box.x} 0 ${box.width} ${box.height}"`), size);
    }
    // The block sizes the card gauge in CSS: 84×56, × 4/3 in a wide block.
    const card = gaugeBox(GAUGE.card);
    const css = readFileSync(path.resolve("src/site/features/pulse/category-pulse-hero.css"), "utf8");
    const sizes = [...css.matchAll(/\.ia-pulse-hero__gauge \{\s*width: ([\d.]+)px;\s*height: ([\d.]+)px;/g)].map((m) => [Number(m[1]), Number(m[2])]);
    assert.deepEqual(sizes, [
      [Math.round(card.width), card.height],
      [Math.round((card.width * 4) / 3), Math.round(((card.height * 4) / 3) * 100) / 100],
    ]);
  });

  test("breakdown: the three terms add up to the raw score; the shown parts to a total that rounds to the score", () => {
    const p = data.source.score;
    let pulled = 0;
    for (const n of needs) {
      const b = scoreBreakdown(n, p);
      const raw = rawPainScore(n.reviewCount / n.categoryReviewCount, n.appCount, n.categoryAppCount, n.reviewCount, p);
      assert.deepEqual(b.parts.map((x) => x.key), ["share", "apps", "reviews"]);
      assert.deepEqual(b.parts.map((x) => x.max), [10 * p.shareWeight, 10 * p.breadthWeight, 10 * p.volumeWeight].map((m) => Math.round(m * 1000) / 1000));
      // Exact parts: the formula, split.
      const sum = b.parts.reduce((a, x) => a + x.value, 0);
      assert.ok(Math.abs(sum - raw) <= 0.05 && Math.abs(b.raw - raw) < 1e-9, `${n.id}: ${sum} vs ${raw}`);
      assert.ok(acceptedScores(sum).includes(n.score), `${n.id}: the parts round to ${n.score}`);
      // Shown parts: each its value rounded down or up to 0.1, within its maximum; they add up to
      // the total, which is within 0.1 of the raw score and rounds (half up, as people do) to the score.
      for (const x of b.parts) {
        assert.ok([Math.floor(x.value * 10 + 1e-9), Math.ceil(x.value * 10 - 1e-9)].includes(Math.round(x.shown * 10)), `${n.id} ${x.key}: ${x.shown} vs ${x.value}`);
        assert.ok(x.shown >= 0 && x.shown <= x.max, `${n.id} ${x.key}`);
      }
      const shown = Math.round(b.parts.reduce((a, x) => a + x.shown * 10, 0));
      assert.equal(shown, Math.round(b.total * 10), n.id);
      assert.ok(Math.abs(b.total - raw) < 0.1 + 1e-9, `${n.id}: total ${b.total} vs raw ${raw}`);
      assert.equal(Math.floor(b.total + 0.5 + 1e-9), n.score, `${n.id}: total ${b.total} reads as ${n.score}`);
      if (Math.abs(b.total - raw) > 0.05 + 1e-9) pulled++;
    }
    // Only totals that would have read as the neighbour score (x.45…x.5 → x.5) are pulled by 0.1.
    assert.ok(pulled < needs.length * 0.1, `${pulled} totals pulled`);
    // The synthesis' example: fake profiles and bots, 5.0 + 1.8 + 3.0 = 9.8 → 10.
    const fake = needs.find((n) => n.id === "dating-apps--fake-profiles-bots");
    if (fake) {
      const b = scoreBreakdown(fake, p);
      assert.deepEqual(b.parts.map((x) => x.shown), [5, 1.8, 3]);
      assert.equal(b.total, 9.8);
    }
    // Rendered: three rows with thin bars of shown / max, the total.
    const n = needs[Math.floor(needs.length / 2)];
    const b = scoreBreakdown(n, p);
    const html = render(PulseBreakdown({ need: n, params: p, locale: "ru", strings: pulseStrings.ru }));
    assert.equal(count(html, /class="ia-pulse-part"/g), 3);
    assert.equal(count(html, /class="ia-pulse-bar ia-pulse-bar--thin/g), 3);
    for (const x of b.parts) assert.ok(html.includes(`data-part="${x.key}" data-shown="${x.shown}" data-max="${x.max}"`), x.key);
    assert.ok(textOf(html).includes(`Из чего складывается ${n.score}/10`));
    assert.ok(textOf(html).includes(`≈ ${n.score}/10`));
  });

  test("dot grid: one dot per app of the category, `appCount` on, filled from the bottom-left", () => {
    for (const n of needs) {
      const grid = dotGrid(n.appCount, n.categoryAppCount);
      assert.equal(grid.dots.length, n.categoryAppCount, n.id);
      assert.equal(grid.dots.filter((d) => d.on).length, n.appCount, n.id);
      assert.equal(grid.rows, Math.ceil(n.categoryAppCount / DOTS_PER_ROW), n.id);
    }
    // 92 of 100: nine full rows on, two dots on the left of the top row.
    const g = dotGrid(92, 100);
    const onAt = (row: number) => g.dots.filter((d) => d.row === row && d.on).map((d) => d.col);
    assert.deepEqual(onAt(9), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepEqual(onAt(0), [0, 1]);
    // 25 of 61: the partial row (one dot) is the top one; the bottom two rows and half the third are on.
    const h = dotGrid(25, 61);
    assert.equal(h.rows, 7);
    assert.deepEqual(h.dots.filter((d) => d.row === 0).map((d) => d.col), [0]);
    assert.deepEqual(h.dots.filter((d) => d.on && d.row === 4).map((d) => d.col), [0, 1, 2, 3, 4]);
    assert.ok(h.dots.filter((d) => d.row >= 5).every((d) => d.on));
    assert.ok(h.dots.filter((d) => d.row < 4).every((d) => !d.on));
    // Rendered, with the legend.
    for (const n of [needs[0], needs[needs.length - 1]]) {
      const html = render(PulseWhere({ need: n, locale: "ru", strings: pulseStrings.ru }));
      assert.equal(count(html, /class="ia-pulse-dots__on"/g), n.appCount, n.id);
      assert.equal(count(html, /class="ia-pulse-dots__off"/g), n.categoryAppCount - n.appCount, n.id);
      assert.ok(textOf(html).includes(`${n.appCount} с этой болью`), n.id);
      if (n.categoryAppCount > n.appCount) assert.ok(textOf(html).includes(`${n.categoryAppCount - n.appCount} без`), n.id);
      assert.ok(textOf(html).includes(pulseStrings.ru.topAppsTitle), n.id);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Server-rendered HTML (in-process)
// ---------------------------------------------------------------------------

describe("rendered HTML", () => {
  test("card: one link; category, title, a gauge with `score` ticks on, the word level, the counts; no kind", () => {
    for (const locale of LOCALES) {
      const s = pulseStrings[locale];
      for (const need of needs) {
        const html = render(PulseCard({ need, categoryName: "Category", locale, strings: s }));
        assert.equal(count(html, /<a\b/g), 1, need.id);
        assert.match(html, new RegExp(`^<a [^>]*href="/${locale}/pulse/${need.id}"`), need.id);
        assert.deepEqual(ticks(html), { all: 10, on: need.score, needles: 1 }, need.id);
        assert.match(html, new RegExp(`<text class="ia-pulse-gauge__n"[^>]*>${need.score}</text>`), need.id);
        const text = textOf(html);
        assert.ok(text.includes(need.title[locale]), `${locale} ${need.id} title`);
        assert.ok(text.includes(levelWord(s, need.score)) && text.includes(painOfPhrase(s, need.score)), `${locale} ${need.id} level`);
        assert.ok(text.includes(countsLine(locale, s, need)), `${locale} ${need.id} counts`);
        assert.ok(separatorsGlued(html), `${locale} ${need.id}: a «·» that can end a line`);
        assert.ok(text.includes(needAria(locale, s, need)), `${locale} ${need.id} text alternative`);
        assert.ok(!/Подробнее|View details/.test(text), "no «Подробнее» button");
        assert.ok(!KIND_MARKUP.test(html), `${need.id}: kind markup`);
        for (const word of KIND_WORDS) assert.ok(!withoutNeedContent(text, locale).includes(word), `${locale} ${need.id}: «${word}»`);
      }
    }
    // Colour never follows the kind: a request and a pain with the same numbers render the same.
    const n = needs[0];
    const asRequest = render(PulseCard({ need: { ...n, kind: "request" }, categoryName: "C", locale: "en", strings: pulseStrings.en }));
    const asPain = render(PulseCard({ need: { ...n, kind: "pain" }, categoryName: "C", locale: "en", strings: pulseStrings.en }));
    assert.equal(asRequest, asPain);
  });

  test("need page facts wrap only between facts; the star split draws nothing for a zero", () => {
    const facts = ["3 827 отзывов", "в 92 из 100 приложений", "8,3 % отзывов категории", "проверено вручную: 51 из 55"];
    const html = render(PulseFacts({ facts, className: "x" }));
    assert.equal(textOf(html), facts.join(" · "));
    assert.ok(separatorsGlued(html));
    assert.equal(count(html, /class="ia-pulse-kit-fact"/g), facts.length);
    const stars = render(PulseStars({ counts: [3336, 341, 150, 0, 0], locale: "ru", strings: pulseStrings.ru }));
    const bars = [...stars.matchAll(/<span class="ia-pulse-stars__bar" aria-hidden="true" data-count="(\d+)">(.*?)<\/span><span class="ia-pulse-stars__count"/g)].map((m) => [Number(m[1]), m[2]]);
    assert.deepEqual(bars.map(([n]) => n), [0, 0, 150, 341, 3336]);
    for (const [n, inner] of bars) assert.equal(inner === "", n === 0, `${n}: ${inner}`);
  });

  test("«Ещё в категории»: bar rows — title, a bar of score × 10 %, «N/10», one link each", () => {
    for (const id of withNeeds) {
      const rows = categoryNeeds(data, id).slice(1);
      if (!rows.length) continue;
      const html = render(PulseRows({ needs: rows, locale: "en", strings: pulseStrings.en }));
      assert.equal(count(html, /class="ia-pulse-barrow"/g), rows.length, id);
      const widths = [...html.matchAll(/class="ia-pulse-bar__fill" style="width:([\d.]+)%"/g)].map((m) => Number(m[1]));
      assert.deepEqual(widths, rows.map((n) => n.score * 10), id);
      const scores = [...html.matchAll(/class="ia-pulse-barrow__n">(\d+)</g)].map((m) => Number(m[1]));
      assert.deepEqual(scores, rows.map((n) => n.score), id);
      for (const n of rows) assert.ok(textOf(html).includes(needAria("en", pulseStrings.en, n)), `${id}: ${n.id}`);
      assert.ok(!KIND_MARKUP.test(html), id);
    }
  });

  test("«Пульс категории»: header, #1 need with its gauge, rows #2…#5 with bars, «Все N потребностей», every link resolves", () => {
    for (const locale of LOCALES) {
      const s = pulseStrings[locale];
      for (const id of withNeeds) {
        const own = categoryNeeds(data, id);
        const html = hero(id, locale);
        const text = textOf(html);
        const where = `${locale} ${id}`;
        // Header: Georgia heading and «7 потребностей · 46 072 отзыва о 100 приложениях» — the host
        // page's figures (`stats`), never the Pulse file's own count (a few duplicates fewer).
        const stats = hostStats(id, locale);
        assert.ok(html.includes(`<h2 class="ia-pulse-hero__heading" id="category-pulse-title">${s.embedTitle}</h2>`), where);
        assert.ok(text.includes(`${needsPhrase(locale, s, own.length)} · ${aboutAppsPhrase(locale, s, stats.reviewCount, stats.appCount)}`), where);
        if (stats.reviewCount !== own[0].categoryReviewCount) assert.ok(!text.includes(aboutAppsPhrase(locale, s, own[0].categoryReviewCount, own[0].categoryAppCount)), `${where}: the file's count`);
        // Fact lines (subtitle, lead line) wrap only between facts, the «·» with the next one.
        assert.ok(separatorsGlued(html), `${where}: a «·» that can end a line`);
        // The #1 need: one gauge with its score, «Главная боль», the title, the level and the counts.
        const lead = /<a[^>]*class="ia-pulse-hero__lead"[^>]*>([\s\S]*?)<\/a>/.exec(html)?.[1] ?? "";
        assert.deepEqual(ticks(lead), { all: 10, on: own[0].score, needles: 1 }, where);
        assert.deepEqual(ticks(html), ticks(lead), `${where}: the only gauge`);
        const leadText = textOf(lead);
        for (const part of [s.topPain, own[0].title[locale], levelWord(s, own[0].score), countsLine(locale, s, own[0]), needAria(locale, s, own[0])]) {
          assert.ok(leadText.includes(part), `${where}: ${part}`);
        }
        // Rows #2…#5 (PULSE_EMBED_LIMIT in all): bars of score × 10 %, «N/10».
        const rows = own.slice(1, PULSE_EMBED_LIMIT);
        assert.equal(count(html, /class="ia-pulse-barrow"/g), rows.length, where);
        const widths = [...html.matchAll(/class="ia-pulse-bar__fill" style="width:([\d.]+)%"/g)].map((m) => Number(m[1]));
        assert.deepEqual(widths, rows.map((n) => n.score * 10), where);
        // No chart, no rank badges, no kind.
        assert.ok(!/ia-pulse-hero__(bars?|chart|badge|num)\b/.test(html), where);
        assert.ok(!KIND_MARKUP.test(html), where);
        for (const word of KIND_WORDS) assert.ok(!withoutNeedContent(text, locale).includes(word), `${where}: «${word}»`);
        // «Все 7 потребностей →».
        const all = /<a[^>]*class="ia-pulse-hero__all"[^>]*>([\s\S]*?)<\/a>/.exec(html)?.[1] ?? "";
        assert.equal(unescapeHtml(all.replace(/<[^>]+>/g, "")), `${allNeedsPhrase(locale, s, own.length)}\u00a0→`, where);
        // Links: the #1 need, the rows, the filtered feed — each a need of this category or the feed.
        const links = hrefs(html);
        assert.equal(links.length, 1 + rows.length + 1, where);
        assert.equal(links[0], routes.pulseNeed(locale, own[0].id), where);
        assert.equal(links.at(-1), routes.pulse(locale, { category: id }), where);
        for (const href of links.slice(0, -1)) {
          const route = resolvePulseRoute(href.replace(`/${locale}/pulse/`, ""), data);
          assert.ok(route.type === "need" && route.need.categoryId === id, `${where}: ${href}`);
        }
        // One hue: no amber or red anywhere in the block.
        for (const hex of OFF_HUE) assert.ok(!html.toLowerCase().includes(hex), `${where}: ${hex}`);
      }
    }
  });

  test("one hue: no amber/red and no kind selectors in the Pulse CSS; the old meter is gone", () => {
    const dir = path.resolve("src/site/features/pulse");
    for (const file of ["pulse.css", "pulse-kit.css", "category-pulse-hero.css"]) {
      const css = readFileSync(path.join(dir, file), "utf8").toLowerCase();
      for (const hex of OFF_HUE) assert.ok(!css.includes(hex), `${file}: ${hex}`);
      assert.ok(!/data-kind|--pulse-kind/.test(css), `${file}: colour by kind`);
      // Every colour is a DS token (or a color-mix of tokens): no hex outside var() fallbacks —
      // nor a URL-encoded one (%23888) in a data: URI.
      const bare = css
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/var\(--ia-[a-z0-9-]+,\s*#[0-9a-f]{3,8}\)/g, "")
        .match(/(?:#|%23)[0-9a-f]{3,8}\b/g);
      assert.equal(bare, null, `${file}: ${bare}`);
    }
    // No coloured glow in dark (it blooms into a halo): the filled ticks drop the SVG filter.
    const kit = readFileSync(path.join(dir, "pulse-kit.css"), "utf8");
    assert.match(kit, /\[data-theme="dark"\] \.ia-pulse-gauge__on \{\s*filter: none;/);
    assert.match(kit, /\[data-theme="system"\] \.ia-pulse-gauge__on \{\s*filter: none;/);
    // The dot grid's legend swatch is the dots' own colour, in both themes.
    const page = readFileSync(path.join(dir, "pulse.css"), "utf8");
    assert.match(page, /\.ia-pulse-dots__on \{\s*fill: var\(--pulse-dot-on\);/);
    assert.match(page, /\.ia-pulse-dots__swatch--on \{\s*background: var\(--pulse-dot-on\);/);
    assert.ok(!/ia-pulse-dots__(?:on|swatch--on) \{[^}]*--ia-accent/.test(page), "dots and swatch share --pulse-dot-on");
    for (const gone of ["PainMeter.tsx", "pain.ts", "pain-meter.css"]) assert.ok(!existsSync(path.join(dir, gone)), gone);
  });

  test("evidence gate: without access only the first quote is rendered, then the lock", (t) => {
    if (!gated) return t.skip("no need with two quotes outside the free category yet");
    const unlock = { href: "/en/plus", label: "Unlock", signInHref: "/en/login" };
    for (const locale of LOCALES) {
      const locked = render(PulseEvidenceList({ need: gated, readable: false, locale, strings: pulseStrings[locale], unlock }));
      assert.equal((locked.match(/<figure/g) ?? []).length, 1);
      assert.ok(locked.includes(`data-evidence-id="${gated.evidence[0].id}"`));
      assert.ok(locked.includes("data-pulse-locked"));
      for (const hidden of gated.evidence.slice(1)) {
        assert.ok(!locked.includes(hidden.id), `${locale}: ${hidden.id} leaked`);
        assert.ok(!unescapeHtml(locked).includes(snippet(hidden.quote)), `${locale}: quote leaked`);
        if (hidden.quoteRu) assert.ok(!unescapeHtml(locked).includes(snippet(hidden.quoteRu)), `${locale}: translation leaked`);
      }
      const open = render(PulseEvidenceList({ need: gated, readable: true, locale, strings: pulseStrings[locale], unlock }));
      assert.equal((open.match(/<figure/g) ?? []).length, gated.evidence.length);
      assert.ok(!open.includes("data-pulse-locked"));
    }
    assert.deepEqual(visibleEvidence(gated, false), gated.evidence.slice(0, 1));
  });

  test("quotes: ru shows the translation with the original behind a disclosure; other locales the original", (t) => {
    const need = needs.find((n) => n.evidence[0]?.quoteRu && n.evidence[0].quoteRu !== n.evidence[0].quote);
    if (!need) return t.skip("no translated quote yet");
    const q = need.evidence[0];
    const unlock = { href: "/x", label: "x", signInHref: null };
    const ru = unescapeHtml(render(PulseEvidenceList({ need, readable: false, locale: "ru", strings: pulseStrings.ru, unlock })));
    assert.ok(ru.includes(q.quoteRu));
    assert.ok(/<details[^>]*>[\s\S]*<blockquote lang="en">/.test(ru));
    assert.ok(ru.includes(q.quote));
    for (const locale of ["en", "de", "fr", "ja"] as const) {
      const html = unescapeHtml(render(PulseEvidenceList({ need, readable: false, locale, strings: pulseStrings[locale], unlock })));
      assert.ok(html.includes(q.quote), locale);
      assert.ok(!html.includes(q.quoteRu), locale);
      assert.ok(!html.includes("<details"), locale);
    }
  });

  describe("server components", () => {
    type Loaded = {
      CategoryPulse: typeof import("../../src/site/features/pulse/CategoryPulse").CategoryPulse;
      PulseTop: typeof import("../../src/site/features/pulse/CategoryPulse").PulseTop;
      ResearchArticle: typeof import("../../src/site/features/research/ResearchArticle").ResearchArticle;
      LockedPreview: typeof import("../../src/site/features/research/LockedPreview").LockedPreview;
      I18nProvider: typeof import("../../src/site/i18n/client").I18nProvider;
      LegacyPulseLink: typeof import("../../src/components/LegacyPulseLink").LegacyPulseLink;
      reviews: typeof import("../../src/lib/reviews");
      reviewPages: typeof import("../../src/site/sitedata/reviews");
      pulse: typeof import("../../src/site/sitedata/pulse");
      sitemap: typeof import("../../src/app/sitemap").default;
    };
    let m: Loaded;
    const loader = Module as unknown as { _load: (request: string, ...rest: unknown[]) => unknown };
    const originalLoad = loader._load;
    before(() => {
      // Next aliases "server-only" to an empty module and bundles CSS; outside Next both are no-ops.
      loader._load = function (this: unknown, request: string, ...rest: unknown[]) {
        if (request === "server-only" || request.endsWith(".css")) return {};
        return originalLoad.call(this, request, ...rest);
      };
      /* eslint-disable @typescript-eslint/no-require-imports */
      m = {
        CategoryPulse: require("../../src/site/features/pulse/CategoryPulse").CategoryPulse,
        PulseTop: require("../../src/site/features/pulse/CategoryPulse").PulseTop,
        ResearchArticle: require("../../src/site/features/research/ResearchArticle").ResearchArticle,
        LockedPreview: require("../../src/site/features/research/LockedPreview").LockedPreview,
        I18nProvider: require("../../src/site/i18n/client").I18nProvider,
        LegacyPulseLink: require("../../src/components/LegacyPulseLink").LegacyPulseLink,
        reviews: require("../../src/lib/reviews"),
        reviewPages: require("../../src/site/sitedata/reviews"),
        pulse: require("../../src/site/sitedata/pulse"),
        sitemap: require("../../src/app/sitemap").default,
      };
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
    after(() => {
      loader._load = originalLoad;
    });

    test("loader: indexes the file; a missing file is an empty state", async () => {
      const got = await m.pulse.getPulseDemand();
      assert.equal(got.needs.length, needs.length);
      assert.equal(got.byId.size, needs.length);
      const empty = await m.pulse.readPulseDemand(path.join(os.tmpdir(), `no-pulse-${process.pid}.json`));
      assert.equal(empty.needs.length, 0);
      assert.equal(empty.categories.length, 0);
    });

    test("category names: the product catalogue in every locale, else the file's name", async () => {
      for (const locale of LOCALES) {
        const names = await m.pulse.getPulseCategoryNames(locale, data);
        for (const c of data.categories) assert.ok(names.get(c.id), `${locale} ${c.id}`);
        const other = data.categories.find((c) => !(LAUNCH_CATEGORIES as readonly string[]).includes(c.id));
        if (other) assert.equal(names.get(other.id), other.name[locale as "ru" | "en"] ?? other.name.en);
      }
    });

    test("«Пульс категории» (CategoryPulse): the tested block, only for categories with needs", async () => {
      for (const id of [...categoryIds, launchWithout ?? "no-such-category"]) {
        for (const locale of ["ru", "ja"] as const) {
          const stats = hostStats(id, locale);
          const html = render(await m.CategoryPulse({ locale, slug: id, corpus: { reviews: stats.reviewCount, apps: stats.appCount } }));
          const own = categoryNeeds(data, id);
          assert.equal(html.includes('id="category-pulse"'), own.length > 0, id);
          if (!own.length) continue;
          assert.equal(html, hero(id, locale, stats), `${locale} ${id}: the page block is the tested one`);
          assert.equal(count(html, /class="ia-pulse-barrow"/g), Math.min(PULSE_EMBED_LIMIT, own.length) - 1);
          assert.ok(html.includes(`href="/${locale}/pulse?category=${id}"`));
          assert.ok(textOf(html).includes(allNeedsPhrase(locale, pulseStrings[locale], own.length)));
        }
      }
    });

    test("embed position: right after the hero — before the article body, before the Plus card", async (t) => {
      const slug = readableWith ?? launchWith;
      if (!slug) return t.skip("no launch topic with needs yet");
      for (const locale of ["ru", "en"] as const) {
        const file = path.resolve(`content/v2/${locale}/research/${slug}.json`);
        if (!existsSync(file)) return t.skip(`no ${file}`);
        const research = JSON.parse(readFileSync(file, "utf8"));
        const ui = JSON.parse(readFileSync(path.resolve(`content/v2/${locale}/ui.json`), "utf8"));
        const tr = makeT(locale, ui, null);
        const catalog = JSON.parse(readFileSync(path.resolve(`content/v2/${locale}/catalog.json`), "utf8"));
        const category = catalog.categories.find((c: { slug: string }) => c.slug === slug);
        // The page passes the article's corpus (the hero's «Мы изучили 18 442 отзыва…»); the locked
        // preview, which prints no corpus, the catalogue's — the same figures.
        assert.deepEqual(research.corpus ?? category.corpus, category.corpus, `${locale}: article and catalogue corpus`);
        const pulse = await m.CategoryPulse({ locale, slug, corpus: research.corpus ?? category.corpus });
        assert.ok(textOf(render(pulse)).includes(aboutAppsPhrase(locale, pulseStrings[locale], category.corpus.reviews, category.corpus.apps)), `${locale}: the block prints the page's corpus`);
        const article = render(m.ResearchArticle({ research, ui, locale, t: tr, ideas: new Map(), afterHero: pulse }));
        const at = article.indexOf('id="category-pulse"');
        assert.ok(at > article.indexOf('id="clarity-research-title"'), `${locale}: after the title`);
        assert.ok(at > article.indexOf("ia-rs-art--cover"), `${locale}: after the cover`);
        assert.ok(at < article.indexOf('id="introduction"'), `${locale}: before the body`);
        const locked = render(
          // The page's provider strings (t.pick(RESEARCH_ARTICLE_UI_KEYS)) for the client parts of the preview.
          createElement(
            m.I18nProvider,
            { locale, strings: tr.pick(RESEARCH_ARTICLE_UI_KEYS) } as Parameters<typeof m.I18nProvider>[0],
            createElement(m.LockedPreview, { locale, category, t: tr, afterHero: pulse }),
          ),
        );
        const lockedAt = locked.indexOf('id="category-pulse"');
        assert.ok(lockedAt > locked.indexOf('id="clarity-locked-title"'), `${locale}: after the locked hero`);
        assert.ok(lockedAt < locked.indexOf('id="clarity-content-paywall"'), `${locale}: before the Plus card`);
        assert.ok(lockedAt < locked.indexOf("ia-rs-lock-card"), `${locale}: before the Plus card`);
      }
    });

    test("review hub (PulseTop): the strongest needs across categories, the hub's own totals, next/link hrefs", async () => {
      // /<L>/reviews prints the archive's totals («71 категория · 4 623 приложения · 1 451 072
      // отзыва») right above the block; the block repeats its reviews and apps.
      const totals = m.reviewPages.reviewTotals();
      const legacy = m.reviews.totals();
      assert.deepEqual([totals.reviews, totals.apps], [legacy.sourceReviews, legacy.sourceApps], "the new hub prints the archive's source totals");
      for (const locale of ["ru", "en", "ja"] as const) {
        const s = pulseStrings[locale];
        const hub = render(await m.PulseTop({ locale, totals: { reviews: totals.reviews, apps: totals.apps } }));
        assert.ok(hub.includes('id="pulse-top"'), locale);
        assert.ok(hub.includes(`href="/${locale}/pulse"`), locale);
        assert.ok(textOf(hub).includes(`${needsPhrase(locale, s, needs.length)} · ${aboutAppsPhrase(locale, s, totals.reviews, totals.apps)}`), locale);
        assert.ok(separatorsGlued(hub), locale);
        assert.ok(textOf(hub).includes(allNeedsPhrase(locale, s, needs.length)), locale);
        assert.deepEqual(ticks(hub), { all: 10, on: needs[0].score, needles: 1 }, locale);
        assert.equal(count(hub, /class="ia-pulse-barrow"/g), Math.min(PULSE_EMBED_LIMIT, needs.length) - 1, locale);
        // Cross-category: each row and the lead name their category (the feed's names).
        assert.equal(count(hub, /class="ia-pulse-barrow__meta"/g), Math.min(PULSE_EMBED_LIMIT, needs.length) - 1, locale);
        const names = await m.pulse.getPulseCategoryNames(locale, data);
        assert.ok(textOf(hub).includes(`${names.get(needs[0].categoryId)}. ${needAria(locale, s, needs[0])}`), locale);
        assert.ok(!KIND_MARKUP.test(hub), locale);
        for (const word of KIND_WORDS) assert.ok(!withoutNeedContent(textOf(hub), locale).includes(word), `${locale}: ${word}`);
        const pulseRoot = `/${locale}/pulse`;
        for (const href of hrefs(hub).filter((h) => h !== pulseRoot)) {
          assert.ok(href.startsWith(`${pulseRoot}/`), `${locale}: ${href}`);
          assert.equal(resolvePulseRoute(href.slice(pulseRoot.length + 1), data).type, "need", href);
        }
      }
    });

    test("review category page (CategoryPulse): the archive header's figures, nothing for a category without needs", async () => {
      for (const id of categoryIds) {
        // /<L>/reviews/<slug> prints «100 apps · 46,072 reviews» under its name (getReviewNiche);
        // the old archive header and the dossier printed the same figures.
        const niche = m.reviewPages.getReviewNiche("en", id);
        if (!niche) continue;
        const corpus = { reviews: niche.reviews, apps: niche.apps.length };
        const old = m.reviews.getNiche(id);
        const archive = { reviewCount: (old?.sourceReviews || old?.apps.reduce((sum, app) => sum + app.total, 0)) ?? 0, appCount: m.reviews.listSourceApps(id).length };
        assert.deepEqual({ reviewCount: corpus.reviews, appCount: corpus.apps }, archive, `${id}: new page vs old archive header`);
        const dossier = m.reviews.reviewNicheTotals(id);
        if (dossier) assert.deepEqual(archive, { reviewCount: dossier.reviews, appCount: dossier.apps }, `${id}: archive header vs dossier`);
        const html = render(await m.CategoryPulse({ locale: "en", slug: id, corpus }));
        const own = categoryNeeds(data, id);
        assert.ok(textOf(html).includes(aboutAppsPhrase("en", pulseStrings.en, corpus.reviews, corpus.apps)), `${id}: the page's figures`);
        assert.ok(html.includes('id="category-pulse"'), id);
        assert.ok(html.includes(`href="/en/pulse?category=${id}"`), id);
        assert.ok(html.includes(`href="/en/pulse/${own[0].id}"`), id);
        assert.match(html, new RegExp(`<text class="ia-pulse-gauge__n"[^>]*>${own[0].score}</text>`), id);
        assert.equal(count(html, /class="ia-pulse-barrow"/g), Math.min(PULSE_EMBED_LIMIT, own.length) - 1, id);
        assert.ok(!html.includes("ia-pulse-barrow__meta"), id);
        assert.ok(!/<a href="\/(?!en\/pulse)/.test(html), `${id}: every link leaves for Pulse`);
      }
      assert.equal(render(await m.CategoryPulse({ locale: "ru", slug: launchWithout ?? "no-such-category", corpus: { reviews: 1, apps: 1 } })), "");
    });

    test("old bridge (LegacyPulseLink on old topic pages and NicheDossier): the same block, links via publicHref as plain <a>", async () => {
      for (const id of categoryIds) {
        const dossier = m.reviews.reviewNicheTotals(id);
        const stats = dossier ? { reviewCount: dossier.reviews, appCount: dossier.apps } : hostStats(id);
        const html = render(await m.LegacyPulseLink({ locale: "en", slug: id, stats }));
        const own = categoryNeeds(data, id);
        assert.ok(html.includes('id="category-pulse"'), id);
        assert.deepEqual(ticks(html), { all: 10, on: own[0].score, needles: 1 }, id);
        assert.equal(count(html, /class="ia-pulse-barrow"/g), Math.min(PULSE_EMBED_LIMIT, own.length) - 1, id);
        assert.ok(textOf(html).includes(aboutAppsPhrase("en", pulseStrings.en, stats.reviewCount, stats.appCount)), `${id}: the page's figures`);
        assert.ok(html.includes(`href="/en/pulse?category=${id}"`), id);
        assert.ok(html.includes(`href="/en/pulse/${own[0].id}"`), id);
        assert.ok(!/<a href="\/(?!en\/pulse)/.test(html), `${id}: every link leaves for Pulse`);
      }
      assert.equal(render(await m.LegacyPulseLink({ locale: "ru", slug: launchWithout ?? "no-such-category", stats: { reviewCount: 1, appCount: 1 } })), "");
    });

    test("sitemap: the feed and every need in every locale", async () => {
      const urls = new Set((await m.sitemap()).map((e) => e.url));
      for (const locale of LOCALES) {
        assert.ok(urls.has(`https://inapp.pro/${locale}/pulse`), locale);
        for (const n of needs) assert.ok(urls.has(`https://inapp.pro/${locale}/pulse/${n.id}`), `${locale} ${n.id}`);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Live HTTP (dev server)
// ---------------------------------------------------------------------------

const BASE = process.env.PULSE_BASE_URL ?? "http://localhost:3107";
const live: Promise<boolean> = fetch(`${BASE}/en/pulse`, { signal: AbortSignal.timeout(120_000) }).then((r) => r.ok, () => false);
const get = (p: string) => fetch(`${BASE}${p}`, { redirect: "manual", signal: AbortSignal.timeout(120_000) });
async function needServer(t: TestContext): Promise<boolean> {
  if (await live) return true;
  t.skip(`no server at ${BASE}`);
  return false;
}
const needLinks = (html: string, locale: Locale) => [...html.matchAll(new RegExp(`href="/${locale}/pulse/([a-z0-9-]+--[a-z0-9-]+)"`, "g"))].map((m) => m[1]);

describe(`live HTTP (${BASE})`, { timeout: 600_000 }, () => {
  test("feed in every locale: 200, gauge cards in file order, no kind switch, indexable only unfiltered", async (t) => {
    if (!(await needServer(t))) return;
    const noindex = /<meta name="robots" content="noindex/;
    for (const locale of LOCALES) {
      const res = await get(`/${locale}/pulse`);
      assert.equal(res.status, 200, locale);
      const html = await res.text();
      assert.deepEqual(needLinks(html, locale), needs.slice(0, 24).map((n) => n.id), locale);
      assert.ok(!noindex.test(html), `${locale}: unfiltered feed must be indexable`);
      assert.equal(count(html, /class="ia-pulse-gauge ia-pulse-gauge--card"/g), Math.min(24, needs.length), locale);
      assert.ok(!KIND_MARKUP.test(html), `${locale}: kind switch or label`);
      // The controls: the category picker and the search, nothing else.
      assert.equal(count(html, /<select name="category"/g), 1, locale);
      assert.ok(html.includes('name="q"'), locale);
    }
    assert.ok(!/Просят|Жалуются/.test(await (await get(`/ru/pulse`)).text()), "ru: «Просят / Жалуются»");
    // ?kind= is retired: ignored like view/scope/sort — the unfiltered feed, indexable, canonical /pulse.
    for (const kind of ["pain", "request"]) {
      const html = await (await get(`/en/pulse?kind=${kind}`)).text();
      assert.deepEqual(needLinks(html, "en"), needs.slice(0, 24).map((n) => n.id), kind);
      assert.ok(!noindex.test(html), `?kind=${kind}: the unfiltered page stays indexable`);
      assert.match(html, /<link rel="canonical" href="https:\/\/inapp\.pro\/en\/pulse"/, kind);
    }
    for (const q of [`category=${categoryIds[0]}`, "q=widget", "page=2", `kind=pain&category=${categoryIds[0]}`]) {
      assert.ok(noindex.test(await (await get(`/en/pulse?${q}`)).text()), `?${q}: filtered pages are noindex`);
    }
  });

  test("filters: category (with ?kind= ignored) and search", async (t) => {
    if (!(await needServer(t))) return;
    for (const id of categoryIds) {
      const html = await (await get(`/ru/pulse?category=${id}`)).text();
      const got = needLinks(html, "ru");
      assert.deepEqual(got, needs.filter((n) => n.categoryId === id).slice(0, 24).map((n) => n.id), id);
    }
    const id = categoryIds[0];
    assert.deepEqual(needLinks(await (await get(`/ru/pulse?category=${id}&kind=request`)).text(), "ru"), needs.filter((n) => n.categoryId === id).slice(0, 24).map((n) => n.id));
    const empty = await (await get(`/en/pulse?q=zzzzNoMatch`)).text();
    assert.ok(empty.includes("data-pulse-empty"));
  });

  test("need page: the big gauge, the breakdown, the dot grid, bar rows; no kind, no old meter", async (t) => {
    if (!(await needServer(t))) return;
    const n = needs.find((x) => x.id === "dating-apps--fake-profiles-bots") ?? needs[0];
    for (const locale of LOCALES) {
      const res = await get(`/${locale}/pulse/${n.id}`);
      assert.equal(res.status, 200, locale);
      const html = await res.text();
      const gauge = /<svg class="ia-pulse-gauge ia-pulse-gauge--page"[\s\S]*?<\/svg>/.exec(html)?.[0] ?? "";
      assert.deepEqual(ticks(gauge), { all: 10, on: n.score, needles: 1 }, locale);
      assert.ok(html.includes("data-pulse-breakdown"), locale);
      assert.equal(count(html, /class="ia-pulse-part"/g), 3, locale);
      assert.equal(count(html, /class="ia-pulse-dots__on"/g), n.appCount, locale);
      assert.equal(count(html, /class="ia-pulse-dots__off"/g), n.categoryAppCount - n.appCount, locale);
      assert.equal(count(html, /class="ia-pulse-barrow"/g), categoryNeeds(data, n.categoryId).length - 1, locale);
      assert.ok(!KIND_MARKUP.test(html), `${locale}: kind`);
      assert.ok(!/ia-pain-meter|ia-pain-value/.test(html), `${locale}: the old meter`);
      assert.ok(textOf(html).includes(levelWord(pulseStrings[locale], n.score)), locale);
      const facts = /<p class="ia-pulse-detail__numbers">[\s\S]*?<\/p>/.exec(html)?.[0] ?? "";
      assert.ok(facts && separatorsGlued(facts), `${locale}: a «·» that can end a line`);
    }
  });

  test("need page as a guest: first quote public, the rest gated (ru + en)", async (t) => {
    if (!(await needServer(t))) return;
    if (!gated) return t.skip("no gated need yet");
    for (const locale of ["ru", "en"] as const) {
      const res = await get(`/${locale}/pulse/${gated.id}`);
      assert.equal(res.status, 200, locale);
      const html = await res.text();
      assert.ok(html.includes(`data-evidence-id="${gated.evidence[0].id}"`), locale);
      assert.ok(html.includes("data-pulse-locked"), locale);
      for (const hidden of gated.evidence.slice(1)) {
        assert.ok(!html.includes(hidden.id), `${locale}: ${hidden.id} leaked`);
        assert.ok(!unescapeHtml(html).includes(snippet(hidden.quote)), `${locale}: quote leaked`);
        if (hidden.quoteRu) assert.ok(!unescapeHtml(html).includes(snippet(hidden.quoteRu)), `${locale}: translation leaked`);
      }
      assert.ok(unescapeHtml(html).includes(gated.title[locale]), locale);
    }
  });

  test("retired prototype ids redirect to the feed; unknown ids are 404", async (t) => {
    if (!(await needServer(t))) return;
    const category = categoryIds[0];
    for (const id of [`${category}:insight:a4c76cbc8c7a`, encodeURIComponent(`${category}:signal:66dc308f153c`), `insight/${category}:insight:a4c76cbc8c7a`]) {
      const res = await get(`/ru/pulse/${id}`);
      assert.ok([307, 308].includes(res.status), `${id}: ${res.status}`);
      assert.equal(new URL(res.headers.get("location") ?? "", BASE).pathname + new URL(res.headers.get("location") ?? "", BASE).search, `/ru/pulse?category=${category}`, id);
    }
    const unknownCategory = await get(`/en/pulse/no-such-category:insight:abc`);
    assert.ok([307, 308].includes(unknownCategory.status));
    assert.equal(new URL(unknownCategory.headers.get("location") ?? "", BASE).pathname, "/en/pulse");
    for (const id of ["bogus", `${category}--no-such-need`]) assert.equal((await get(`/en/pulse/${id}`)).status, 404, id);
  });

  test("topic page: the embed only for categories with needs", async (t) => {
    if (!(await needServer(t))) return;
    if (launchWith) {
      const html = await (await get(`/en/segment/${launchWith}`)).text();
      assert.equal(count(html, /id="category-pulse"/g), 1, launchWith);
      assert.ok(html.includes(`href="/en/pulse?category=${launchWith}"`), launchWith);
    }
    if (launchWithout) assert.ok(!(await (await get(`/en/segment/${launchWithout}`)).text()).includes('id="category-pulse"'), launchWithout);
  });

  test("topic page: the block sits right under the hero and leads the TOC; before the Plus card when locked", async (t) => {
    if (!(await needServer(t))) return;
    if (readableWith) {
      for (const locale of ["ru", "en"] as const) {
        const html = await (await get(`/${locale}/segment/${readableWith}`)).text();
        const at = html.indexOf('id="category-pulse"');
        assert.ok(at > html.indexOf("ia-rs-art--cover") && at < html.indexOf('id="introduction"'), `${locale}: between the cover and the body`);
        assert.equal(html.match(/<a href="#([a-z0-9-]+)"[^>]*ia-rs-toc__link/)?.[1], "category-pulse", `${locale}: first TOC entry`);
        assert.ok(at < html.indexOf("ia-rs-extras"), `${locale}: not at the end any more`);
        const own = categoryNeeds(data, readableWith);
        const block = html.slice(at, html.indexOf("</section>", at));
        assert.deepEqual(ticks(block), { all: 10, on: own[0].score, needles: 1 }, locale);
        assert.equal(count(block, /class="ia-pulse-barrow"/g), Math.min(PULSE_EMBED_LIMIT, own.length) - 1);
        assert.ok(!KIND_MARKUP.test(block), locale);
        for (const href of hrefs(block)) assert.equal((await get(href)).status, 200, href);
      }
    }
    if (lockedWith) {
      const html = await (await get(`/ru/segment/${lockedWith}`)).text();
      assert.ok(html.includes('id="clarity-content-locked"'), `${lockedWith}: a guest sees the locked preview`);
      const at = html.indexOf('id="category-pulse"');
      assert.ok(at > html.indexOf('id="clarity-locked-title"') && at < html.indexOf('id="clarity-content-paywall"'), `${lockedWith}: between the hero and the Plus card`);
    }
  });

  test("the block's reviews and apps are the host page's own: topic, archive category, archive hub, dossier", async (t) => {
    if (!(await needServer(t))) return;
    /** The block's subtitle: [needs, reviews, apps] (ru/en word order). */
    const block = (html: string) => nums(textOf(/<p class="ia-pulse-hero__sub">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? ""));
    const checked: string[] = [];
    // A readable topic: the hero's «Мы изучили 18 442 отзыва о работе 61 приложения» / "We studied 18,442 reviews about how 61 apps work".
    if (readableWith) {
      for (const locale of ["ru", "en"] as const) {
        const html = await (await get(`/${locale}/segment/${readableWith}`)).text();
        const lede = nums(textOf(/<p class="ia-rs-hero__desc"[^>]*>([\s\S]*?)<\/p>/.exec(html)?.[1] ?? "")).slice(-2);
        assert.equal(lede.length, 2, `${locale}: the corpus sentence`);
        assert.deepEqual(block(html).slice(1), lede, `/${locale}/segment/${readableWith}`);
        checked.push(`/${locale}/segment/${readableWith}`);
      }
    }
    // A locked topic prints no corpus; its block uses the catalogue's, which the readable page prints.
    if (lockedWith) {
      const html = await (await get(`/ru/segment/${lockedWith}`)).text();
      const corpus = hostStats(lockedWith, "ru");
      assert.deepEqual(block(html).slice(1), [corpus.reviewCount, corpus.appCount], `/ru/segment/${lockedWith}`);
    }
    // The review archive (new design since 2026-09-24): «100 приложений · 46 072 отзыва» — the
    // first footnote under the h1 of /<L>/reviews/<slug> — and the hub's «71 категория · 4 623
    // приложения · 1 451 072 отзыва», both right above the block.
    const footnote = (html: string) => nums(textOf(/<\/h1>[\s\S]*?<p class="ia-footnote">([\s\S]*?)<\/p>/.exec(html)?.[1] ?? ""));
    const slug = withNeeds.has("dating-apps") ? "dating-apps" : categoryIds[0];
    for (const locale of ["ru", "en", "de"] as const) {
      const res = await get(`/${locale}/reviews/${slug}`);
      assert.equal(res.status, 200, `/${locale}/reviews/${slug}`);
      const html = await res.text();
      const [apps, reviews] = footnote(html);
      assert.ok(apps && reviews, `/${locale}/reviews/${slug}: the header's figures`);
      assert.deepEqual(block(html).slice(1), [reviews, apps], `/${locale}/reviews/${slug}`);
      checked.push(`/${locale}/reviews/${slug}`);
    }
    for (const locale of ["ru", "en"] as const) {
      const hubRes = await get(`/${locale}/reviews`);
      assert.equal(hubRes.status, 200, `/${locale}/reviews`);
      const html = await hubRes.text();
      const [, apps, reviews] = footnote(html);
      assert.ok(apps && reviews, `/${locale}/reviews: the header's figures`);
      assert.deepEqual(block(html).slice(1), [reviews, apps], `/${locale}/reviews`);
      checked.push(`/${locale}/reviews`);
    }
    // A dossier (an old topic page): «Open 12,593 source reviews» and «51 apps in the archive».
    const dossierSlug = categoryIds.find((id) => !(LAUNCH_CATEGORIES as readonly string[]).includes(id));
    if (dossierSlug) {
      const res = await get(`/en/segment/${dossierSlug}`);
      if (res.status === 200) {
        const html = await res.text();
        const reviews = nums(/Open ([\d,]+) source reviews/.exec(html)?.[1] ?? "")[0];
        const apps = nums(/>([\d,]+)<\/span><span[^>]*>apps in the archive</.exec(html)?.[1] ?? "")[0];
        assert.ok(reviews && apps, `/en/segment/${dossierSlug}: the dossier's figures`);
        assert.deepEqual(block(html).slice(1), [reviews, apps], `/en/segment/${dossierSlug}`);
        checked.push(`/en/segment/${dossierSlug}`);
      }
    }
    assert.ok(checked.length >= 3, `checked: ${checked}`);
  });

  test("review hub and category pages (new design) carry the block right under the header, with no kind label", async (t) => {
    if (!(await needServer(t))) return;
    for (const locale of ["ru", "en"] as const) {
      const html = await (await get(`/${locale}/reviews`)).text();
      const at = html.indexOf('id="pulse-top"');
      assert.ok(at > 0, `/${locale}/reviews: the block`);
      assert.ok(at > html.indexOf('class="ia-footnote"') && at < html.indexOf('id="review-niches"'), `/${locale}/reviews: between the header and the category list`);
      const block = html.slice(at, html.indexOf("</section>", at));
      assert.ok(block.includes(`href="/${locale}/pulse"`), locale);
      assert.ok(needLinks(block, locale).length > 0, locale);
      assert.deepEqual(ticks(block), { all: 10, on: needs[0].score, needles: 1 }, locale);
      assert.ok(!KIND_MARKUP.test(block) && !/Просят|Жалуются/.test(textOf(block)), locale);
      for (const href of hrefs(block)) assert.equal((await get(href)).status, 200, href);
    }
    // The open sample (dating-apps) lists its apps to guests; another category shows the lock card.
    const pages: [string, string, string][] = [];
    if (withNeeds.has("dating-apps")) pages.push(["dating-apps", 'id="review-apps"', await (await get(`/ru/reviews/dating-apps`)).text()]);
    for (const id of categoryIds) {
      if (id === "dating-apps") continue;
      const res = await get(`/ru/reviews/${id}`);
      if (res.status !== 200) continue; // a Pulse category outside the review archive
      pages.push([id, "ia-rs-lock-card", await res.text()]);
      break;
    }
    assert.equal(pages.length, withNeeds.has("dating-apps") ? 2 : 1, "an open and a locked category page");
    for (const [slug, after, body] of pages) {
      const at = body.indexOf('id="category-pulse"');
      assert.ok(at > body.indexOf('class="ia-footnote"') && at > 0, `${slug}: under the header`);
      assert.ok(at < body.indexOf(after), `${slug}: before ${after}`);
      const block = body.slice(at, body.indexOf("</section>", at));
      assert.deepEqual(ticks(block), { all: 10, on: categoryNeeds(data, slug)[0].score, needles: 1 }, slug);
      assert.ok(!KIND_MARKUP.test(block) && !/Просят|Жалуются/.test(textOf(block)), slug);
    }
    // The archived old copies (/<ru|en>/old/reviews/**) carry no block: the new pages do.
    const oldHub = await get(`/ru/old/reviews`);
    if (oldHub.status === 200) assert.ok(!(await oldHub.text()).includes("ia-pulse-hero"), "/ru/old/reviews");
  });
});
