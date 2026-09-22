"use client";

import Link from "next/link";
import { memo, useId } from "react";
import type { Art } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { openPaywall } from "@/site/shell/actions";
import { LockBadge } from "@/site/ui";
import "./ideas.css";

// CONTRACT used by the ideas catalog and by idea placements inside research
// articles (the ideas feature owns and polishes it; keep the props stable — new props are
// optional). Locked cards carry ONLY {slug, cover} — no title, description or category —
// and open the paywall (spec 02 §2.6–2.7, spec 04 §7.6).
//
// Anatomy (ClarityIdeaCard.swift, spec 05 §3.6 D): surface card r24 + 0.7 pt hairline drawn
// OVER the art + soft shadow; art 3:2 r20 (alt="", the app hides it); unlocked text block:
// title Georgia 22, description Georgia 19 secondary, category footnote (the app always shows
// it, also inside research articles — pass `categoryName`). Locked: art + a filled lock disc
// 16 px from the bottom-right corner.
// Put several cards in <ul className="ia-grid ia-grid--ideas ia-ideas-grid"> to give a row one height.

/** Every idea cover follows one pattern (checked for 293 ideas × 5 locales): derive it from the slug. */
export function ideaCover(slug: string): Art {
  return { src: `ideas/${slug}`, alt: "", widths: [480, 800, 1200], width: 1200, height: 800 };
}

export type IdeaCardProps = (
  | {
      locked: false;
      slug: string;
      href: string;
      /** Defaults to ideaCover(slug). */
      cover?: Art;
      title: string;
      description: string;
      /** The category footnote. The app always renders it (ClarityIdeaCard.swift:46-54). */
      categoryName?: string;
      /** Accessible name, the app's L("%1$@. %2$@", title, description) (ClarityIdeaCard.swift:70). */
      label?: string;
      /** Render the title as a heading so screen readers can jump between cards. */
      titleAs?: "h2" | "h3" | "h4";
    }
  | {
      locked: true;
      slug: string;
      /** Defaults to ideaCover(slug). */
      cover?: Art;
      /** Analytics source for the paywall, e.g. "ideas_catalog" | "research_article". */
      paywallSource: string;
      /** Accessible label, e.g. t("Идея в Plus"). */
      lockedLabel: string;
    }
) & {
  /** Optional accessible hint: t("Открыть полную идею в отдельном окне.") / t("Подробности идеи доступны в Plus."). */
  hint?: string;
  /** Id of an element that already holds the hint (one shared node for a whole grid, instead of `hint`). */
  describedBy?: string;
  /** Load the art eagerly (the first cards above the fold); default lazy. */
  eager?: boolean;
};

function IdeaCardView(props: IdeaCardProps) {
  const hintId = useId();
  const hint = props.hint ? (
    <span id={hintId} hidden>
      {props.hint}
    </span>
  ) : null;
  const describedBy = props.describedBy ?? (hint ? hintId : undefined);
  const cover = props.cover ?? ideaCover(props.slug);
  const img = (
    // Pre-encoded webp with srcset (public/media); next/image optimization is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="ia-idea-card__art"
      src={mediaSrc(cover, 800)}
      srcSet={mediaSrcSet(cover)}
      sizes="(min-width: 1280px) 380px, (min-width: 760px) 50vw, 100vw"
      width={cover.width}
      height={cover.height}
      alt=""
      loading={props.eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
  if (props.locked) {
    return (
      <button
        type="button"
        className="ia-idea-card ia-idea-card--locked"
        aria-label={props.lockedLabel}
        aria-describedby={describedBy}
        aria-haspopup="dialog"
        data-idea={props.slug}
        onClick={() => openPaywall({ source: props.paywallSource })}
      >
        {img}
        <LockBadge variant="disc" />
        {hint}
      </button>
    );
  }
  const Title = props.titleAs ?? "span";
  return (
    // No prefetch: a grid holds up to 293 of these (the idea route has a loading boundary).
    <Link
      href={props.href}
      prefetch={false}
      className="ia-idea-card"
      aria-label={props.label}
      aria-describedby={describedBy}
      data-idea={props.slug}
    >
      {img}
      <div className="ia-idea-card__body">
        <Title className="ia-idea-card__title">{props.title}</Title>
        <span className="ia-idea-card__desc">{props.description}</span>
        {props.categoryName ? <span className="ia-idea-card__cat">{props.categoryName}</span> : null}
      </div>
      {hint}
    </Link>
  );
}

/** Memoized: the catalog re-filters up to 293 cards per keystroke. */
export const IdeaCard = memo(IdeaCardView);
