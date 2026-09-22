import { Fragment, type ReactNode } from "react";
import type { Art, OnboardingArticle } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import { APP_STORE_URL } from "@/site/config";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { cx } from "@/site/ui/cx";
import { StarIcon } from "@/site/ui/icons";

// Small server-safe building blocks of the landing (no client JS).

/** Fills {name} placeholders with plain values. */
export const fill = (template: string, vars: Record<string, string | number>) => format(template, vars);

/**
 * Fills {name} placeholders with React nodes (e.g. a bold number) — the word order stays the
 * locale's own ("{apps}アプリの{n}件の口コミ").
 */
export function rich(template: string, vars: Record<string, ReactNode>): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  template.replace(/\{(\w+)\}/g, (m, key: string, at: number) => {
    if (at > last) out.push(template.slice(last, at));
    out.push(<Fragment key={`${key}-${at}`}>{key in vars ? vars[key] : m}</Fragment>);
    last = at + m.length;
    return m;
  });
  if (last < template.length) out.push(template.slice(last));
  return out;
}

/**
 * Locale-correct quotation marks for the marketing page (spec 08 S1: ru/fr « », de „ “, en “ ”,
 * ja 「」). French keeps the no-break spaces inside the guillemets, like the app's ui.fr.json.
 */
export function quoted(text: string, locale: Locale): string {
  switch (locale) {
    case "ru":
      return `«${text}»`;
    case "fr":
      return `«\u00a0${text}\u00a0»`;
    case "de":
      return `„${text}“`;
    case "ja":
      return `「${text}」`;
    default:
      return `“${text}”`;
  }
}

/** "Label: value" with the locale's punctuation (fr «label : value», ja «label：value»). */
export function labelValue(locale: Locale, label: string, value: string): string {
  if (locale === "fr") return `${label}\u00a0: ${value}`;
  if (locale === "ja") return `${label}：${value}`;
  return `${label}: ${value}`;
}

