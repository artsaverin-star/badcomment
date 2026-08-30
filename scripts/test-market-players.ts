import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import NicheMarketPlayers from "../src/components/NicheMarketPlayers";
import MarketPlayersList from "../src/components/MarketPlayersList";
import active from "../src/data/active-categories.json";
import queries from "../src/data/marketPlayerQueries.json";
import { marketPlayerKeywords, marketPlayerRows, type MarketSnapshot } from "../src/lib/marketPlayers";
import { marketPlayersFor } from "../src/lib/marketPlayers.server";
import { getApp } from "../src/lib/reviews";

assert.deepEqual(new Set(Object.keys(queries)), new Set(active));
// Development-only progress check. CI always requires complete coverage.
const collectedOnly = process.argv.includes("--collected-only");
let count = 0;
let missingShots = 0;
for (const slug of active) {
  const snapshot = marketPlayersFor(slug);
  if (!snapshot && collectedOnly) continue;
  assert.ok(snapshot, `Missing snapshot for ${slug}`);
  count++;
  assert.equal(snapshot.source, "Apple App Store", "Do not publish restricted-source data");
  assert.equal(snapshot.store, "us");
  assert.equal(snapshot.platform, "ios");
  assert.deepEqual(snapshot.keywords.map((key) => key.term), queries[slug as keyof typeof queries]);
  assert.equal(snapshot.leaderTerm, snapshot.keywords[0].term);
  assert.ok(snapshot.keywords[0].results.length > 0);
  const ids = new Set(snapshot.apps.map((app) => app.appStoreId));
  assert.equal(ids.size, snapshot.apps.length);
  const usedIds = new Set<string>();
  for (const keyword of snapshot.keywords) {
    assert.ok(!("popularity" in keyword) && !("difficulty" in keyword), "Proprietary Astro scores must not enter the public snapshot");
    assert.ok(Number.isFinite(Date.parse(keyword.resultsFetchedAt)));
    const url = new URL(keyword.sourceUrl);
    assert.equal(url.origin, "https://itunes.apple.com");
    assert.equal(url.searchParams.get("term"), keyword.term);
    assert.equal(url.searchParams.get("country"), snapshot.store);
    assert.equal(new Set(keyword.results.map((app) => app.appStoreId)).size, keyword.results.length);
    assert.ok(keyword.results.every((app, i) => Number.isInteger(app.ranking) && app.ranking > 0 && (i === 0 || keyword.results[i - 1].ranking < app.ranking)));
    for (const result of keyword.results) { assert.ok(ids.has(result.appStoreId)); usedIds.add(result.appStoreId); }
    assert.deepEqual(marketPlayerRows(snapshot, "search", keyword.term).map(({ app }) => app.appStoreId), keyword.results.map((app) => app.appStoreId), "Preserve source search order");
  }
  assert.deepEqual(ids, usedIds, "No unrelated apps in a niche payload");
  for (const app of snapshot.apps) {
    assert.ok(app.ratingCount === null || (app.ratingCount >= 0 && Number.isInteger(app.ratingCount)));
    assert.ok(app.averageRating === null || (app.averageRating >= 0 && app.averageRating <= 5));
    assert.ok(Number.isFinite(Date.parse(app.screenshotsFetchedAt)));
    assert.equal(app.screenshotSourceUrl, `https://apps.apple.com/us/app/id${app.appStoreId}`);
    if (!app.screenshots.length) missingShots++;
    for (const src of [app.iconUrl, ...app.screenshots]) {
      const url = new URL(src);
      assert.equal(url.protocol, "https:");
      assert.ok(url.hostname.endsWith(".mzstatic.com"), "Images must come from Apple");
    }
    for (const key of marketPlayerKeywords(snapshot, app.appStoreId)) {
      assert.ok(snapshot.keywords.find((row) => row.term === key.term)?.results.some((result) => result.appStoreId === app.appStoreId && result.ranking === key.ranking));
    }
  }
  const leaders = marketPlayerRows(snapshot, "leaders", snapshot.keywords[1].term);
  assert.deepEqual(new Set(leaders.map(({ app }) => app.appStoreId)), new Set(snapshot.keywords[0].results.map((app) => app.appStoreId)), "Leader sample must not depend on previous query");
  assert.ok(leaders.every(({ app }, i) => i === 0 || (leaders[i - 1].app.ratingCount ?? -1) >= (app.ratingCount ?? -1)));
  for (const locale of ["ru", "en"] as const) {
    const element = NicheMarketPlayers({ slug, locale })!;
    assert.equal(element.key, slug, "Changing niche must reset query and page size");
    for (const app of element.props.data.apps) {
      assert.equal(app.reviewHref, getApp(slug, app.appStoreId) ? `/${locale}/reviews/${slug}/${app.appStoreId}` : undefined);
      assert.ok(!("evidence" in app) && !("hypothesis" in app), "Never serialize paid research");
    }
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes(locale === "ru" ? "Основные игроки" : "Main players"));
    assert.equal((html.match(/data-app-id=/g) || []).length, Math.min(5, snapshot.keywords[0].results.length));
    assert.ok(html.includes("/badges/app-store.svg"));
  }
}
assert.ok(count > 0);
assert.equal(marketPlayersFor("../language-learning"), null);
assert.equal(marketPlayersFor("unknown"), null);
assert.equal(renderToStaticMarkup(createElement(NicheMarketPlayers, { slug: "unknown", locale: "ru" })), "");
const sample = marketPlayersFor("language-learning")!;
const edge: MarketSnapshot = { ...sample, apps: sample.apps.map((app, index) => ({ ...app, ratingCount: index === 0 ? null : 0, screenshots: [] })) };
assert.equal(marketPlayerRows(edge, "leaders", sample.leaderTerm).at(-1)?.app.appStoreId, sample.apps[0].appStoreId, "Unknown counts sort below genuine zeros");
const missingHtml = renderToStaticMarkup(createElement(MarketPlayersList, { data: edge, locale: "en" }));
assert.ok(missingHtml.includes("rating count unavailable") && missingHtml.includes("Screenshots not available yet"));
assert.deepEqual(marketPlayerRows(sample, "search", "unknown"), []);
assert.deepEqual(marketPlayerKeywords(sample, "unknown"), []);
console.log(`Market players: ${count}/${active.length} niches checked; ${missingShots} missing screenshot sets explicitly labelled. ${collectedOnly ? "Collection-in-progress check only." : "Full coverage passed."}`);
