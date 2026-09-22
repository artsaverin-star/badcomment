import { Fragment, type ReactNode } from "react";
import type { Art, OnboardingArticle } from "@/site/content/types";
import { mediaSrc, mediaSrcSet } from "@/site/content/media";
import type { Locale } from "@/site/i18n/locales";
import { format } from "@/site/i18n/strings";
import { APP_STORE_URL } from "@/site/config";
import { AppStoreBadge } from "@/site/ui/AppStore";
import { cx } from "@/site/ui/cx";

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

/** Locale-correct quotation marks for the marketing page (spec 08 S1: ru/fr « », de „ “, en “ ”, ja 「」). */
export function quoted(text: string, locale: Locale): string {
  switch (locale) {
    case "ru":
      return `«${text}»`;
    case "fr":
      return `« ${text} »`;
    case "de":
      return `„${text}“`;
    case "ja":
      return `「${text}」`;
    default:
      return `“${text}”`;
  }
}

/** Pre-encoded WebP artwork from public/media (no next/image; widths already exist). */
export function MediaImg({
  art,
  sizes,
  width,
  alt = "",
  eager,
  className,
}: {
  art: Art;
  sizes: string;
  /** Preferred `src` width (fallback for browsers without srcset). */
  width?: number;
  alt?: string;
  eager?: boolean;
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
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={eager ? "high" : undefined}
    />
  );
}

/** Section frame with an anchor, heading id and the page gutters. */
export function Section({
  id,
  labelledBy,
  className,
  inner,
  children,
}: {
  id?: string;
  labelledBy?: string;
  className?: string;
  /** Extra class on the width container. */
  inner?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cx("ld-section", className)}>
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
 * The onboarding "paper pair" (spec 03 §1.5, 05 §3.6 P): an article card tilted −3° and a
 * taped quote card tilted +3°. Real text; the thumbnail is decorative. The app name of the
 * quoted review is never shown.
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
          <MediaImg art={article.art} width={480} sizes="120px" className="ld-paper__thumb" eager={eager} />
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

/**
 * A welcome illustration (transparent 1:1 art) on the accent-soft blob, as onboarding pages
 * draw them (spec 03 §1.4/§1.7). Decorative.
 */
export function Illustration({
  art,
  tilt = -24,
  className,
  children,
}: {
  art: Art | undefined;
  tilt?: number;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("ld-illo", className)} aria-hidden="true">
      <span className="ld-illo__blob" style={{ transform: `translate(-50%, -50%) rotate(${tilt}deg)` }} />
      {art ? <MediaImg art={art} width={800} sizes="(min-width: 1024px) 420px, 70vw" className="ld-illo__art" /> : null}
      {children}
    </div>
  );
}
