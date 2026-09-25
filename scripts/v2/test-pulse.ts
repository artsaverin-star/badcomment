// «Пульс» — data and UI contract (SPEC: app_04_inapp/Documentation/PulseDemand-2026-09-24/SPEC.md,
// docs/site-v2/PULSE.md).
//
//   node --import tsx scripts/v2/test-pulse.ts
//
// 1. content/v2/pulse-demand.json: schema, URL-safe unique ids, five languages, score = formula
//    of source.score, category counts, order. Nothing here is hard-coded: ids, counts and
//    categories are derived from the file, which grows while the needs are mined.
// 2. Pure logic: query parsing, feed selection, retired/unknown route resolution, phrases.
// 3. Server-rendered HTML of the real components (card, evidence gate, category embed, old
//    archive bridge) and the sitemap, in-process ("server-only" and CSS imports stubbed).
// 4. Live HTTP against the running dev server (PULSE_BASE_URL, default http://localhost:3107):
//    feed, filters, evidence gating as a guest, retired-id redirects, 404s, the topic-page embed
//    and the old review hub. Skipped when no server answers.

import { after, before, describe, test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import os from "node:os";
import path from "node:path";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "../../src/site/i18n/locales";
import { FREE_CATEGORY, LAUNCH_CATEGORIES } from "../../src/site/manifest.generated";
import { meterScore, painColor } from "../../src/site/features/pulse/pain";
import { PulseCard } from "../../src/site/features/pulse/PulseCard";
import { PulseEvidenceList, visibleEvidence } from "../../src/site/features/pulse/PulseDetail";
import { CategoryPulseView } from "../../src/site/features/pulse/PulseRows";
import {
  categoryNeeds,
  countsLine,
  hasCategoryPulse,
  inAppsPhrase,
  isDefaultPulseQuery,
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

const render = (el: ReactElement | null) => (el ? renderToStaticMarkup(el) : "");
const unescapeHtml = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
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
    assert.equal(routes.pulse("ru", { category: "a", kind: "pain", page: 1 }), "/ru/pulse?category=a&kind=pain");
  });

  test("query: retired keys are ignored, kind/category/page are normalized", () => {
    const normal = parsePulseQuery({});
    assert.deepEqual(normal, { q: "", category: "", kind: "", page: 1 });
    assert.equal(isDefaultPulseQuery(normal), true);
    assert.deepEqual(parsePulseQuery({ view: "signals", sort: "reviews", scope: "universal" }), normal);
    assert.equal(parsePulseQuery({ kind: "request" }).kind, "request");
    assert.equal(parsePulseQuery({ kind: "workaround" }).kind, "");
    assert.equal(parsePulseQuery({ category: "../x" }).category, "");
    assert.deepEqual(parsePulseQuery({ q: [" widget ", "ignored"], page: "NaN" }), { q: "widget", category: "", kind: "", page: 1 });
    assert.equal(parsePulseQuery({ q: "x".repeat(999), page: "-1" }).q.length, 200);
    assert.equal(parsePulseQuery({ page: "1.5" }).page, 1);
    assert.equal(parsePulseQuery({ page: "3" }).page, 3);
    assert.equal(isDefaultPulseQuery(parsePulseQuery({ kind: "pain" })), false);
  });

  test("feed: file order (score, then share); category ∩ kind ∩ search", () => {
    const all = selectPulseNeeds(needs, parsePulseQuery({}), "en");
    assert.deepEqual(all.map((n) => n.id), needs.map((n) => n.id));
    for (const id of categoryIds) {
      for (const kind of ["request", "pain"] as const) {
        const got = selectPulseNeeds(needs, parsePulseQuery({ category: id, kind }), "ru");
        assert.deepEqual(got.map((n) => n.id), needs.filter((n) => n.categoryId === id && n.kind === kind).map((n) => n.id));
      }
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
      const html = render(CategoryPulseView({ categoryId: id, needs: categoryNeeds(data, id), locale: "en", strings: pulseStrings.en }));
      assert.equal(html.includes('id="category-pulse"'), hasCategoryPulse(data, id), id);
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
  test("pain scale: amber → red by position, never by kind", () => {
    assert.equal(painColor(1), "#f4b63f");
    assert.equal(painColor(10), "#e5484d");
    const reds = Array.from({ length: 10 }, (_, i) => parseInt(painColor(i + 1).slice(3, 5), 16));
    assert.ok(reds.every((g, i) => i === 0 || g <= reds[i - 1]), "green channel falls monotonically");
    assert.equal(meterScore(7.4), 7);
    assert.equal(meterScore(42), 10);
  });
  test("«Как считаем» states the published range 1..10 (SPEC), in every locale", () => {
    for (const locale of LOCALES) {
      const text = pulseStrings[locale].aboutScore;
      assert.match(text, /(?<!\d)1\s*(?:до|to|bis|à|〜)\s*10(?!\d)/, locale);
      assert.doesNotMatch(text, /(?<!\d)0\s*(?:до|to|bis|à|〜)\s*10(?!\d)/, locale);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Server-rendered HTML (in-process)
// ---------------------------------------------------------------------------

describe("rendered HTML", () => {
  test("card: one link to the need, «Боль N/10», 10 segments with N filled, the counts line", () => {
    for (const locale of LOCALES) {
      const s = pulseStrings[locale];
      for (const need of needs) {
        const html = render(PulseCard({ need, categoryName: "Category", locale, strings: s }));
        assert.equal((html.match(/<a\b/g) ?? []).length, 1, need.id);
        assert.ok(html.startsWith(`<a href="/${locale}/pulse/${need.id}"`) || html.includes(`href="/${locale}/pulse/${need.id}"`), need.id);
        assert.equal((html.match(/ia-pain-meter__seg/g) ?? []).length, 10);
        assert.equal((html.match(/ia-pain-meter__seg" style="background-color/g) ?? []).length, need.score);
        const text = unescapeHtml(html);
        assert.ok(text.includes(need.title[locale]), `${locale} ${need.id} title`);
        assert.ok(text.includes(s.pain), s.pain);
        assert.ok(text.includes(countsLine(locale, s, need)));
        assert.ok(!/Подробнее|View details/.test(text), "no «Подробнее» button");
      }
    }
  });

  test("the meter carries the colour; the number stays ink-coloured in cards and rows", () => {
    const numberStyles = (html: string) => [...html.matchAll(/class="ia-pain-value__n"( style="[^"]*")?/g)].map((m) => m[1] ?? "");
    const lastSegment = (html: string) => [...html.matchAll(/ia-pain-meter__seg" style="background-color:\s*(#[0-9a-f]{6})"/g)].map((m) => m[1]).at(-1);
    for (const need of needs) {
      const card = render(PulseCard({ need, categoryName: "Category", locale: "en", strings: pulseStrings.en }));
      assert.deepEqual(numberStyles(card), [""], need.id);
      assert.equal(lastSegment(card), painColor(need.score), need.id);
    }
    for (const id of withNeeds) {
      const rows = categoryNeeds(data, id).slice(0, PULSE_EMBED_LIMIT);
      const html = render(CategoryPulseView({ categoryId: id, needs: categoryNeeds(data, id), locale: "en", strings: pulseStrings.en }));
      assert.deepEqual(numberStyles(html), rows.map(() => ""), id);
    }
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
      LegacyPulseLink: typeof import("../../src/components/LegacyPulseLink").LegacyPulseLink;
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
        LegacyPulseLink: require("../../src/components/LegacyPulseLink").LegacyPulseLink,
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

    test("«Пульс категории»: up to five rows + «all (N)», only for categories with needs", async () => {
      for (const id of [...categoryIds, launchWithout ?? "no-such-category"]) {
        for (const locale of ["ru", "ja"] as const) {
          const html = render(await m.CategoryPulse({ locale, slug: id }));
          const own = categoryNeeds(data, id);
          assert.equal(html.includes('id="category-pulse"'), own.length > 0, id);
          if (!own.length) continue;
          assert.equal((html.match(/class="ia-pulse-row"/g) ?? []).length, Math.min(PULSE_EMBED_LIMIT, own.length));
          assert.ok(html.includes(`href="/${locale}/pulse?category=${id}"`));
          assert.match(unescapeHtml(html), new RegExp(`[(（]${own.length}[)）]`));
        }
      }
    });

    test("old archive bridge: real scores and links via publicHref, nothing for a category without needs", async () => {
      const hub = render(await m.LegacyPulseLink({ locale: "ru" }));
      assert.ok(hub.includes('href="/ru/pulse"'));
      assert.equal((hub.match(/href="\/ru\/pulse\/[a-z0-9-]+"/g) ?? []).length, Math.min(PULSE_EMBED_LIMIT, needs.length));
      for (const id of categoryIds) {
        const html = render(await m.LegacyPulseLink({ locale: "en", slug: id }));
        assert.ok(html.includes(`href="/en/pulse?category=${id}"`), id);
        const top = categoryNeeds(data, id)[0];
        assert.ok(html.includes(`href="/en/pulse/${top.id}"`), id);
        assert.ok(html.includes(`>${top.score}</span>`), id);
      }
      assert.equal(render(await m.LegacyPulseLink({ locale: "ru", slug: launchWithout ?? "no-such-category" })), "");
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
  test("feed in every locale: 200, cards in file order, indexable only unfiltered", async (t) => {
    if (!(await needServer(t))) return;
    for (const locale of LOCALES) {
      const res = await get(`/${locale}/pulse`);
      assert.equal(res.status, 200, locale);
      const html = await res.text();
      assert.deepEqual(needLinks(html, locale), needs.slice(0, 24).map((n) => n.id), locale);
      assert.ok(!/<meta name="robots" content="noindex/.test(html), `${locale}: unfiltered feed must be indexable`);
    }
    const filtered = await (await get(`/en/pulse?kind=pain`)).text();
    assert.ok(/<meta name="robots" content="noindex/.test(filtered));
  });

  test("filters: category and kind", async (t) => {
    if (!(await needServer(t))) return;
    const byId = new Map(needs.map((n) => [n.id, n]));
    for (const id of categoryIds) {
      const html = await (await get(`/ru/pulse?category=${id}`)).text();
      const got = needLinks(html, "ru");
      assert.deepEqual(got, needs.filter((n) => n.categoryId === id).slice(0, 24).map((n) => n.id), id);
    }
    for (const kind of ["request", "pain"] as const) {
      const got = needLinks(await (await get(`/en/pulse?kind=${kind}`)).text(), "en");
      assert.ok(got.every((id) => byId.get(id)?.kind === kind), kind);
      assert.equal(got.length, Math.min(24, needs.filter((n) => n.kind === kind).length), kind);
    }
    const empty = await (await get(`/en/pulse?q=zzzzNoMatch`)).text();
    assert.ok(empty.includes("data-pulse-empty"));
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
      assert.ok(html.includes('id="category-pulse"'), launchWith);
      assert.ok(html.includes(`href="/en/pulse?category=${launchWith}"`), launchWith);
    }
    if (launchWithout) assert.ok(!(await (await get(`/en/segment/${launchWithout}`)).text()).includes('id="category-pulse"'), launchWithout);
  });

  test("old review hub links into Pulse", async (t) => {
    if (!(await needServer(t))) return;
    const html = await (await get(`/ru/reviews`)).text();
    assert.ok(html.includes('href="/ru/pulse"'));
    assert.ok(needLinks(html, "ru").length > 0);
  });
});
