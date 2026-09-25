import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getViewer } from "@/site/access";
import { SITE_URL } from "@/site/config";
import { getManifest } from "@/site/content";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import "@/site/features/settings/settings.css";
import "@/site/features/library/library.css";
import "@/site/features/research/research.css";
import { Connections } from "@/site/features/mcp/Connections";
import { InstallPicker } from "@/site/features/mcp/InstallPicker";
import { MCP_UI_KEYS } from "@/site/features/mcp/keys";
import { mcpStrings, type McpStrings } from "@/site/features/mcp/strings";
import "@/site/features/mcp/mcp.css";
import { PlusCard } from "@/site/features/plus/PlusCard";
import { dataLang } from "@/site/features/rating/seo";
import { OG_LOCALE, breadcrumbList, jsonLd, localeAlternates, withBrand } from "@/site/features/research/seo";
import { I18nProvider } from "@/site/i18n/client";
import { counted } from "@/site/i18n/count";
import { isLocale, type Locale } from "@/site/i18n/locales";
import { getT } from "@/site/i18n/server";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { mcpConnections, mcpExample, mcpTools } from "@/site/sitedata/mcp";
import { FREE_REVIEW_NICHE, getReviewNiche, reviewTotals } from "@/site/sitedata/reviews";
import { Heading, RatingIcon, ResearchIcon, ReviewsIcon, ROW_GLYPH, RowCard } from "@/site/ui";

// «MCP» (web-only section, DECISIONS «Web-only sections»): the page of the inApp MCP server.
// No Swift screen, so it is built only from the Clarity blocks (spec §5): one 680 column with
// gap 24, the fixed Georgia heading, one footnote with the corpus counts, the shared Plus card
// (caption "static"), RowCards to the three sections an agent reads, the install picker,
// the visitor's connected clients as settings boxes, a live example answer, starter prompts,
// the server-rendered tool list (the deploy smoke test greps it for `list_niche_themes`) and
// open FAQ blocks. Every copy of the page is translated, so all five locales are canonical.
// No price here: MCP is part of Plus and the paywall sheet shows the rest.

type Props = { params: Promise<{ lang: string }> };

const GROUPS: { key: keyof McpStrings; tools: string[] }[] = [
  { key: "groupStart", tools: ["account_status", "list_niches", "research_niche"] },
  { key: "groupNiche", tools: ["get_niche_brief", "list_niche_findings", "get_distribution_channels"] },
  { key: "groupApps", tools: ["find_apps", "list_niche_apps", "get_app_verdict", "get_niche_rating"] },
  { key: "groupReviews", tools: ["list_niche_themes", "search_themes", "get_app_themes", "get_app_reviews"] },
  { key: "groupIdeas", tools: ["list_ideas", "get_idea"] },
];

