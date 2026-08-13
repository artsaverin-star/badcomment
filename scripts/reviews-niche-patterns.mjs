#!/usr/bin/env node

// Compile the category-wide research that already exists in gen/ into a small,
// deployable reviews catalogue. These patterns stay separate from per-app
// labels: they describe signals repeated across a niche, not a single app.

import fs from "node:fs";

const SOURCE_ROOT = "gen/rev-src";
const PATTERN_PATH = "src/data/reviewNichePatterns.json";
const CATALOG_PATH = "src/data/reviewNicheCatalog.json";
const BOOTSTRAP_PATH = "src/data/reviewNichePatternsBootstrap.json";
const MAX_PATTERNS = 8;
const MAX_EVIDENCE = 3;
const MIN_PATTERN_SIGNALS = 8;
const MIN_PATTERN_APPS = 3;

const clean = (value) =>
  typeof value === "string"
    ? value.replace(/[—–]/g, "-").replace(/;/g, ",").replace(/[ \t]+/g, " ").trim()
    : value;

const polarity = (card) => {
  if (card.plus && card.minus) return "mixed";
  if (card.minus) return "pain";
  if (card.plus) return "love";
  return "mixed";
};

const normalizeCard = (card, englishCard) => ({
  title: clean(card.title),
  ...(englishCard?.title ? { titleEn: clean(englishCard.title) } : {}),
  polarity: polarity(card),
  ...(card.plus ? { plus: clean(card.plus) } : {}),
  ...(englishCard?.plus ? { plusEn: clean(englishCard.plus) } : {}),
  ...(card.minus ? { minus: clean(card.minus) } : {}),
  ...(englishCard?.minus ? { minusEn: clean(englishCard.minus) } : {}),
  ...(Number.isFinite(card.count) ? { count: card.count } : {}),
  apps: Array.isArray(card.apps) ? card.apps.slice(0, 8).map(clean) : [],
  evidence: (Array.isArray(card.evidence) ? card.evidence : []).slice(0, MAX_EVIDENCE).map((item) => ({
    app: clean(item.app),
    rating: Number(item.rating) || 0,
    quote: clean(item.quote),
  })),
});

const patternIndex = {};
const catalog = {};
const bootstrap = fs.existsSync(BOOTSTRAP_PATH) ? JSON.parse(fs.readFileSync(BOOTSTRAP_PATH, "utf8")) : {};

for (const slug of fs.readdirSync(SOURCE_ROOT).sort()) {
  const ratingPath = `src/data/peoplesRating/${slug}.json`;
  const rating = fs.existsSync(ratingPath) ? JSON.parse(fs.readFileSync(ratingPath, "utf8")) : {};
  const sourceFiles = fs.readdirSync(`${SOURCE_ROOT}/${slug}`).filter((name) => name.endsWith(".json"));
  let sourceReviews = 0;
  for (const file of sourceFiles) {
    const source = JSON.parse(fs.readFileSync(`${SOURCE_ROOT}/${slug}/${file}`, "utf8"));
    sourceReviews += Array.isArray(source.reviews) ? source.reviews.length : 0;
  }

  let cards = [];
  let englishCards = [];
  const synthPath = `gen/${slug}-synth.json`;
  const synthEnPath = `gen/${slug}-synth.en.json`;
  const cardsPath = `gen/${slug}-cards.json`;
  if (fs.existsSync(synthPath)) {
    const synth = JSON.parse(fs.readFileSync(synthPath, "utf8"));
    cards = Array.isArray(synth.cards) ? synth.cards : [];
    if (fs.existsSync(synthEnPath)) {
      const synthEn = JSON.parse(fs.readFileSync(synthEnPath, "utf8"));
      englishCards = Array.isArray(synthEn.cards) ? synthEn.cards : [];
    }
  } else if (fs.existsSync(cardsPath)) {
    const source = JSON.parse(fs.readFileSync(cardsPath, "utf8"));
    cards = [...(Array.isArray(source.product) ? source.product : []), ...(Array.isArray(source.hygiene) ? source.hygiene : [])];
  }

  const selected = cards
    .map((card, index) => ({ card, englishCard: englishCards[index], index }))
    .filter(
      ({ card }) =>
        card &&
        typeof card.title === "string" &&
        card.title.trim() &&
        (Number(card.count) || 0) >= MIN_PATTERN_SIGNALS &&
        Array.isArray(card.apps) &&
        new Set(card.apps).size >= MIN_PATTERN_APPS,
    )
    .sort((a, b) => (Number(b.card.count) || 0) - (Number(a.card.count) || 0) || a.index - b.index)
    .slice(0, MAX_PATTERNS)
    .map(({ card, englishCard }) => normalizeCard(card, englishCard));

  const finalPatterns = selected.length ? selected : bootstrap[slug] || [];
  if (finalPatterns.length) patternIndex[slug] = finalPatterns;
  catalog[slug] = {
    name: rating.name || slug,
    nameEn: rating.nameEn || rating.name || slug,
    appsPlanned: sourceFiles.length,
    sourceReviews,
    patterns: finalPatterns.length,
    translatedPatterns: finalPatterns.filter((pattern) => pattern.titleEn).length,
  };
}

fs.writeFileSync(PATTERN_PATH, JSON.stringify(patternIndex, null, 1));
fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 1));

console.log({
  niches: Object.keys(catalog).length,
  sourceApps: Object.values(catalog).reduce((sum, niche) => sum + niche.appsPlanned, 0),
  sourceReviews: Object.values(catalog).reduce((sum, niche) => sum + niche.sourceReviews, 0),
  nichesWithPatterns: Object.keys(patternIndex).length,
  patterns: Object.values(patternIndex).reduce((sum, items) => sum + items.length, 0),
  translatedPatterns: Object.values(patternIndex).flat().filter((pattern) => pattern.titleEn).length,
});
