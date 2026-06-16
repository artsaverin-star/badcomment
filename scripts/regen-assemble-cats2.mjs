// Assemble the expanded category clusters (/tmp/regen2/out/cat-*.json) into
// segment-cards.json — attaching real evidence/counts/apps per cluster by
// looking up obsIds within that category's apps (no fabrication). Hygiene cards
// keep coming from the original synthesis (theme payment/support).
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = "/tmp/regen2/out";
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
const readOut = (n) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(OUT, n), "utf8"));
  } catch {
    return null;
  }
};

const THEME_LABEL = {
  payment: "Подписка и оплата", content: "Контент и каталог", playback: "Аудио и воспроизведение",
  ui: "Интерфейс и навигация", reliability: "Стабильность и устройства", support: "Поддержка и аккаунт",
  strategy: "Стратегия и сегменты",
};
const HYGIENE = new Set(["payment", "reliability"]);
const clean = (s) => (typeof s === "string" && s.trim() ? s.trim() : undefined);

const categories = J("src/data/categories.json");
const meta = J("src/data/categories-meta.json");
const insights = J("src/data/insights.json");
const seg = J("src/data/segment-insights.json");
const byPid = new Map(insights.map((a) => [a.productId, a]));
const existing = (() => {
  try {
    return J("src/data/segment-cards.json");
  } catch {
    return {};
  }
})();

function catPids(slug) {
  for (const d of categories) {
    const c = (d.categories || []).find((x) => x.slug === slug);
    if (c) return (c.apps || []).map((q) => ({ pid: meta[`${slug}:${q}`]?.productId, name: meta[`${slug}:${q}`]?.name })).filter((x) => x.pid);
  }
  return [];
}

const out = { ...existing };
let ok = 0, miss = 0, totalCards = 0;

for (const slug of Object.keys(seg)) {
  const res = readOut(`cat-${slug}.json`);
  if (!res || !Array.isArray(res.product)) {
    miss++;
    continue;
  }
  // obsId -> {evidence, count, theme, app} within this category
  const obsMap = new Map();
  for (const { pid, name } of catPids(slug)) {
    const a = byPid.get(pid);
    if (!a) continue;
    for (const o of a.insights || []) {
      obsMap.set(o.id, { evidence: o.evidence || [], count: o.observationCount ?? (o.evidence ? o.evidence.length : 0), theme: o.theme, app: name });
    }
  }

  const product = [];
  const hygiene = [];
  for (const c of res.product) {
    const ids = (c.obsIds || []).filter((id) => obsMap.has(id));
    if (!ids.length && !clean(c.title)) continue;
    let count = 0;
    const ev = [];
    const apps = new Set();
    const themes = {};
    for (const id of ids) {
      const o = obsMap.get(id);
      count += o.count;
      if (o.app) apps.add(o.app);
      if (o.theme) themes[o.theme] = (themes[o.theme] || 0) + 1;
      for (const e of o.evidence) ev.push({ ...e, app: o.app });
    }
    ev.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    // Dedupe quotes; keep up to 40 so the modal is rich and scrollable.
    const seen = new Set();
    const evidence = [];
    for (const e of ev) {
      const key = (e.quoteRu || e.quote || "").trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      evidence.push(e);
      if (evidence.length >= 40) break;
    }
    const topTheme = Object.entries(themes).sort((a, b) => b[1] - a[1])[0]?.[0];
    const card = {
      title: clean(c.title) || "",
      plus: clean(c.plus),
      minus: clean(c.minus),
      count: count || ids.length,
      apps: [...apps].slice(0, 3),
      kicker: topTheme ? THEME_LABEL[topTheme] : undefined,
      evidence,
    };
    // Route to «База» only if the agent marked it base (pure billing complaint
    // or a bug/crash/data-loss). Fallback to theme when kind is missing.
    const isBase = c.kind === "base" || (!c.kind && HYGIENE.has(topTheme));
    (isBase ? hygiene : product).push(card);
  }
  if (!product.length) {
    miss++;
    continue;
  }
  hygiene.sort((a, b) => b.count - a.count);

  out[slug] = { product, hygiene };
  ok++;
  totalCards += product.length;
}

fs.writeFileSync(path.join(ROOT, "src/data/segment-cards.json"), JSON.stringify(out));
console.log(JSON.stringify({ ok, miss, totalCards, avgPerCat: Math.round((totalCards / Math.max(1, ok)) * 10) / 10 }));