function corpus(locale: Locale, s: McpStrings) {
  const totals = reviewTotals();
  return {
    totals,
    niches: counted(locale, totals.niches, s.nichesWord),
    apps: counted(locale, totals.apps, s.appsWord),
    reviews: counted(locale, totals.reviews, s.reviewsWord),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const s = mcpStrings[lang];
  const c = corpus(lang, s);
  const description = format(s.metaDescription, { niches: c.niches, apps: c.apps, reviews: c.reviews });
  const alternates = localeAlternates(lang, "mcp");
  return {
    title: s.metaTitle,
    description,
    alternates,
    openGraph: {
      type: "website",
      siteName: "inApp",
      title: withBrand(s.metaTitle, lang),
      description,
      url: alternates.canonical as string,
      locale: OG_LOCALE[lang],
    },
    twitter: { card: "summary", title: withBrand(s.metaTitle, lang), description },
  };
}

/** A section: bold title2 heading + content, 20 apart. No kicker (R6). */
function Section({ id, title, children }: { id: string; title: ReactNode; children: ReactNode }) {
  return (
    <section className="ia-mcp-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 className="ia-section-title ia-section-title--bold" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** `template` with `{key}` replaced by a node (a name that carries its own `lang`). */
function fill(template: string, key: string, node: ReactNode): ReactNode {
  const at = template.indexOf(`{${key}}`);
  if (at < 0) return template;
  return (
    <>
      {template.slice(0, at)}
      {node}
      {template.slice(at + key.length + 2)}
    </>
  );
}

export default async function McpPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;
  const [t, viewer, manifest] = await Promise.all([getT(locale), getViewer(), getManifest()]);
  const s = mcpStrings[locale];
  const c = corpus(locale, s);
  const tools = mcpTools();
  const toolTitle = new Map(tools.map((tool) => [tool.name, tool.title]));
  const grouped = new Set(GROUPS.flatMap((g) => g.tools));
  const extra = tools.filter((tool) => !grouped.has(tool.name)).map((tool) => tool.name);
  const example = mcpExample(locale);
  // The example niche under the name its review page shows (the app's niche name, own `lang`).
  const exampleNiche = example ? getReviewNiche(locale, example.niche.slug) : null;
  const sample = getReviewNiche(locale, FREE_REVIEW_NICHE);
  const connections = viewer.user ? await mcpConnections(viewer.user.id) : null;
  const art = manifest.art.WelcomeLibrary_v7;
  const canonical = `${SITE_URL}/${locale}/mcp`;
  const toolLine = (name: string) => (s as Record<string, string>)[`tool_${name}`] ?? toolTitle.get(name) ?? name;
  const faq = [1, 2, 3, 4, 5, 6].map((n) => ({
    q: (s as Record<string, string>)[`faq${n}q`],
    a: format((s as Record<string, string>)[`faq${n}a`], {
      reviews: c.reviews,
      apps: counted(locale, c.totals.apps, s.aboutAppsWord),
      niches: counted(locale, c.totals.niches, s.inNichesWord),
    }),
  }));
  const toolGroups = [
    ...GROUPS.map((g) => ({ name: s[g.key], tools: g.tools.filter((n) => toolTitle.has(n)) })),
    ...(extra.length ? [{ name: "", tools: extra }] : []),
  ].filter((g) => g.tools.length);

  return (
    <I18nProvider locale={locale} strings={t.pick(MCP_UI_KEYS)} web={{ mcp: s }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                "@id": canonical,
                url: canonical,
                name: s.metaTitle,
                inLanguage: locale,
                isPartOf: { "@id": `${SITE_URL}/#website` },
                breadcrumb: { "@id": `${canonical}#breadcrumb` },
              },
              {
                "@type": "FAQPage",
                "@id": `${canonical}#faq`,
                mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
              },
              breadcrumbList(`${canonical}#breadcrumb`, [
                ["inApp", `${SITE_URL}/${locale}`],
                ["MCP", canonical],
              ]),
            ],
          }),
        }}
      />
      {/* Web deviation (§1.5): .ia-page padding 24 top / 32 bottom, as on every web tab. */}
      <div className="ia-page ia-page--catalog ia-page--stack ia-page--stack-24">
        <Heading className="ia-heading--fixed" title={s.title} subtitle={s.subtitle} />
        {/* The counts as one sentence instead of tiles (R7). */}
        <p className="ia-footnote">
          {[
            counted(locale, c.totals.niches, s.nichesWord),
            counted(locale, c.totals.apps, s.appsWord),
            counted(locale, c.totals.reviews, s.reviewsReadWord),
            counted(locale, tools.length, s.toolsWord),
          ].join(" · ")}
        </p>

        <PlusCard
          title={s.plusTitle}
          body={
            viewer.plus
              ? s.plusActive
              : fill(
                  s.plusBody,
                  "sample",
                  sample ? <span lang={sample.nameLang !== locale ? sample.nameLang : undefined}>{sample.name}</span> : "",
                )
          }
          source="mcp_page"
          art={art ? { src: mediaSrc(art, 224), srcSet: mediaSrcSet(art) } : null}
          caption="static"
        />

        <Section id="capabilities" title={s.givesTitle}>
          <ul className="ia-stack">
            <li>
              <RowCard
                href={routes.reviews(locale)}
                glyph={<ReviewsIcon {...ROW_GLYPH} />}
                title={s.give1Title}
                subtitle={s.give1Body}
              />
            </li>
            <li>
              <RowCard href={routes.rating(locale)} glyph={<RatingIcon {...ROW_GLYPH} />} title={s.give2Title} subtitle={s.give2Body} />
            </li>
            <li>
              <RowCard
                href={routes.research(locale)}
                glyph={<ResearchIcon {...ROW_GLYPH} />}
                title={s.give3Title}
                subtitle={s.give3Body}
              />
            </li>
          </ul>
        </Section>

        <Section id="install" title={s.installTitle}>
          <InstallPicker showFreeTier={!viewer.plus} />
        </Section>

        {connections ? (
          <Section id="connections" title={s.connectionsTitle}>
            <Connections initial={connections} />
          </Section>
        ) : null}

        {example ? (
          <Section
            id="example"
            title={fill(
              s.exampleTitle,
              "name",
              exampleNiche ? (
                <span lang={exampleNiche.nameLang !== locale ? exampleNiche.nameLang : undefined}>{exampleNiche.name}</span>
              ) : (
                example.niche.name
              ),
            )}
          >
            <p className="ia-search-status">{format(s.exampleLead, { reviews: counted(locale, example.reviews, s.reviewsInWord) })}</p>
            <ul className="ia-set-box ia-set-box--flush">
              {example.pains.map((pain) => (
                <li key={pain.label} className="ia-set-row">
                  <span className="ia-set-row__title" lang={dataLang(locale)}>
                    {/* Topic labels are stored lowercase (they are tags elsewhere); here they read as lines. */}
                    {pain.label.charAt(0).toLocaleUpperCase(locale) + pain.label.slice(1)}
                  </span>
                  <span className="ia-set-row__trail ia-mcp-count">{counted(locale, pain.count, s.reviewsWord)}</span>
                </li>
              ))}
            </ul>
            <Link className="ia-rs-text-link" href={routes.reviewsNiche(locale, example.niche.slug)}>
              {s.exampleLink}
            </Link>
          </Section>
        ) : null}

        <Section id="prompts" title={s.promptsTitle}>
          <ul className="ia-set-box ia-set-box--flush">
            {[s.prompt1, s.prompt2, s.prompt3, s.prompt4, s.prompt5, s.prompt6].map((prompt) => (
              <li key={prompt} className="ia-set-row">
                <span className="ia-set-row__title">{prompt}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Server-rendered and always visible: the deploy smoke test greps `list_niche_themes`. */}
        <Section id="tools" title={format(s.toolsTitle, { tools: counted(locale, tools.length, s.toolsWord) })}>
          {toolGroups.map((g) => (
            <div key={g.name || "more"} className="ia-set-group">
              {g.name ? <h3 className="ia-set-group__title">{g.name}</h3> : null}
              <ul className="ia-set-box ia-set-box--flush">
                {g.tools.map((name) => (
                  <li key={name} className="ia-set-row ia-mcp-tool">
                    <code>{name}</code>
                    <span>{toolLine(name)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="ia-footnote">
            {format(s.toolsNote, {
              reviews: counted(locale, c.totals.reviews, s.reviewsGenWord),
              niches: counted(locale, c.totals.niches, s.inNichesWord),
            })}
          </p>
        </Section>

        <Section id="faq" title={s.faqTitle}>
          <div className="ia-mcp-faq">
            {faq.map((f) => (
              <div key={f.q} className="ia-mcp-faq__item">
                <h3 className="ia-subheading">{f.q}</h3>
                <p className="ia-mcp-faq__a">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </I18nProvider>
  );
}
