import type { ReactNode } from "react";
import type { Art, Placement, QuoteView, ResearchFile, ResearchObservation, UIFile } from "@/site/content/types";
import { MEDIA_SIZES_ARTICLE, mediaSrc, mediaSrcSet } from "@/site/content/media";
import { applyNbspPolicy, paragraphs, researchDescription } from "@/site/content/text";
import { IdeaCard } from "@/site/features/ideas/IdeaCard";
import type { Locale } from "@/site/i18n/locales";
import type { T } from "@/site/i18n/translate";
import { routes } from "@/site/routing";
import { QuoteIcon } from "@/site/ui";
import { cx } from "@/site/ui/cx";

// The full research article (spec 01 §5.4, §6; spec 04 §5.3), server-rendered from the
// pre-assembled ResearchFile. RENDER ONLY AFTER THE GATE: the caller loads the file only when
// canReadResearch(slug). Idea cards arrive pre-gated: readable ones with their card copy,
// paid ones as {slug, cover} only.

export type ArticleIdea =
  | { slug: string; locked: false; cover: Art; title: string; description: string; categoryName: string }
  | { slug: string; locked: true; cover: Art };

type Ctx = {
  locale: Locale;
  t: T;
  ideas: ReadonlyMap<string, ArticleIdea>;
};

