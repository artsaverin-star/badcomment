// Data contract of the rating (spec 11 §3.1, §6.2, §6.3, §8; acceptance of §10.1 [data]).
// Run: node --import tsx scripts/v2/test-rating.ts
//
// 1. Pure helpers: short names (features/rating/text.ts shortTitle + the uniqueness rule),
//    points(), the catalogue groups, the Apple CDN URLs (media.ts), the list orders, titleContains.
// 2. scripts/v2/data/rating-seo.json: coverage, limits, no trust wording.
// 3. The generated content (content/v2/{ru,en}/rating) read through the real reader
//    (src/site/sitedata/rating.ts, in-process): ranks, media, tasks, neighbours, related topics,
//    the app's other niches, the search order.
// 4. SEO (spec 11 §6.1, §6.4, §6.5): canonicals, niche/task/app titles, JSON-LD rules, the rating
//    sitemaps and IndexNow list.

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module from "node:module";
import path from "node:path";

import { RATING_BY_SLUG } from "../../src/data/peoplesRating";
import type { RatingIndexFile, RatingNicheFile } from "../../src/site/content/rating-types";
import { compareNames } from "../../src/site/content/text";
import { GROUP_OF, RATING_GROUPS, ratingGroupMembers, ratingGroupOf } from "../../src/site/features/rating/groups";
import { titleContains } from "../../src/site/features/rating/matches";
import { iconLd, iconSrc, MZ_ORIGIN, shotLd, shotSrc } from "../../src/site/features/rating/media";
import { RATING_SORTS, sortRatedApps } from "../../src/site/features/rating/order";
import { appJsonLd, nicheJsonLd } from "../../src/site/features/rating/schema";
import {
  appDescription,
  appTitle,
  dataCanonical,
  h1Name,
  isIndexableTask,
  NICHE_TITLE_BUDGET,
  nicheTitle,
  taskAlternates,
  taskIndex,
  taskTitle,
} from "../../src/site/features/rating/seo";
import { ratingStrings } from "../../src/site/features/rating/strings";
import { displayTitle, points, shortTitle, shortTitles } from "../../src/site/features/rating/text";
import { displayWidth } from "../../src/site/features/research/seo";
import { format } from "../../src/site/i18n/strings";
import type { T } from "../../src/site/i18n/translate";
import { compactMedia, MZ_PATH, RATING_SEO_FILE, TRUST_WORDING } from "./import-rating";

const REPO = path.resolve(__dirname, "../..");
const CONTENT = path.join(REPO, "content/v2");
const DATA_LOCALES = ["ru", "en"] as const;

type RawApp = { id: string; title: string; icon?: string | null; shots?: string[] };
const SETS = RATING_BY_SLUG as unknown as Record<string, { apps?: RawApp[] }>;

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(REPO, rel), "utf8")) as T;
}

/** content/v2/<dl>/rating/<slug>.json for every niche of the index. */
function nicheFiles(dl: (typeof DATA_LOCALES)[number]): RatingNicheFile[] {
  const index = readJson<RatingIndexFile>(`content/v2/${dl}/rating/index.json`);
  return index.niches.map((n) => readJson<RatingNicheFile>(`content/v2/${dl}/rating/${n.slug}.json`));
}

/** Niches with a rating page: a review corpus (lib/reviews.ts hasReviewCorpus). */
const USABLE = new Set(
  Object.entries(readJson<{ niches: Record<string, unknown[]> }>("src/data/reviewSourceIndex.json").niches)
    .filter(([, apps]) => apps.length > 0)
    .map(([slug]) => slug),
);

// ---------------------------------------------------------------------------------------------
// 1. Pure helpers
// ---------------------------------------------------------------------------------------------

