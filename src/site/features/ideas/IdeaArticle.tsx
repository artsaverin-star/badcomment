import Link from "next/link";
import type { IdeaBlockView, IdeaFile, QuoteView } from "@/site/content/types";
import { mediaSrc, mediaSrcSet, MEDIA_SIZES_ARTICLE } from "@/site/content/media";
import { applyNbspPolicy, paragraphs } from "@/site/content/text";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { QuoteIcon, StarIcon } from "@/site/ui";
import { ideasStrings } from "./strings";
import "./ideas.css";

// The idea article (spec 02 §3.4, spec 05 §3.6 M) — SERVER component, rendered only after
// the viewer passed canReadIdea (the page gates before loading the IdeaFile).
//   cover (web addition) → hero: title Georgia 30 + description Georgia 20 secondary →
//   category link (web addition) → blocks 24 apart: paragraph (reflowed), heading (title2),
//   quote (left rule; + the source app and its stars — site-only richness, DECISIONS §3),
//   idea inset (accent-soft card with a 3 px accent bar).

export function IdeaArticle({ locale, idea }: { locale: Locale; idea: IdeaFile }) {
  const s = ideasStrings[locale];
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- pre-encoded webp with srcset (public/media) */}
      <img
        className="ia-idea__cover"
        src={mediaSrc(idea.cover, 800)}
        srcSet={mediaSrcSet(idea.cover)}
        sizes={MEDIA_SIZES_ARTICLE}
        width={idea.cover.width}
        height={idea.cover.height}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
      <header className="ia-idea__hero">
        <h1 className="ia-idea__title">{applyNbspPolicy(idea.title)}</h1>
        <p className="ia-idea__lead">{applyNbspPolicy(idea.description)}</p>
        <Link
          href={routes.topic(locale, idea.category)}
          className="ia-idea__category"
          aria-label={`${s.categoryLabel}: ${idea.categoryName}`}
        >
          {idea.categoryName}
        </Link>
      </header>
      <div className="ia-idea__blocks">
        {idea.blocks.map((block) => (
          <Block key={block.id} block={block} locale={locale} />
        ))}
      </div>
    </>
  );
}

function Paragraphs({ text, locale }: { text: string; locale: Locale }) {
  const list = paragraphs(text, locale);
  if (list.length === 1) return <p className="ia-idea__p">{list[0]}</p>;
  return (
    <div className="ia-idea__paras">
      {list.map((p, i) => (
        <p key={i} className="ia-idea__p">
          {p}
        </p>
      ))}
    </div>
  );
}

function Block({ block, locale }: { block: IdeaBlockView; locale: Locale }) {
  switch (block.kind) {
    case "paragraph":
      return <Paragraphs text={block.text} locale={locale} />;
    case "heading":
      return (
        <h2 className="ia-idea__h2" id={block.id}>
          {applyNbspPolicy(block.text)}
        </h2>
      );
    case "idea":
      return (
        <section className="ia-idea__inset" aria-labelledby={`${block.id}-title`}>
          <h3 className="ia-idea__inset-title" id={`${block.id}-title`}>
            {applyNbspPolicy(block.title)}
          </h3>
          <Paragraphs text={block.text} locale={locale} />
        </section>
      );
    case "quote":
      return <Quote quote={block.quote} locale={locale} />;
  }
}

function Quote({ quote, locale }: { quote: QuoteView; locale: Locale }) {
  const s = ideasStrings[locale];
  const rating = Math.max(0, Math.min(5, Math.round(quote.rating)));
  return (
    <figure className="ia-idea__quote">
      <QuoteIcon size={13} className="ia-idea__quote-mark" aria-hidden="true" />
      <blockquote className="ia-idea__quote-text">{quote.text}</blockquote>
      {quote.app || rating ? (
        <figcaption className="ia-idea__quote-caption">
          {quote.app ? <span>{format(s.quoteSource, { app: quote.app })}</span> : null}
          {rating ? (
            <span className="ia-idea__stars" role="img" aria-label={format(s.quoteRating, { n: rating })}>
              {Array.from({ length: 5 }, (_, i) => (
                <StarIcon
                  key={i}
                  size={12}
                  className={i < rating ? undefined : "is-off"}
                  fill="currentColor"
                  strokeWidth={0}
                  aria-hidden="true"
                />
              ))}
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