function Text({ text, locale, lead, id }: { text: string; locale: Locale; lead?: boolean; id?: string }) {
  const list = paragraphs(text, locale);
  if (list.length === 0) return null;
  return (
    <div className={cx("ia-rs-text", lead && "ia-rs-text--lead")} id={id}>
      {list.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

/**
 * Artwork 3:2 r20 (ClarityResearchArtworkView). `bleed` = the hero cover: eager, 22 px outside
 * the text column at every width (ClarityReader.swift:159-162). `spaced` = the observation
 * image, the only one with 8 px above and below (ClarityReader.swift:276-277).
 */
export function Artwork({ art, bleed, eager, spaced }: { art: Art; bleed?: boolean; eager?: boolean; spaced?: boolean }) {
  const priority = eager ?? bleed;
  return (
    <figure className={cx("ia-rs-art", bleed && "ia-rs-art--cover", spaced && "ia-rs-art--spaced")}>
      {/* Pre-encoded WebP with srcset (public/media); next/image optimization is not used. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mediaSrc(art, 800)}
        srcSet={mediaSrcSet(art)}
        sizes={bleed ? "(min-width: 728px) 684px, 100vw" : MEDIA_SIZES_ARTICLE}
        width={art.width}
        height={art.height}
        alt={art.alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        decoding={priority ? undefined : "async"}
      />
    </figure>
  );
}

/**
 * Inline quote (ClarityInlineResearchQuote → ClarityQuoteBlock; spec 01 §6.8): the opening-quote
 * glyph and the locale's reading text only. The app receives the quoted app and its rating
 * but does not display them, and neither does the web (spec 09 §5 #28).
 */
function Quote({ quote }: { quote: QuoteView }) {
  return (
    <figure className="ia-rs-quote">
      {/* SF quote.opening, filled: lucide's Quote is the closing mark, turned 180° in CSS. */}
      <QuoteIcon size={13} strokeWidth={0} fill="currentColor" className="ia-rs-quote__glyph" aria-hidden="true" />
      <blockquote className="ia-rs-quote__text">
        <p>{applyNbspPolicy(quote.text)}</p>
      </blockquote>
    </figure>
  );
}

/** Idea cards, full width in one column: 18 apart in placements, 14 in «Другие идеи категории». */
function IdeaGrid({ slugs, ctx, remaining }: { slugs: string[]; ctx: Ctx; remaining?: boolean }) {
  const cards = slugs.map((slug) => ctx.ideas.get(slug)).filter((idea) => idea !== undefined);
  if (cards.length === 0) return null;
  return (
    <ul className={cx("ia-rs-ideas", remaining && "ia-rs-ideas--remaining")}>
      {cards.map((idea) => (
        <li key={idea.slug} id={`clarity-research-idea-${idea.slug}`}>
          {idea.locked ? (
            <IdeaCard
              locked
              slug={idea.slug}
              cover={idea.cover}
              paywallSource="research_article"
              lockedLabel={ctx.t("Идея в Plus")}
              hint={ctx.t("Подробности идеи доступны в Plus.")}
            />
          ) : (
            <IdeaCard
              locked={false}
              slug={idea.slug}
              href={routes.idea(ctx.locale, idea.slug)}
              cover={idea.cover}
              title={idea.title}
              description={idea.description}
              categoryName={idea.categoryName}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/** A direction placement: title only when it has no ideas; body; idea cards (max 3 in data). */
function PlacementView({ placement, ctx }: { placement: Placement; ctx: Ctx }) {
  return (
    <div className="ia-rs-placement" data-direction={placement.directionId}>
      {placement.ideas.length === 0 ? <h4 className="ia-rs-placement__title">{placement.title}</h4> : null}
      {placement.body ? <Text text={placement.body} locale={ctx.locale} /> : null}
      {placement.ideas.length > 0 ? <IdeaGrid slugs={placement.ideas} ctx={ctx} /> : null}
    </div>
  );
}

function ObservationView({ obs, ctx }: { obs: ResearchObservation; ctx: Ctx }) {
  const n = Math.max(obs.passages.length, obs.quotes.length);
  const flow = [];
  for (let i = 0; i < n; i++) {
    const passage = obs.passages[i];
    const quote = obs.quotes[i];
    if (passage) flow.push(<Text key={`p${i}`} text={passage} locale={ctx.locale} id={`clarity-research-passage-${obs.id}-${i}`} />);
    if (quote) flow.push(<Quote key={`q${i}`} quote={quote} />);
    // The observation artwork follows the first passage and the first quote.
    if (i === 0 && obs.art) flow.push(<Artwork key="art" art={obs.art} spaced />);
  }
  return (
    <div className="ia-rs-observation ia-rs-anchor" id={`observation-${obs.id}`}>
      <h3 className="ia-rs-observation__title" id={`clarity-research-observation-${obs.id}`}>
        {obs.title}
      </h3>
      {flow}
      {obs.placements.map((placement) => (
        <PlacementView key={placement.directionId} placement={placement} ctx={ctx} />
      ))}
    </div>
  );
}

/** ArticleSection. Not a named region: 7–8 per article would flood the landmark list (a11y m15). */
function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="ia-rs-section ia-rs-anchor" id={id}>
      <h2 className="ia-rs-section__title" id={`${id}-title`}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ResearchArticle({
  research,
  ui,
  locale,
  t,
  ideas,
}: {
  research: ResearchFile;
  ui: UIFile;
  locale: Locale;
  t: T;
  ideas: ReadonlyMap<string, ArticleIdea>;
}) {
  const ctx: Ctx = { locale, t, ideas };
  const description = researchDescription(applyNbspPolicy(research.summary), research.corpus, ui);
  return (
    <article className="ia-rs-article" aria-labelledby="clarity-research-title">
      <header className="ia-rs-hero">
        <h1 className="ia-rs-hero__title" id="clarity-research-title">
          {research.name}
        </h1>
        {description ? (
          <p className="ia-rs-hero__desc" id="clarity-research-description">
            {description}
          </p>
        ) : null}
      </header>

      <Artwork art={research.cover} bleed />

      <Section id="introduction" title={t("Главное")}>
        <Text text={research.lead || t("Полный текст этого разбора пока не добавлен.")} locale={locale} lead />
      </Section>

      {research.audiences.length > 0 ? (
        <Section id="audience" title={t("Какие задачи решают люди")}>
          {research.audiencesArt ? <Artwork art={research.audiencesArt} /> : null}
          <ul className="ia-rs-audiences">
            {research.audiences.map((audience, i) => (
              <li key={i} className="ia-rs-audience">
                <h3 className="ia-rs-audience__title">{audience.title}</h3>
                <Text text={audience.body} locale={locale} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {research.sections.map((section) => (
        <Section key={section.id} id={`theme-${section.id}`} title={section.title}>
          {section.intro ? <Text text={section.intro} locale={locale} /> : null}
          {section.art ? <Artwork art={section.art} /> : null}
          <div className="ia-rs-observations">
            {section.observations.map((obs) => (
              <ObservationView key={obs.id} obs={obs} ctx={ctx} />
            ))}
          </div>
        </Section>
      ))}

      {research.remainingDirections.length > 0 ? (
        <Section id="directions" title={t("Другие возможности")}>
          {research.remainingDirections.map((placement) => (
            <PlacementView key={placement.directionId} placement={placement} ctx={ctx} />
          ))}
        </Section>
      ) : null}

      {research.remainingIdeas.length > 0 ? (
        <Section id="ideas" title={t("Другие идеи категории")}>
          <IdeaGrid slugs={research.remainingIdeas} ctx={ctx} remaining />
        </Section>
      ) : null}

      {research.conclusion ? (
        <Section id="conclusion" title={research.conclusion.title}>
          <Text text={research.conclusion.body} locale={locale} id="clarity-research-conclusion-body" />
        </Section>
      ) : null}
    </article>
  );
}

/** Every idea slug the article shows (placements and remaining ideas), in order, de-duplicated. */
export function articleIdeaSlugs(research: ResearchFile): string[] {
  const out = new Set<string>();
  for (const section of research.sections)
    for (const obs of section.observations) for (const p of obs.placements) p.ideas.forEach((slug) => out.add(slug));
  for (const p of research.remainingDirections) p.ideas.forEach((slug) => out.add(slug));
  research.remainingIdeas.forEach((slug) => out.add(slug));
  return [...out];
}
