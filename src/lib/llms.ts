import active from "@/data/active-categories.json";
import { getCategoryBySlug } from "@/lib/researchCategories";
import { getNicheThesis } from "@/lib/nicheThesis";
import { getNicheOpportunities } from "@/lib/nicheOpportunities";
import { getSegmentSummary } from "@/lib/segmentSummary";
import { categoryCards, appCardsFor, ideaContentEn, descriptionFor } from "@/lib/regenCards";
import { getProductInsights } from "@/lib/insights";
import { listIdeas } from "@/lib/ideas";
import type { Locale } from "@/lib/i18n";

// llms.txt / llms-full.txt — a clean Markdown channel that hands LLMs the full
// research synthesis (governing thought, findings, opportunities, app
// breakdowns) so they can cite inApp. Separate from the gated browsing UI: the
// site stays paywalled for humans, the knowledge stays open to AI.

const BASE = "https://inapp.pro";
const SLUGS = active as string[];

const INTRO = {
  ru: "inApp читает тысячи отзывов из App Store и Google Play и превращает их в рыночное исследование для тех, кто делает приложения: что пользователи хвалят, на что злятся, каких приложений не хватает и какие идеи напрашиваются. Двуязычный сервис (русский/английский).",
  en: "inApp reads thousands of App Store and Google Play reviews and turns them into market research for app builders: what users love, what they hate, which apps are missing, and which ideas are worth building. Bilingual (Russian / English).",
};

function oneLine(s: string): string {
  return (s || "").replace(/\s+/g, " ").trim();
}

// Short index file: who we are + a link per niche with its core insight.
export function buildLlmsIndex(): string {
  const out: string[] = [];
  out.push("# inApp — app-niche research from real reviews", "");
  out.push(`> ${INTRO.en}`, "");
  out.push("## Niches");
  for (const slug of SLUGS) {
    const cat = getCategoryBySlug(slug, "en");
    const thesis = getNicheThesis(slug, "en");
    if (!cat) continue;
    const gist = thesis ? oneLine(thesis.governing) : "";
    out.push(`- [${cat.name}](${BASE}/en/segment/${slug}): ${gist}`);
  }
  out.push("");
  out.push("## Full content");
  out.push(`- [Full research, all niches — English (Markdown)](${BASE}/llms-full.txt)`);
  out.push(`- [Полное исследование, все ниши — Russian (Markdown)](${BASE}/llms-full.ru.txt)`);
  out.push("");
  out.push("## About");
  out.push(`- [inApp](${BASE}): ${oneLine(INTRO.en)}`);
  out.push("");
  return out.join("\n");
}

// Full digest: the whole authored synthesis per niche, both locales linked.
export function buildLlmsFull(locale: Locale = "en"): string {
  const out: string[] = [];
  out.push("# inApp — full app-niche research", "");
  out.push(`> ${INTRO[locale === "en" ? "en" : "ru"]}`, "");
  out.push(`Source: ${BASE} · Generated from real ${"App Store / Google Play"} reviews.`, "");

  for (const slug of SLUGS) {
    const cat = getCategoryBySlug(slug, locale);
    if (!cat) continue;
    const thesis = getNicheThesis(slug, locale);
    const summary = getSegmentSummary(slug);
    const ideas = listIdeas().filter((i) => i.category === slug);
    const prod = (categoryCards(slug, locale)?.product ?? []).slice().sort((a, b) => b.count - a.count);
    const obs = prod.reduce((s, c) => s + c.count, 0);

    out.push("---", "");
    out.push(`## ${cat.name}`, "");
    out.push(`Page: ${BASE}/${locale}/segment/${slug}`);
    if (summary) out.push(`Scope: ${summary.reviewsScanned.toLocaleString("en-US")} reviews across ${cat.apps.length} apps, ${obs.toLocaleString("en-US")} observations, ${ideas.length} opportunities.`);
    out.push("");
    if (thesis?.governing) out.push(`**Thesis:** ${oneLine(thesis.governing)}`, "");

    if (thesis?.pillars?.length) {
      out.push("### Key findings");
      // The same ladder as the site: pillar 01's dek is the free rung, the
      // deks of pillars 02+ are the paid conclusions — titles only here.
      thesis.pillars.forEach((p, i) => {
        out.push(i === 0 ? `${i + 1}. **${oneLine(p.title)}** — ${oneLine(p.dek)}` : `${i + 1}. **${oneLine(p.title)}**`);
      });
      out.push("");
    }
    if (thesis?.competitorRead) out.push(`**Competitive read:** ${oneLine(thesis.competitorRead)}`, "");

    // Top observations (what users actually say).
    if (prod.length) {
      out.push("### What the reviews show");
      prod.slice(0, 12).forEach((c) => out.push(`- ${oneLine(c.title)} (${c.count})`));
      out.push("");
    }

    // Opportunities: titles only. The one-liner is the pitch and the gap is
    // the paid body — the same cut as the locked cards on the site.
    const regen = getNicheOpportunities(slug, locale);
    if (ideas.length) {
      out.push("### Opportunities to build");
      ideas.forEach((idea) => {
        const r = regen.find((o) => o.slug === idea.slug);
        const en = ideaContentEn(idea.slug, locale);
        const title = r?.title || en?.title || idea.title;
        out.push(`- **${oneLine(title)}**`);
      });
      out.push("");
    }

    // Apps analysed — description + what's loved / hated (real review synthesis).
    out.push("### Apps analysed");
    cat.apps.forEach((a) => {
      const pid = a.productId as string;
      const ins = getProductInsights(pid);
      const desc = descriptionFor(pid, locale, ins?.description);
      const cards = (appCardsFor(pid, locale)?.product ?? []).slice().sort((x, y) => y.count - x.count);
      const loved = cards.find((c) => c.plus?.trim())?.title;
      const hated = cards.find((c) => c.minus?.trim())?.title;
      out.push(`- **${a.name}**${desc ? ` — ${oneLine(desc)}` : ""}`);
      if (loved) out.push(`  - Loved: ${oneLine(loved)}`);
      if (hated) out.push(`  - Pain: ${oneLine(hated)}`);
    });
    out.push("");
  }

  return out.join("\n");
}
