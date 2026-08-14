import assert from "node:assert/strict";
import { canUseAso } from "../src/lib/asoAccess";
import { buildAsoAudit, normalizeLookupResult, parseAppStoreInput, ROOMDO_APP_ID } from "../src/lib/asoAudit";

assert.equal(canUseAso({ isAdmin: true, username: "artSaverin" }), true);
assert.equal(canUseAso({ isAdmin: true, username: "@artSaverin" }), true);
assert.equal(canUseAso({ isAdmin: false, username: "artSaverin" }), false, "Friend access must not open the owner tool");
assert.equal(canUseAso({ isAdmin: true, username: "another-admin" }), false, "Only the named owner may use ASO");
assert.equal(canUseAso(null), false);

assert.deepEqual(parseAppStoreInput(`https://apps.apple.com/app/id${ROOMDO_APP_ID}`), { id: ROOMDO_APP_ID, country: "us" });
assert.deepEqual(parseAppStoreInput(`https://apps.apple.com/gb/app/roomdo/id${ROOMDO_APP_ID}?l=en`), { id: ROOMDO_APP_ID, country: "gb" });
assert.deepEqual(parseAppStoreInput(ROOMDO_APP_ID), { id: ROOMDO_APP_ID, country: "us" });
assert.equal(parseAppStoreInput("https://example.com/app/id6798765545"), null, "Only the fixed App Store host may be fetched");
assert.equal(parseAppStoreInput("not an app"), null);

const app = normalizeLookupResult({
  trackId: Number(ROOMDO_APP_ID),
  trackName: "Roomdo: To-Do List & Planner",
  artistName: "Iaroslav Saverin",
  description: "Your tasks stop being a list. They become things you can see.",
  artworkUrl512: "https://example.com/icon.jpg",
  screenshotUrls: Array.from({ length: 6 }, (_, index) => `https://example.com/${index + 1}.jpg`),
  genres: ["Productivity", "Lifestyle"],
  languageCodesISO2A: ["EN", "RU"],
  version: "1.0",
  releaseDate: "2026-08-14T00:23:32Z",
  currentVersionReleaseDate: "2026-08-14T00:23:32Z",
  formattedPrice: "Free",
});
assert.ok(app);

const audit = buildAsoAudit(app, "ru");
assert.equal(audit.sample, true);
assert.equal(audit.niche.slug, "calendars-tasks");
assert.ok(audit.niche.apps >= 100);
assert.ok(audit.niche.reviews > 40_000);
assert.ok(audit.actions.length >= 3);
assert.equal(audit.screenshotPlan[0]?.source, 3, "The differentiated room screen must lead the proposed story");
assert.ok(audit.metadata.name.length <= 30);
assert.ok(audit.metadata.subtitle.length <= 30);
assert.ok(audit.metadata.keywords.length <= 100);
assert.ok(audit.metadata.promotionalText.length <= 170);

const otherApp = normalizeLookupResult({
  trackId: 493145008,
  trackName: "Headspace: Sleep & Meditation",
  artistName: "Headspace Inc.",
  description: "Meditation and mindfulness exercises for better sleep, focus and calm.",
  genres: ["Health & Fitness"],
  screenshotUrls: ["https://example.com/1.jpg"],
  languageCodesISO2A: ["EN"],
});
assert.ok(otherApp);
const otherAudit = buildAsoAudit(otherApp, "ru");
assert.equal(otherAudit.niche.slug, "meditation-mindfulness");
assert.doesNotMatch(otherAudit.metadata.name, /[а-яё]/i, "US storefront metadata drafts must not inherit the UI language");

console.log("ASO contract tests passed");