/** Pre-encoded WebP artwork from public/media (no next/image; widths already exist). */
export function MediaImg({
  art,
  sizes,
  width,
  alt = "",
  eager,
  priority,
  className,
}: {
  art: Art;
  sizes: string;
  /** Preferred `src` width (fallback for browsers without srcset). */
  width?: number;
  alt?: string;
  /** Above the fold: load without waiting for layout. */
  eager?: boolean;
  /** The likely LCP image: eager and high fetch priority. */
  priority?: boolean;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP variants with srcset
    <img
      className={className}
      src={mediaSrc(art, width ?? 800)}
      srcSet={mediaSrcSet(art)}
      sizes={sizes}
      width={art.width}
      height={art.height}
      alt={alt}
      loading={eager || priority ? "eager" : "lazy"}
      decoding={priority ? undefined : "async"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}

/**
 * Section frame with an anchor and the page gutters. Not a named landmark: the headings give
 * the structure, and 13 regions would drown the landmark list (a11y review m15). Only the hero
 * (S1) and the final call (S12) are named regions.
 */
export function Section({
  id,
  className,
  inner,
  children,
}: {
  id?: string;
  className?: string;
  /** Extra class on the width container. */
  inner?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cx("ld-section", className)}>
      <div className={cx("ld-wrap", inner)}>{children}</div>
    </section>
  );
}

/** App Store badge + the "in review" caption while the store link is empty (DECISIONS §13). */
export function StoreBadge({ soon, size = "lg", className }: { soon: string; size?: "md" | "lg"; className?: string }) {
  return (
    <span className={cx("ld-store", className)} data-ld-event="landing_cta_appstore">
      <AppStoreBadge size={size} />
      {APP_STORE_URL ? null : <span className="ld-store__soon">{soon}</span>}
    </span>
  );
}

/**
 * The onboarding "paper pair" (spec 03 §1.5, 05 §3.6 P; ClarityWelcomeContentPreview.swift:45-114):
 * an article paper tilted −3° and a taped quote paper tilted +3°, in the replay's metrics
 * (Onest throughout). Real text; the thumbnail is decorative. The app name of the quoted review
 * is never shown.
 */
export function PaperPair({
  article,
  locale,
  quoteLabel,
  ratingLabel,
  eager,
  className,
}: {
  article: OnboardingArticle;
  locale: Locale;
  quoteLabel: string;
  ratingLabel: string;
  eager?: boolean;
  className?: string;
}) {
  return (
    <div className={cx("ld-papers", className)}>
      <div className="ld-paper ld-paper--article">
        <div className="ld-paper__top">
          <div className="ld-paper__head">
            <span className="ld-paper__label">{article.label}</span>
            <span className="ld-paper__title">{article.observationTitle}</span>
          </div>
          <MediaImg art={article.art} width={480} sizes="103px" className="ld-paper__thumb" eager={eager} />
        </div>
        <p className="ld-paper__excerpt">{article.excerpt}</p>
      </div>
      {article.quote ? (
        <div className="ld-paper ld-paper--quote">
          <span className="ld-paper__tape" aria-hidden="true" />
          <div className="ld-paper__quote-head">
            <span>{quoteLabel}</span>
            <span aria-label={fill(ratingLabel, { n: article.quote.rating })} role="img">
              {article.quote.rating} ★
            </span>
          </div>
          <p className="ld-paper__quote">{quoted(article.quote.excerpt, locale)}</p>
        </div>
      ) : null}
    </div>
  );
}

// Positions and resting angles of the replay's mini review cards (ClarityWelcomeIllustration.swift:74-93).
const MINI_CARDS = [
  { left: "15%", top: "18%", rotate: "-13deg" },
  { left: "48%", top: "9%", rotate: "4deg" },
  { left: "87%", top: "35%", rotate: "12deg" },
] as const;

/** 1 × 1 transparent GIF: the <img> fallback when only the desktop <source> should load. */
const EMPTY_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * A welcome illustration (transparent 1:1 art on the accent-soft blob) in the replay's geometry
 * (ClarityWelcomeIllustration.swift:45-63): "reviews" = blob at (47 %, 47 %) −24°, art 96 % at
 * (50 %, 46 %), optionally with the three mini review cards; "library" = blob at (57 %, 47 %)
 * +26°, art 86 % at (51 %, 49 %). Decorative. `priority`: the art is shown only ≥ 1024 px and is
 * the desktop LCP image — a <picture> source loads it eagerly there and nothing on phones.
 */
export function Illustration({
  art,
  variant = "reviews",
  cards,
  priority,
  className,
  children,
}: {
  art: Art | undefined;
  variant?: "reviews" | "library";
  cards?: boolean;
  priority?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("ld-illo", `ld-illo--${variant}`, className)} aria-hidden="true">
      <span className="ld-illo__blob" />
      {art ? (
        priority ? (
          <picture>
            <source media="(min-width: 1024px)" srcSet={mediaSrcSet(art)} sizes="420px" />
            <img className="ld-illo__art" src={EMPTY_GIF} alt="" width={art.width} height={art.height} fetchPriority="high" />
          </picture>
        ) : (
          <MediaImg art={art} width={800} sizes="(min-width: 1024px) 420px, 70vw" className="ld-illo__art" />
        )
      ) : null}
      {cards
        ? MINI_CARDS.map((c, i) => (
            <span key={i} className="ld-mini" style={{ left: c.left, top: c.top, rotate: c.rotate }}>
              <span className="ld-mini__stars">
                {[0, 1, 2, 3].map((k) => (
                  <StarIcon key={k} size={6} fill="currentColor" strokeWidth={0} />
                ))}
              </span>
              <span className="ld-mini__line" />
              <span className="ld-mini__line ld-mini__line--short" />
            </span>
          ))
        : null}
      {children}
    </div>
  );
}