describe("shortTitle — the name part of a store title", () => {
  test("cuts at the first separator", () => {
    assert.equal(shortTitle("Hevy - Workout Tracker Gym Log"), "Hevy");
    assert.equal(shortTitle("Canva: AI Video & Photo Editor"), "Canva");
    assert.equal(shortTitle("Streaks – Habit Tracker"), "Streaks");
    assert.equal(shortTitle("Bear — Markdown Notes"), "Bear");
    assert.equal(shortTitle("Fabulous | Daily Routine"), "Fabulous");
    assert.equal(shortTitle("Way of Life: Habit - Tracker"), "Way of Life");
  });
  test("no head, too short or too long → null", () => {
    assert.equal(shortTitle("Bazaart AI Photo Editor Design"), null);
    assert.equal(shortTitle("A - Letter"), null);
    assert.equal(shortTitle(`${"x".repeat(41)} - long`), null);
    assert.equal(shortTitle(`${"x".repeat(40)} - long`), "x".repeat(40));
    assert.equal(shortTitle("Well-being-app"), null, "a hyphen without spaces is not a separator");
  });
  test("a head that another app shows as its name falls back to the full title", () => {
    const out = shortTitles(
      new Map([
        ["1", "Notes - Simple Notepad"],
        ["2", "Notes"],
        ["3", "Todo: Lists - Planner"],
        ["4", "todo - Tasks"],
        ["5", "Hevy - Workout Tracker"],
      ]),
    );
    assert.equal(out.get("1"), "Notes - Simple Notepad");
    assert.equal(out.get("2"), "Notes");
    assert.equal(out.get("3"), "Todo: Lists - Planner", "case-insensitive collision");
    assert.equal(out.get("4"), "todo - Tasks");
    assert.equal(out.get("5"), "Hevy");
  });
  test("a dangling separator of a cut-off title goes (display, and the short name when unique)", () => {
    assert.equal(displayTitle("Password Manager-"), "Password Manager");
    assert.equal(displayTitle("To Do List|"), "To Do List");
    assert.equal(displayTitle("Intermittent Fasting Tracker:"), "Intermittent Fasting Tracker");
    assert.equal(displayTitle("Intermittent Fasting Tracker -"), "Intermittent Fasting Tracker");
    assert.equal(displayTitle("Baby Tracker."), "Baby Tracker.", "a period stays");
    assert.equal(displayTitle("Hevy - Workout Tracker Gym Log"), "Hevy - Workout Tracker Gym Log");
    assert.equal(displayTitle(" - "), " - ", "nothing left: the title as it is");
    const out = shortTitles(
      new Map([
        ["1", "To Do List|"],
        ["2", "Fasting Tracker:"],
        ["3", "Fasting Tracker -"],
      ]),
    );
    assert.equal(out.get("1"), "To Do List");
    assert.equal(out.get("2"), "Fasting Tracker:", "two apps would share the cleaned name");
    assert.equal(out.get("3"), "Fasting Tracker -");
  });
  test("real data: 2,152 of 4,050 apps get a short name, 220 fall back on a collision", () => {
    const titles = new Map<string, string>();
    for (const set of Object.values(SETS)) for (const a of set.apps ?? []) if (!titles.has(a.id)) titles.set(a.id, a.title);
    assert.equal(titles.size, 4050);
    const shorts = shortTitles(titles);
    const cut = [...titles].filter(([id, title]) => shorts.get(id) !== title);
    const heads = [...titles].filter(([, title]) => shortTitle(title) !== null);
    // 2,151 heads plus «To Do List|» → «To Do List» (the other dangling titles collide).
    const cleaned = cut.filter(([, title]) => shortTitle(title) === null);
    assert.deepEqual(cleaned.map(([id]) => shorts.get(id)), ["To Do List"]);
    assert.equal(cut.length, 2152);
    assert.equal(heads.length - (cut.length - cleaned.length), 220);
    assert.equal(shorts.get("1458862350"), "Hevy");
    // A cut name is never shown for two apps, nor equal to another app's full title.
    const shown = new Map<string, number>();
    for (const [id, title] of titles) {
      for (const name of new Set([title.toLowerCase(), shorts.get(id)!.toLowerCase()])) shown.set(name, (shown.get(name) ?? 0) + 1);
    }
    for (const [id] of cut) assert.equal(shown.get(shorts.get(id)!.toLowerCase()), 1, `short name of ${id} is shared`);
  });
});

describe("points — «Хвалят» / «Жалуются» as a list", () => {
  test("keeps decimals and abbreviations inside one point", () => {
    assert.deepEqual(points("На Apple Watch нельзя вводить вес с шагом 0,5 кг, только целые числа. Нет поиска по истории тренировок.", "ru"), [
      "На Apple Watch нельзя вводить вес с шагом 0,5 кг, только целые числа.",
      "Нет поиска по истории тренировок.",
    ]);
    assert.deepEqual(points("You cannot log 0.5 kg steps on the Watch. The history has no search at all.", "en"), [
      "You cannot log 0.5 kg steps on the Watch.",
      "The history has no search at all.",
    ]);
    assert.equal(points("Шаги, сон, вода и т. д. записываются сами, без ручного ввода.", "ru").length, 1);
  });
  test("a fragment joins the previous point (the first one joins the next)", () => {
    assert.deepEqual(points("Синхронизация теряет записи. Крашится. Поддержка отвечает неделями.", "ru"), [
      "Синхронизация теряет записи. Крашится.",
      "Поддержка отвечает неделями.",
    ]);
    assert.deepEqual(points("No search. The export drops half of the entries.", "en"), ["No search. The export drops half of the entries."]);
    assert.deepEqual(points("", "en"), []);
  });
  test("real data: no point under 12 characters, no text lost", () => {
    for (const dl of DATA_LOCALES) {
      let texts = 0;
      let multi = 0;
      for (const file of nicheFiles(dl))
        for (const app of file.apps)
          for (const text of [app.loved, app.weak]) {
            if (!text) continue;
            texts++;
            const list = points(text, dl);
            if (list.length > 1) multi++;
            if (text.trim().length >= 12) for (const p of list) assert.ok(p.length >= 12, `${dl}/${file.category}/${app.id}: «${p}»`);
            assert.equal(list.join("").replace(/\s+/gu, ""), text.replace(/\s+/gu, ""), `${dl}/${file.category}/${app.id}: text changed`);
          }
      assert.ok(texts > 8600, `${dl}: ${texts} loved/weak texts`);
      assert.ok(multi > 2000, `${dl}: ${multi} texts with 2+ points`);
    }
  });
});

describe("groups — the catalogue's 10 groups", () => {
  test("every niche with a rating page is in exactly one group, no unknown slug", () => {
    assert.deepEqual([...RATING_GROUPS], ["health", "sport", "mind", "work", "ai", "learn", "money", "media", "home", "everyday"]);
    const all = RATING_GROUPS.flatMap((id) => [...ratingGroupMembers(id)]);
    assert.equal(all.length, 71);
    assert.equal(new Set(all).size, 71);
    assert.equal(Object.keys(GROUP_OF).length, 71);
    assert.deepEqual([...all].sort(), [...USABLE].sort());
    assert.deepEqual(
      RATING_GROUPS.map((id) => ratingGroupMembers(id).length),
      [10, 7, 6, 11, 7, 7, 3, 4, 9, 7],
    );
    assert.equal(ratingGroupOf("habit-tracking"), "mind");
    assert.equal(ratingGroupOf("astrology"), null);
    assert.equal(ratingGroupOf("toString"), null);
  });
});

