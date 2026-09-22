"use client";

import Link from "next/link";
import { useId } from "react";
import type { Art } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { openPaywall } from "@/site/shell/actions";
import { LockBadge } from "@/site/ui";
import "./ideas.css";

// CONTRACT used by the ideas catalog and by idea placements inside research
// articles (the ideas feature owns and polishes it; keep the props stable).
// Locked cards carry ONLY {slug, cover} — no title, description or category —
// and open the paywall (spec 02 §2.6–2.7, spec 04 §7.6).
//
// Anatomy (spec 05 §3.6 D): surface card r24 + hairline + soft shadow; art 3:2 r20 (alt="",
// the app hides it); unlocked text block: title Georgia 22, description Georgia 19 secondary,
// category footnote. Locked: art + a filled lock disc 16 px from the bottom-right corner.
// Put several cards in <ul className="ia-grid ia-ideas-grid"> to give a row one height.

export type IdeaCardProps = (
  | {
      locked: false;
      slug: string;
      href: string;
      cover: Art;
      title: string;
      description: string;
      /** Shown under the description in catalogs; omitted inside the idea's own category article. */
      categoryName?: string;
    }
  | {
      locked: true;
      slug: string;
      cover: Art;
      /** Analytics source for the paywall, e.g. "ideas_catalog" | "research_article". */
      paywallSource: string;
      /** Accessible label, e.g. t("Идея в Plus"). */
      lockedLabel: string;
    }
) & {
  /** Optional accessible hint: t("Открыть полную идею в отдельном окне.") / t("Подробности идеи доступны в Plus."). */
  hint?: string;
  /** Load the art eagerly (the first cards above the fold); default lazy. */
  eager?: boolean;
};

export function IdeaCard(props: IdeaCardProps) {
  const hintId = useId();
  const hint = props.hint ? (
    <span id={hintId} hidden>
      {props.hint}
    </span>
  ) : null;
  const img = (
    // Pre-encoded webp with srcset (public/media); next/image optimization is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="ia-idea-card__art"
      src={mediaSrc(props.cover, 800)}
      srcSet={mediaSrcSet(props.cover)}
      sizes="(min-width: 1280px) 380px, (min-width: 760px) 50vw, 100vw"
      width={props.cover.width}
      height={props.cover.height}
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
        aria-describedby={hint ? hintId : undefined}
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
  return (
    <Link href={props.href} className="ia-idea-card" aria-describedby={hint ? hintId : undefined} data-idea={props.slug}>
      {img}
      <span className="ia-idea-card__body">
        <span className="ia-idea-card__title">{props.title}</span>
        <span className="ia-idea-card__desc">{props.description}</span>
        {props.categoryName ? <span className="ia-idea-card__cat">{props.categoryName}</span> : null}
      </span>
      {hint}
    </Link>
  );
}
