// Assemble the regen workflow outputs (/tmp/regen/out/*.json) into the render
// overlays in src/data, attaching real evidence/count/apps from the source by id
// (so nothing is fabricated and quotes stay real). Idempotent; skips
// missing/malformed outputs and reports them.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen/out";
const J = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const readOut = (name) => {
  try {
    return J(path.join(OUT, name));
  } catch {
    return null;
  }
};

const THEME_LABEL = {
  payment: "Подписка и оплата",
  content: "Контент и каталог",
  playback: "Аудио и воспроизведение",
  ui: "Интерфейс и навигация",
  reliability: "Стабильность и устройства",
  support: "Поддержка и аккаунт",
  strategy: "Стратегия и сегменты",
};
const HYGIENE = new Set(["payment", "support"]);

const seg = J(path.join(ROOT, "src/data/segment-insights.json"));
const ideas = J(path.join(ROOT, "src/data/ideas.json"));
const insights = J(path.join(ROOT, "src/data/insights.json"));

const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);

// Build a product/hygiene RegenSet from a source item list + agent rewrites.
function buildSet(srcItems, rewrites, { bodyField, kickerOf }) {
  const byId = new Map(srcItems.map((it) => [it.id, it]));
  const chosen = new Set();
  const product = [];
  for (const r of rewrites || []) {
    const it = byId.get(r.id);
    if (!it) continue;
    chosen.add(r.id);
    product.push({
      title: clean(r.title) || it.title,
      plus: clean(r.plus),
      minus: clean(r.minus),
      count: it.observationCount ?? (it.evidence ? it.evidence.length : 0),
      apps: it.apps,
      kicker: kickerOf(it),
      evidence: it.evidence || [],
    });
  }
  const hygiene = srcItems
    .filter((it) => !chosen.has(it.id) && HYGIENE.has(it.theme))
    .sort((a, b) => (b.observationCount ?? 0) - (a.observationCount ?? 0))
    .map((it) => ({
      title: it.title,
      body: clean(it[bodyField]),
      count: it.observationCount ?? (it.evidence ? it.evidence.length : 0),
      kicker: kickerOf(it),
      evidence: it.evidence || [],
    }));
  return { product, hygiene };
}

const themeKicker = (it) => (it.theme ? THEME_LABEL[it.theme] : undefined);
const appKicker = (it) => it.group?.name ?? (it.theme ? THEME_LABEL[it.theme] : undefined);

// ── Categories ──
const segCards = {};
let catOk = 0,
  catMiss = 0;
for (const [slug, c] of Object.entries(seg)) {
  const out = readOut(`cat-${slug}.json`);
  if (!out || !Array.isArray(out.product)) {
    catMiss++;
    continue;
  }
  segCards[slug] = buildSet(c.items || [], out.product, { bodyField: "body", kickerOf: themeKicker });
  catOk++;
}

// ── Ideas ──
const ideaSlugs = new Set(ideas.map((i) => i.slug));
const ideaCards = {};
let ideaOk = 0;
const ideaFiles = fs.existsSync(OUT) ? fs.readdirSync(OUT).filter((f) => f.startsWith("ideas-")) : [];
for (const f of ideaFiles) {
  const out = readOut(f);
  if (!out || !Array.isArray(out.ideas)) continue;
  for (const r of out.ideas) {
    if (!ideaSlugs.has(r.slug)) continue;
    const e = {};
    if (clean(r.title)) e.title = clean(r.title);
    if (clean(r.oneLiner)) e.oneLiner = clean(r.oneLiner);
    if (e.title || e.oneLiner) {
      ideaCards[r.slug] = e;
      ideaOk++;
    }
  }
}

// ── Apps ──
const appCards = {};
let appOk = 0,
  appMiss = 0;
for (const a of insights) {
  const out = readOut(`app-${a.productId}.json`);
  if (!out || !Array.isArray(out.product)) {
    appMiss++;
    continue;
  }
  appCards[a.productId] = buildSet(a.insights || [], out.product, { bodyField: "story", kickerOf: appKicker });
  appOk++;
}

const W = (name, obj) => fs.writeFileSync(path.join(ROOT, "src/data", name), JSON.stringify(obj));
W("segment-cards.json", segCards);
W("idea-cards.json", ideaCards);
W("app-cards.json", appCards);

console.log(JSON.stringify({ catOk, catMiss, ideaOk, appOk, appMiss }));