describe("media.ts — Apple CDN URLs from compact paths", () => {
  const icon = "Purple211/v4/e5/5e/07/e55e071a-5e2f-fe3e-7867-302a87395225/AppIcon-0-0-1x_U007emarketing-0-7-0-sRGB-85-220.png";
  const shot = "PurpleSource221/v4/6d/b6/1b/6db61b90-eea9-dd4f-33b9-a7dcfdb22464/screenshot2.png";
  test("sizes", () => {
    assert.ok(iconSrc(icon, 56).endsWith("/128x128bb.webp"));
    assert.ok(iconSrc(icon, 40).endsWith("/80x80bb.webp"));
    assert.ok(iconSrc(icon, 96).endsWith("/192x192bb.webp"));
    assert.equal(iconSrc(icon, 24), `${MZ_ORIGIN}/image/thumb/${icon}/80x80bb.webp`);
    assert.ok(shotSrc(shot, "row").endsWith("/9999x440bb.webp"));
    assert.ok(shotSrc(shot, "stage").endsWith("/9999x520bb.webp"));
    assert.ok(shotSrc(shot, "gallery").endsWith("/9999x720bb.webp"));
    assert.ok(shotSrc(shot, "viewer").endsWith("/9999x1400bb.webp"));
    assert.ok(shotLd(shot).endsWith(`/${shot}/600x0w.jpg`));
  });
  test("round trip: source URL → compact path → the same URL (every app of peoplesRating)", () => {
    let icons = 0;
    let shots = 0;
    for (const set of Object.values(SETS))
      for (const app of set.apps ?? []) {
        if (app.icon) {
          const p = compactMedia(app.icon, "icon");
          assert.ok(p && MZ_PATH.test(p), app.icon);
          assert.equal(iconLd(p), app.icon);
          icons++;
        }
        for (const url of app.shots ?? []) {
          const p = compactMedia(url, "shot");
          assert.ok(p && MZ_PATH.test(p), url);
          assert.equal(url, `${MZ_ORIGIN}/image/thumb/${p}/${url.slice(url.lastIndexOf("/") + 1)}`);
          shots++;
        }
      }
    assert.equal(icons, 4443);
    assert.equal(shots, 29656);
  });
  test("other shapes are rejected", () => {
    assert.equal(compactMedia(`${MZ_ORIGIN}/image/thumb/${icon}/100x100bb.jpg`, "icon"), null);
    assert.equal(compactMedia(`http://is1-ssl.mzstatic.com/image/thumb/${icon}/512x512bb.jpg`, "icon"), null);
    assert.equal(compactMedia(`${MZ_ORIGIN}/image/thumb/../x.png/512x512bb.jpg`, "icon"), null);
    assert.equal(compactMedia(`${MZ_ORIGIN}/image/thumb/${shot}/240x0w.webp`, "shot"), null);
    assert.equal(compactMedia(`${MZ_ORIGIN}/image/thumb/a/b"c.png/240x0w.jpg`, "shot"), null);
  });
});

describe("order.ts — the niche list's four orders", () => {
  const apps = [
    { title: "Bravo", rank: 1, realScore: 90, storeAvg: 4.1, ratings: 10 },
    { title: "alpha", rank: 2, realScore: 90, storeAvg: 4.8, ratings: 500 },
    { title: "Charlie", rank: 3, realScore: 70, storeAvg: null, ratings: 500 },
    { title: "Delta", rank: 4, realScore: null, storeAvg: 4.8, ratings: 0 },
  ];
  const order = (sort: (typeof RATING_SORTS)[number]) => sortRatedApps(apps, sort, "en").map((a) => a.rank);
  test("rules and ties", () => {
    assert.deepEqual([...RATING_SORTS], ["review", "store", "ratings", "name"]);
    assert.deepEqual(order("review"), [1, 2, 3, 4]);
    assert.deepEqual(order("store"), [2, 4, 1, 3], "storeAvg descending, missing last, ties by rank");
    assert.deepEqual(order("ratings"), [2, 3, 1, 4], "rating count descending, ties by rank");
    assert.deepEqual(order("name"), [2, 1, 3, 4]);
    assert.deepEqual(apps.map((a) => a.rank), [1, 2, 3, 4], "sorts a copy");
  });
  test("titleContains folds case and diacritics", () => {
    const contains = titleContains("  habit ", "en");
    assert.equal(contains("Habitify: Habit Tracker"), true);
    assert.equal(contains("Streaks"), false);
    assert.equal(titleContains("", "en")("Anything"), false);
    assert.equal(titleContains("ежедневник", "ru")("Ежедневник: планер"), true);
  });
});

// ---------------------------------------------------------------------------------------------
// 2. SEO head terms and intros
// ---------------------------------------------------------------------------------------------

