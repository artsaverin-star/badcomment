"use client";

import Link from "next/link";
import type { Art } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import { openPaywall } from "@/site/shell/actions";
import { LockBadge } from "@/site/ui";

// CONTRACT used by the ideas catalog and by idea placements inside research
// articles (the ideas feature owns and polishes it; keep the props stable).
// Locked cards carry ONLY {slug, cover} — no title, description or category —
// and open the paywall (spec 02 §2.6–2.7, spec 04 §7.6).

export type IdeaCardProps =
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
    };

export function IdeaCard(props: IdeaCardProps) {
  const img = (
    // Pre-encoded webp with srcset (public/media); next/image optimization is not used.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="ia-idea-card__art"
      src={mediaSrc(props.cover, 800)}
      srcSet={mediaSrcSet(props.cover)}
      sizes="(min-width: 1280px) 380px, (min-width: 760px) 50vw, 100vw"
      alt=""
      loading="lazy"
      decoding="async"
    />
  );
  if (props.locked) {
    return (
      <button
        type="button"
        className="ia-idea-card ia-idea-card--locked"
        aria-label={props.lockedLabel}
        onClick={() => openPaywall({ source: props.paywallSource })}
      >
        {img}
        <LockBadge />
      </button>
    );
  }
  return (
    <Link href={props.href} className="ia-idea-card">
      {img}
      <span className="ia-idea-card__body">
        <span className="ia-idea-card__title">{props.title}</span>
        <span className="ia-idea-card__desc">{props.description}</span>
        {props.categoryName ? <span className="ia-idea-card__cat">{props.categoryName}</span> : null}
      </span>
    </Link>
  );
}
