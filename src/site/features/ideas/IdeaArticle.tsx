import type { IdeaBlockView, IdeaFile, QuoteView } from "@/site/content/types";
import { MEDIA_SIZES_ARTICLE, mediaSrc, mediaSrcSet } from "@/site/content/media";
import { paragraphs } from "@/site/content/text";
import type { Locale } from "@/site/i18n/locales";
import { QuoteOpeningIcon } from "@/site/ui/icons";
import "./ideas.css";

// The idea article (spec 02 §3.4, spec 05 §3.6 M) — SERVER component, rendered only after
// the viewer passed canReadIdea (the page gates before loading the IdeaFile).
// ClarityIdeaContentView (ClarityReader.swift:488-492): hero (title Georgia 30 + description
// Georgia 20 secondary, 18 apart) → blocks 24 apart: paragraph (reflowed), heading (title2),
// quote (left rule; glyph + text only — the app never shows the app name or rating,
// ClarityReader.swift:858-876, spec 09 §5 #28), idea inset (accent-soft card, 3 px accent bar).
// The idea's existing cover follows the title and lead in the unlocked reader.
// NBSPs: only paragraphs drop them (ClarityArticleText → ClarityReading.paragraphs); titles,
// the lead, headings and inset titles render the raw string (ClarityReader.swift:619,637,735,739).

export function IdeaArticle({ locale, idea }: { locale: Locale; idea: IdeaFile }) {
  return (
    <>
      <header className="ia-idea__hero">
        <h1 className="ia-idea__title">{idea.title}</h1>
        <p className="ia-idea__lead">{idea.description}</p>
      </header>
      {/* Pre-encoded WebP variants already exist in public/media. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="ia-idea__cover"
        src={mediaSrc(idea.cover, 800)}
        srcSet={mediaSrcSet(idea.cover)}
        sizes={MEDIA_SIZES_ARTICLE}
        width={idea.cover.width}
        height={idea.cover.height}
        alt={idea.cover.alt}
        loading="eager"
        fetchPriority="high"
      />
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
          {block.text}
        </h2>
      );
    case "idea":
      return (
        <section className="ia-idea__inset">
          <h3 className="ia-idea__inset-title">{block.title}</h3>
          <Paragraphs text={block.text} locale={locale} />
        </section>
      );
    case "quote":
      return <Quote quote={block.quote} />;
  }
}

function Quote({ quote }: { quote: QuoteView }) {
  return (
    <figure className="ia-idea__quote">
      <QuoteOpeningIcon className="ia-idea__quote-mark" />
      <blockquote className="ia-idea__quote-text">{quote.text}</blockquote>
    </figure>
  );
}