describe("rating-seo.json — head terms and intros (spec 11 §6.2, §6.3)", () => {
  type Entry = { seoName: { ru: string; en: string }; intro: { ru: string; en: string } };
  const seo = readJson<Record<string, Entry>>(RATING_SEO_FILE);
  test("one entry per niche with a rating page", () => {
    assert.deepEqual(Object.keys(seo).sort(), [...USABLE].sort());
  });
  test("head terms: genitive ru, English noun phrase, ≤ 40 characters", () => {
    for (const [slug, { seoName }] of Object.entries(seo)) {
      for (const name of [seoName.ru, seoName.en]) {
        assert.ok(name.length > 0 && name.length <= 40 && name === name.trim(), `${slug}: «${name}»`);
        assert.doesNotMatch(name, TRUST_WORDING, slug);
      }
      // ru completes «Лучшие приложения для …»: lowercase (proper nouns inside keep their case).
      assert.match(seoName.ru, /^[а-яё]/, `${slug}: ru «${seoName.ru}»`);
      // en completes "Best … apps": never "apps apps", never a lowercased acronym ("ai", "qr").
      assert.doesNotMatch(seoName.en, /\bapps?$/i, slug);
      assert.doesNotMatch(seoName.en, /\b(?:ai|qr)\b/, slug);
      assert.doesNotMatch(seoName.en, /[Ѐ-ӿ]/, slug);
    }
    assert.equal(seo["dating-apps"].seoName.ru, "знакомств");
    assert.equal(seo["habit-tracking"].seoName.en, "habit tracker");
  });
  test("intros: one sentence of 60–180 characters, no trust wording", () => {
    for (const [slug, { intro }] of Object.entries(seo)) {
      for (const [L, text] of Object.entries(intro)) {
        assert.ok(text.length >= 60 && text.length <= 180, `${slug}/${L}: ${text.length} characters`);
        assert.doesNotMatch(text, TRUST_WORDING, `${slug}/${L}`);
        assert.doesNotMatch(text, /витрин|storefront|наш балл/i, `${slug}/${L}`);
        assert.match(text, /^\p{Lu}.*\.$/u, `${slug}/${L}: capital first, period last`);
      }
      assert.doesNotMatch(intro.en, /[Ѐ-ӿ]/, slug);
      assert.match(intro.ru, /[Ѐ-ӿ]/, slug);
    }
  });
  test("the content carries them (astrology keeps its own name, no intro)", () => {
    for (const dl of DATA_LOCALES)
      for (const file of nicheFiles(dl)) {
        const entry = seo[file.category];
        if (!entry) {
          assert.equal(file.category, "astrology");
          assert.equal(file.intro, null);
          continue;
        }
        assert.equal(file.seoName, entry.seoName[dl], `${dl}/${file.category}`);
        assert.ok(file.intro, `${dl}/${file.category}`);
        // ru intros went through the Russian typography (no-break spaces), en ones did not.
        assert.equal(file.intro!.replace(/ /g, " "), entry.intro[dl], `${dl}/${file.category}`);
      }
  });
});

// ---------------------------------------------------------------------------------------------
// 3. The generated content through the reader
// ---------------------------------------------------------------------------------------------

// `import "server-only"` is a Next.js bundler alias; outside Next it resolves to its empty module.
const loader = Module as unknown as { _resolveFilename: (request: string, ...rest: unknown[]) => string };
const resolveFilename = loader._resolveFilename;
const serverOnlyEmpty = path.join(REPO, "node_modules/next/dist/compiled/server-only/empty.js");
loader._resolveFilename = function (this: unknown, request: string, ...rest: unknown[]) {
  return request === "server-only" ? serverOnlyEmpty : resolveFilename.call(this, request, ...rest);
};
process.env.CONTENT_V2_DIR = CONTENT;
/* eslint-disable @typescript-eslint/no-require-imports */
const rating = require("../../src/site/sitedata/rating") as typeof import("../../src/site/sitedata/rating");
/* eslint-enable @typescript-eslint/no-require-imports */

describe("content — media, short names, reviews read (spec 11 §8.1)", () => {
  test("ru and en files carry the same media; counts match the spec", () => {
    const [ru, en] = DATA_LOCALES.map(nicheFiles);
    let apps = 0;
    let withIcon = 0;
    let withShots = 0;
    let shots = 0;
    ru.forEach((file, n) => {
      file.apps.forEach((a, i) => {
        const b = en[n].apps[i];
        assert.deepEqual([a.id, a.short, a.icon, a.shots, a.reviewsRead], [b.id, b.short, b.icon, b.shots, b.reviewsRead]);
        apps++;
        if (a.icon) withIcon++;
        if (a.shots.length) withShots++;
        shots += a.shots.length;
        assert.ok(a.reviewsRead !== null && a.reviewsRead >= 20 && a.reviewsRead <= 543, `${a.id}: reviewsRead ${a.reviewsRead}`);
      });
    });
    assert.deepEqual({ niches: ru.length, apps, withIcon, withShots, shots }, { niches: 72, apps: 4443, withIcon: 4443, withShots: 4149, shots: 29656 });
  });
  test("the index: leaders, dates, stats", () => {
    for (const dl of DATA_LOCALES) {
      const index = readJson<RatingIndexFile>(`content/v2/${dl}/rating/index.json`);
      const files = nicheFiles(dl);
      assert.equal(index.generatedAt, files.map((f) => f.updatedAt).sort().at(-1));
      index.niches.forEach((entry, i) => {
        assert.equal(entry.leaders.length, Math.min(4, files[i].apps.length));
        assert.equal(entry.leaders[0].id, files[i].apps[0].id);
        assert.equal(entry.totalReviews, files[i].totalReviews);
        assert.match(entry.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
      });
      assert.deepEqual([index.stats.appsWithIcon, index.stats.appsWithShots, index.stats.shots], [4443, 4149, 29656]);
    }
  });
});

describe("content — topic names", () => {
  test("English names are topic names, not raw «… apps» labels; ru short words stay with the next word", () => {
    for (const file of nicheFiles("en")) {
      if (file.category === "astrology") continue;
      assert.doesNotMatch(file.name, /\bapps?$|[()]/i, file.category);
    }
    assert.equal(nicheFiles("en").find((f) => f.category === "food-delivery")!.name, "Food delivery");
    // A plain space (not U+00A0) after a short word would let the line break leave it hanging.
    for (const file of nicheFiles("ru")) assert.doesNotMatch(file.name, /(?:^| )(?:и|в|с|к|у|о|а|на|за|для|по|из|от|до) /u, `ru/${file.category}: «${file.name}»`);
  });
});

describe("sitedata/rating.ts — the reader", () => {
  test("getRatingNiche: rank = index + 1, media and short names", () => {
    const niche = rating.getRatingNiche("ru", "habit-tracking")!;
    assert.ok(niche);
    const hevy = niche.apps[0];
    assert.equal(hevy.rank, 1);
    assert.equal(hevy.short, "Hevy");
    assert.equal(hevy.title, "Hevy - Workout Tracker Gym Log");
    assert.match(hevy.icon!, /^Purple211\/.+\.png$/);
    assert.equal(hevy.shots.length, 10);
    assert.equal(typeof hevy.reviewsRead, "number");
    niche.apps.forEach((a, i) => assert.equal(a.rank, i + 1));
    assert.equal(niche.seoName, "трекинга привычек");
    assert.ok(niche.intro && niche.intro.length >= 60);
    assert.match(niche.updatedAt, /^\d{4}-\d{2}-\d{2}$/);
    const en = rating.getRatingNiche("de", "habit-tracking")!;
    assert.equal(en.seoName, "habit tracker");
    assert.equal(en.dataLang, "en");
  });
  test("getRatingApp: { niche, app } (the place is app.rank)", () => {
    const found = rating.getRatingApp("ru", "habit-tracking", "hevy-workout-tracker-gym-log")!;
    assert.equal(found.app.rank, 1);
    assert.deepEqual(Object.keys(found).sort(), ["app", "niche"]);
    assert.equal(rating.getRatingApp("ru", "habit-tracking", "no-such-app"), null);
  });
  test("listRatingGroups: 10 groups, 71 cards, alphabetical inside a group; cards from the index", () => {
    for (const l of ["ru", "en", "ja"] as const) {
      const groups = rating.listRatingGroups(l);
      assert.deepEqual(groups.map((g) => g.id), [...RATING_GROUPS]);
      const cards = groups.flatMap((g) => g.cards);
      assert.equal(cards.length, 71);
      for (const g of groups) {
        for (let i = 1; i < g.cards.length; i++) assert.ok(compareNames(g.cards[i - 1].name, g.cards[i].name, l) <= 0, `${l}/${g.id}`);
        for (const c of g.cards) assert.equal(c.group, g.id);
      }
      for (const c of cards) {
        assert.equal(c.leaders.length, 4);
        assert.ok(c.intro && c.totalReviews > 0 && /^\d{4}-\d{2}-\d{2}$/.test(c.updatedAt), `${l}/${c.slug}`);
      }
      assert.equal(rating.listRatingNiches(l).length, 71);
    }
  });
  test("ratingTaskCards / appTasks", () => {
    const niche = rating.getRatingNiche("ru", "habit-tracking")!;
    const cards = rating.ratingTaskCards(niche);
    assert.equal(cards.length, niche.scenarios.filter((s) => s.job).length);
    assert.ok(cards.length > 0);
    for (const c of cards) {
      const s = niche.scenarios[c.n - 1];
      assert.equal(c.job, s.job);
      assert.ok(c.apps.length <= 4 && c.apps.length <= c.appCount);
      assert.deepEqual(c.apps.map((a) => a.id), s.appIds.slice(0, 4));
      for (const a of c.apps) assert.equal(a.short, niche.apps.find((x) => x.id === a.id)!.short);
    }
    assert.equal(rating.ratingTaskCards(niche), cards, "memoised per niche");
    for (const app of niche.apps.slice(0, 20)) {
      const tasks = rating.appTasks(niche, app.id);
      assert.deepEqual(
        tasks.map((t) => t.n),
        cards.filter((c) => niche.scenarios[c.n - 1].appIds.includes(app.id)).map((c) => c.n),
      );
    }
  });
  test("nicheNeighbours: the top 3 and the rank neighbours, minus self, filled to 5", () => {
    const niche = rating.getRatingNiche("ru", "habit-tracking")!;
    const ranks = (rank: number) => rating.nicheNeighbours(niche, niche.apps[rank - 1]).map((a) => a.rank);
    const last = niche.apps.length;
    assert.deepEqual(ranks(1), [2, 3, 4, 5, 6]);
    assert.deepEqual(ranks(2), [1, 3, 4, 5, 6]);
    assert.deepEqual(ranks(3), [1, 2, 4, 5, 6]);
    assert.deepEqual(ranks(4), [1, 2, 3, 5, 6]);
    assert.deepEqual(ranks(10), [1, 2, 3, 9, 11]);
    assert.deepEqual(ranks(last), [1, 2, 3, last - 2, last - 1]);
    // Every app page of every ru niche gets min(5, count − 1) alternatives, none of them itself.
    for (const card of rating.listRatingNiches("ru")) {
      const n = rating.getRatingNiche("ru", card.slug)!;
      for (const app of n.apps) {
        const list = rating.nicheNeighbours(n, app);
        assert.equal(list.length, Math.min(5, n.apps.length - 1), `${card.slug} #${app.rank}`);
        assert.ok(!list.includes(app), `${card.slug} #${app.rank} lists itself`);
      }
    }
  });
  test("ratingAppNiches: the app in every niche that rates it", () => {
    const niche = rating.getRatingNiche("ru", "habit-tracking")!;
    const multi = niche.apps.map((a) => rating.ratingAppNiches("ru", a.id)).find((list) => list.length > 1)!;
    assert.ok(multi, "an app of habit-tracking is rated in another niche too");
    for (const n of multi) {
      const found = rating.getRatingApp("ru", n.niche, n.appSlug)!;
      assert.equal(found.app.rank, n.rank);
      assert.equal(found.niche.count, n.count);
      assert.equal(found.app.realScore, n.realScore);
      assert.equal(n.name, found.niche.name);
    }
    let apps = 0;
    const seen = new Set<string>();
    for (const card of rating.listRatingNiches("ru"))
      for (const a of rating.getRatingNiche("ru", card.slug)!.apps) {
        if (seen.has(a.id)) continue;
        seen.add(a.id);
        if (rating.ratingAppNiches("ru", a.id).length > 1) apps++;
      }
    assert.equal(apps, 342, "apps rated in 2+ niches with a rating page");
  });
  test("relatedNiches: shared apps first, then the same group", () => {
    for (const l of ["ru", "en", "fr"] as const) {
      let full = 0;
      for (const card of rating.listRatingNiches(l)) {
        const related = rating.relatedNiches(l, card.slug, 4);
        // The page shows «Похожие темы» from 2 cards on; the small «money» group gives only 2.
        assert.ok(related.length >= 2 && related.length <= 4, `${l}/${card.slug}: ${related.length}`);
        assert.ok(!related.some((r) => r.slug === card.slug));
        assert.equal(new Set(related.map((r) => r.slug)).size, related.length);
        if (related.length === 4) full++;
      }
      assert.equal(full, 69, l);
    }
    const niche = rating.getRatingNiche("ru", "habit-tracking")!;
    const own = new Set(niche.apps.map((a) => a.id));
    const shared = (slug: string) => rating.getRatingNiche("ru", slug)!.apps.filter((a) => own.has(a.id)).length;
    const related = rating.relatedNiches("ru", "habit-tracking", 4);
    const counts = related.map((r) => shared(r.slug));
    assert.ok(counts[0] > 0);
    for (let i = 1; i < counts.length; i++) if (counts[i] > 0) assert.ok(counts[i] <= counts[i - 1]);
    assert.deepEqual(rating.relatedNiches("ru", "no-such-niche", 4), []);
  });
  test("searchRatingApps: title tier, then review score, then rank in a niche, then title; items carry rank, star and icon", () => {
    for (const [l, q] of [["ru", "привычки"], ["en", "habit"], ["en", "calendar"]] as const) {
      const { total, items } = rating.searchRatingApps(l, q, 0, "all");
      assert.ok(total > 10 && items.length === total, `${l} «${q}»: ${total}`);
      const contains = titleContains(q, l);
      const tier = items.map((i) => contains(i.title));
      assert.ok(tier.indexOf(false) === -1 || tier.lastIndexOf(true) < tier.indexOf(false), "title matches first");
      for (let i = 1; i < items.length; i++) {
        if (tier[i] !== tier[i - 1]) continue;
        const [x, y] = [items[i - 1], items[i]];
        const [a, b] = [x.realScore ?? -1, y.realScore ?? -1];
        const tie = x.niche === y.niche ? x.rank < y.rank : compareNames(x.title, y.title, l) <= 0;
        assert.ok(a > b || (a === b && tie), `${l} «${q}» at ${i}`);
      }
      for (const item of items) {
        const found = rating.getRatingApp(l, item.niche, item.slug)!;
        assert.equal(found.app.rank, item.rank);
        assert.equal(found.app.icon, item.icon);
        assert.equal(found.app.storeAvg, item.storeAvg);
      }
    }
    const first = rating.searchRatingApps("ru", "привычки").items;
    assert.equal(first.length, 40);
    // HabitKit and Way of Life share 85 in habit-tracking: № 2 before № 3.
    const tied = first.filter((i) => i.niche === "habit-tracking" && i.realScore === 85).map((i) => i.rank);
    assert.ok(tied.length >= 2);
    assert.deepEqual(tied, [...tied].sort((a, b) => a - b));
  });
});

// ---------------------------------------------------------------------------------------------
// 4. SEO
// ---------------------------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-require-imports */
const sitemap = require("../../src/site/sitedata/rating-sitemap") as typeof import("../../src/site/sitedata/rating-sitemap");
/* eslint-enable @typescript-eslint/no-require-imports */
/** The breadcrumb names come from t(); the key itself is enough here. */
const tStub = ((key: string) => key) as unknown as T;
const SITE = "https://inapp.pro";

describe("seo.ts — canonicals, head terms, titles (spec 11 §6.1)", () => {
  test("dataCanonical: de/fr/ja → /en/, percent-encoded, ru-only task pages", () => {
    assert.equal(dataCanonical("de", "rating/habit-tracking"), `${SITE}/en/rating/habit-tracking`);
    // "photo-editоr" with a Cyrillic «о», like the two look-alike slugs of the data.
    assert.ok(dataCanonical("ru", "rating/ai-avatars-headshots/photo-editоr").endsWith("/photo-edit%D0%BEr"));
    assert.ok(dataCanonical("en", "rating/x/tasks/1", { en: false }).startsWith(`${SITE}/ru/`));
  });
  test("h1Name and nicheTitle", () => {
    const ru = rating.getRatingNiche("ru", "habit-tracking")!;
    const de = rating.getRatingNiche("de", "habit-tracking")!;
    assert.equal(h1Name("ru", ru), "трекинга привычек");
    assert.equal(h1Name("de", de), de.name);
    assert.equal(nicheTitle("ru", ru), "Лучшие приложения для трекинга привычек: топ-93 по отзывам");
  });
  test("every niche title fits the budget: ru 44 full / 27 short, en 71 full", () => {
    for (const [l, expected] of [["ru", [44, 27, 0]], ["en", [71, 0, 0]]] as const) {
      const s = ratingStrings[l];
      const used = [0, 0, 0];
      for (const card of rating.listRatingNiches(l)) {
        const niche = rating.getRatingNiche(l, card.slug)!;
        const title = nicheTitle(l, niche);
        assert.ok(displayWidth(title) + 8 <= NICHE_TITLE_BUDGET, `${l}/${card.slug}: «${title}»`);
        const vars = { name: h1Name(l, niche), count: niche.count };
        const i = [s.nicheMetaTitle, s.nicheMetaTitleShort, s.nicheH1].findIndex((tpl) => format(tpl, vars) === title);
        assert.ok(i >= 0, `${l}/${card.slug}`);
        used[i]++;
      }
      assert.deepEqual(used, [...expected], l);
    }
  });
  test("indexable task pages: ru 31, en 68; de/fr/ja follow the English canonical", () => {
    const total = (l: "ru" | "en" | "de" | "fr" | "ja") => {
      let n = 0;
      for (const card of rating.listRatingNiches(l)) {
        const niche = rating.getRatingNiche(l, card.slug)!;
        for (const sc of niche.scenarios) {
          if (!sc.job) continue;
          const view = rating.getRatingScenario(l, card.slug, sc.n);
          if (view && isIndexableTask(l, niche, view)) n++;
        }
      }
      return n;
    };
    assert.equal(total("ru"), 31);
    assert.equal(total("en"), 68);
    for (const l of ["de", "fr", "ja"] as const) assert.equal(total(l), 68, l);
  });
  test("task hreflang: every alternate of an indexable task page is indexable itself", () => {
    let pairs = 0;
    let single = 0;
    for (const card of rating.listRatingNiches("ru")) {
      const niche = rating.getRatingNiche("ru", card.slug)!;
      for (const sc of niche.scenarios) {
        if (!sc.job) continue;
        const ru = rating.getRatingScenario("ru", card.slug, sc.n);
        const en = rating.getRatingScenario("en", card.slug, sc.n);
        const index = taskIndex(ru, en);
        for (const l of ["ru", "en", "de"] as const) {
          const alt = taskAlternates(l, `rating/${card.slug}/tasks/${sc.n}`, index);
          const languages = (alt.languages ?? {}) as Record<string, string>;
          const own = l === "ru" ? "ru" : "en";
          if (!index[own]) {
            assert.equal(alt.languages, undefined, `${l}/${card.slug}/${sc.n}: a noindex canonical declares alternates`);
            continue;
          }
          for (const [lang, url] of Object.entries(languages)) {
            const target = url.includes("/ru/") ? "ru" : "en";
            assert.ok(index[target], `${l}/${card.slug}/${sc.n}: ${lang} → a noindex page`);
          }
          assert.equal(alt.canonical, languages[own], `${l}/${card.slug}/${sc.n}: the canonical names itself`);
        }
        if (index.ru && index.en) pairs++;
        else if (index.ru || index.en) single++;
      }
    }
    assert.ok(pairs > 0 && single >= 51, `${pairs} pairs, ${single} single`);
  });
  test("de/fr task titles: the English canonical title rather than a half-English cut", () => {
    const de = rating.getRatingScenario("de", "nutrition-calories", 2)!;
    const en = rating.getRatingScenario("en", "nutrition-calories", 2)!;
    assert.ok(isIndexableTask("de", de.niche, de));
    assert.equal(taskTitle("de", de.niche, de.scenario), taskTitle("en", en.niche, en.scenario));
    assert.doesNotMatch(taskTitle("fr", de.niche, de.scenario), /…$/u);
  });
  test("app titles: unique over every app page of ru and of en; the niche last, the width kept", () => {
    for (const [l, maxOver] of [["ru", 150], ["en", 130]] as const) {
      const seen = new Map<string, string>();
      let over = 0;
      for (const card of rating.listRatingNiches(l)) {
        const niche = rating.getRatingNiche(l, card.slug)!;
        for (const app of niche.apps) {
          const niches = rating.ratingAppNiches(l, app.id).length;
          const title = appTitle(l, app, niche, niches);
          const where = `${card.slug}/${app.slug}`;
          assert.ok(!seen.has(title), `${l}: «${title}» on ${seen.get(title)} and ${where}`);
          seen.set(title, where);
          if (displayWidth(title) + 8 > 65) over++;
          // The niche closes the title (a cut drops it, not the query words); no nested brackets.
          if (niches >= 2) assert.match(title, /\([^()]+\)$/u, `${l}: «${title}»`);
        }
      }
      assert.equal(seen.size, 4343, l);
      // Before: 423 ru / 377 en over 65; what is left are long app names themselves.
      assert.ok(over <= maxOver, `${l}: ${over} app titles over the budget`);
    }
    const ht = rating.getRatingNiche("ru", "habit-tracking")!;
    assert.equal(appTitle("ru", { short: "Hevy" }, ht, 2), "Hevy: отзывы, плюсы и минусы (Привычки)");
    assert.equal(appTitle("en", { short: "PlantNet" }, { name: "AI Species Identifier (Plant/Bug/Animal)" }, 2), "PlantNet review: pros and cons (AI Species Identifier)");
  });
  test("app descriptions: the verdict reaches the snippet; the template only without a verdict", () => {
    for (const l of ["ru", "en"] as const) {
      let total = 0;
      let template = 0;
      for (const card of rating.listRatingNiches(l)) {
        const niche = rating.getRatingNiche(l, card.slug)!;
        for (const app of niche.apps) {
          const d = appDescription(l, app);
          total++;
          assert.ok([...d].length <= 155, `${l}/${card.slug}/${app.slug}: ${d.length}`);
          if (!app.verdict) template++;
          else assert.ok(d.includes(app.verdict.slice(0, 20)) || d.startsWith(app.verdict.slice(0, 20)), `${l}/${card.slug}/${app.slug}: «${d}»`);
        }
      }
      assert.ok(template / total <= 0.05, `${l}: ${template} of ${total} descriptions are the template`);
    }
  });
});

describe("schema.ts — JSON-LD within Google's rules (spec 11 §6.4)", () => {
  const ht = rating.getRatingNiche("ru", "habit-tracking")!;
  test("app: editorial Review on 0–100, no aggregateRating / applicationCategory", () => {
    const json = JSON.stringify(appJsonLd("ru", tStub, ht, ht.apps[0]));
    assert.ok(json.includes('"bestRating":100'));
    assert.doesNotMatch(json, /aggregateRating|applicationCategory/i);
  });
  test("niche: plain ListItems, position = rank; de/fr/ja urls are the /en/ canonicals", () => {
    const ld = nicheJsonLd("ru", tStub, ht);
    assert.doesNotMatch(JSON.stringify(ld), /SoftwareApplication|aggregateRating/i);
    const list = ld["@graph"][0] as { itemListElement: { position: number }[] };
    assert.deepEqual(
      list.itemListElement.map((i) => i.position),
      Array.from({ length: 93 }, (_, i) => i + 1),
    );
    const de = rating.getRatingNiche("de", "habit-tracking")!;
    const urls = JSON.stringify(nicheJsonLd("de", tStub, de)).match(/https:\/\/inapp\.pro\/[^"]*/g) ?? [];
    assert.ok(urls.length > 90);
    // The breadcrumb's «inApp» item is the home page, `${SITE}/en`.
    for (const url of urls) assert.ok(url === `${SITE}/en` || url.startsWith(`${SITE}/en/`), url);
  });
});

describe("rating-sitemap.ts — sitemaps and IndexNow (spec 11 §6.5)", () => {
  test("app and indexable task pages per data locale; ASCII, unique <loc>s; images", () => {
    for (const [dl, tasks] of [["en", 68], ["ru", 31]] as const) {
      const xml = sitemap.ratingSitemapXml(dl);
      const locs = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      assert.equal(locs.filter((l) => !l.includes("/tasks/")).length, 4343, dl);
      assert.equal(locs.filter((l) => l.includes("/tasks/")).length, tasks, dl);
      assert.equal(new Set(locs).size, locs.length, `${dl}: duplicate <loc>`);
      for (const l of locs) assert.match(l, /^https:\/\/inapp\.pro\/[\x21-\x7e]+$/, l);
      assert.ok(locs.every((l) => l.startsWith(`${SITE}/${dl}/rating/`)), dl);
      assert.ok(xml.includes("<image:loc>"), dl);
    }
    assert.ok(sitemap.ratingSitemapXml("en").includes("/en/rating/habit-tracking/hevy-workout-tracker-gym-log</loc>"));
  });
  test("hub entries: ru and en /rating plus 71 niches each; IndexNow: 8,929 URLs, sent when changed", () => {
    const hub = sitemap.ratingHubEntries();
    assert.equal(hub.length, 144);
    assert.ok(hub.some((e) => e.url === `${SITE}/en/rating/habit-tracking`));
    const all = sitemap.ratingIndexNowUrls({ since: "" });
    assert.equal(all.length, 8929);
    assert.equal(new Set(all).size, 8929);
    assert.deepEqual(sitemap.ratingIndexNowUrls({ since: "9999-12-31" }), []);
    // By default: what the latest import changed (and the hubs), for two weeks after it.
    const byDefault = new Set(sitemap.ratingIndexNowUrls());
    const everything = new Set(all);
    for (const url of byDefault) assert.ok(everything.has(url), url);
    const newest = DATA_LOCALES.map((dl) => readJson<RatingIndexFile>(`content/v2/${dl}/rating/index.json`).generatedAt).sort()[0];
    const fresh = newest >= new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);
    if (fresh) for (const hubUrl of [`${SITE}/ru/rating`, `${SITE}/en/rating`]) assert.ok(byDefault.has(hubUrl), hubUrl);
  });
  test("task <url>s carry only indexable alternates", () => {
    const ruLocs = new Set([...sitemap.ratingSitemapXml("ru").matchAll(/<url><loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    const enXml = sitemap.ratingSitemapXml("en");
    for (const entry of enXml.split("<url>").filter((e) => e.includes("/tasks/"))) {
      const ru = /hreflang="ru" href="([^"]+)"/.exec(entry)?.[1];
      if (ru) assert.ok(ruLocs.has(ru), `en task names the noindex ${ru}`);
    }
  });
});
