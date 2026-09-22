"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useLocale, useT } from "@/site/i18n/client";
import { format } from "@/site/i18n/strings";
import { routes } from "@/site/routing";
import { canGoBackInApp } from "@/site/shell/navigation";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "@/site/ui/icons";
import type { PlusOfferData } from "../plus/offer";
import { PlusOffer } from "../plus/PlusOffer";
import "./welcome.css";

// The onboarding replay (spec 03 §1, spec 09 §2.6): 4 story pages + the Plus page 5, in the
// app's replay mode — «Закрыть» instead of «Пропустить», and every exit returns to where the
// reader came from (history back inside the site, else the research catalog). Navigation:
// «Дальше» / back circle, ← → keys, Esc, and a horizontal swipe outside the carousels.
// Layout as ClarityOnboarding.swift:49-104: nav bar, a scrolling stage with the page centred,
// and the footer pinned below it. Page 5 IS the paywall (ClarityOnboarding.swift:29-33): the
// same PlusOffer as /plus and the sheet, under this nav bar, its footer in the pinned footer.
// prefers-reduced-motion: no entrances, no ambient loops, no carousel autoplay.

export type WelcomeImage = { src: string; srcSet: string };

export type WelcomeData = {
  art: { reviews: WelcomeImage | null; library: WelcomeImage | null };
  articles: Array<{ key: string; label: string; title: string; excerpt: string; image: WelcomeImage | null; quote: { text: string; rating: number } | null }>;
  ideas: Array<{ slug: string; title: string; description: string; image: WelcomeImage | null }>;
  /** The web offer of page 5 (price label, free-topic link). */
  offer: PlusOfferData;
};

/** Web-only labels (the app has no carousel controls; WCAG 2.2.2 needs a pause). */
export type WelcomeLabels = {
  /** «Остановить прокрутку» */
  pause: string;
  /** «Запустить прокрутку» */
  play: string;
  /** «Оценка: {n} из 5» — the quote's rating for screen readers. */
  rating: string;
};

const STEPS = 5;
const PLUS_STEP = STEPS - 1;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

function Img({
  image,
  className,
  sizes,
  width,
  height,
  style,
  priority,
}: {
  image: WelcomeImage | null;
  className?: string;
  sizes: string;
  width: number;
  height: number;
  style?: CSSProperties;
  /** The first page's art is the largest element above the fold. */
  priority?: boolean;
}) {
  if (!image) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- pre-encoded WebP widths (public/media)
    <img
      className={className}
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={width}
      height={height}
      alt=""
      decoding={priority ? undefined : "async"}
      fetchPriority={priority ? "high" : undefined}
      style={style}
    />
  );
}

/**
 * Paged scroller with autoplay (spec 03 §1.5, ClarityWelcomeCarousel.swift): the first slide is
 * repeated at the end, so the cycle wraps forward and snaps back to the real first slide
 * without rewinding; the timer is re-armed after every page change, so a manual swipe gets a
 * full interval. Pauses on hover, focus, touch and a hidden tab; the web adds a pause toggle
 * (WCAG 2.2.2 — a11y review M7). Keyboard: the track is a focusable scroll region.
 */
function Carousel({
  label,
  intervalMs,
  count,
  reduced,
  labels,
  render,
}: {
  label: string;
  intervalMs: number;
  count: number;
  reduced: boolean;
  labels: WelcomeLabels;
  render: (index: number, active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [hold, setHold] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [wake, setWake] = useState(0);
  const loop = count > 1;
  const slots = loop ? count + 1 : count;
  const running = !reduced && loop && !userPaused && !hold;

  // Track the visible slide (swipe, keys, autoplay alike); landing on the copy of slide 1
  // jumps back to the real one without animation once the scroll has settled.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    let settle = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const slot = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setIndex(loop && slot >= count ? 0 : Math.min(count - 1, Math.max(0, slot)));
      });
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const w = Math.max(1, el.clientWidth);
        if (loop && Math.round(el.scrollLeft / w) >= count) el.scrollTo({ left: 0, behavior: "auto" });
      }, 140);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      el.removeEventListener("scroll", onScroll);
    };
  }, [count, loop]);

  useEffect(() => {
    if (!running) return;
    const el = ref.current;
    if (!el) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setWake((n) => n + 1); // try again with a fresh interval
        return;
      }
      const w = Math.max(1, el.clientWidth);
      const slot = Math.round(el.scrollLeft / w);
      el.scrollTo({ left: (slot + 1) * w, behavior: "smooth" });
    }, intervalMs);
    return () => window.clearTimeout(timer);
  }, [running, index, wake, intervalMs]);

  const holdOn = () => setHold(true);
  const holdOff = () => setHold(false);

  return (
    <div className="ia-wel-carousel-wrap">
      <div
        ref={ref}
        className="ia-wel-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        aria-live={running ? "off" : "polite"}
        tabIndex={0}
        data-carousel=""
        onPointerEnter={holdOn}
        onPointerLeave={holdOff}
        onPointerDown={holdOn}
        onFocus={holdOn}
        onBlur={holdOff}
      >
        {Array.from({ length: slots }, (_, slot) => {
          const i = slot % count;
          const clone = slot >= count;
          return (
            <div
              key={slot}
              className="ia-wel-slide"
              role={clone ? undefined : "group"}
              aria-roledescription={clone ? undefined : "slide"}
              aria-label={clone ? undefined : `${i + 1} / ${count}`}
              aria-hidden={clone || undefined}
              inert={clone || undefined}
              // Both copies of slide 1 share their entrance, so the wrap never restarts it.
              data-active={i === index ? "" : undefined}
            >
              {render(i, i === index)}
            </div>
          );
        })}
      </div>
      {loop && !reduced ? (
        <button type="button" className="ia-wel-autoplay" onClick={() => setUserPaused((p) => !p)}>
          {userPaused ? labels.play : labels.pause}
        </button>
      ) : null}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="ia-wel-mini__stars">
      {Array.from({ length: n }, (_, i) => (
        <StarIcon key={i} size={6} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

// Positions, resting angles and seeds of ClarityWelcomeIllustration.swift:74-131.
const MINI_CARDS: Array<{ left: string; top: string; rotate: string; delay: number }> = [
  { left: "15%", top: "18%", rotate: "-13deg", delay: 290 },
  { left: "48%", top: "9%", rotate: "4deg", delay: 420 },
  { left: "87%", top: "35%", rotate: "12deg", delay: 550 },
];

const CHIPS: Array<{ key: string; left: string; top: string; rotate: string; delay: number; from: string }> = [
  { key: "Интерьер", left: "19%", top: "15%", rotate: "-8deg", delay: 290, from: "-27deg" },
  { key: "Привычки", left: "82%", top: "43%", rotate: "5deg", delay: 450, from: "27deg" },
  { key: "Личные финансы", left: "29%", top: "85%", rotate: "-4deg", delay: 610, from: "-27deg" },
];

export function WelcomeFlow({ data, labels }: { data: WelcomeData; labels: WelcomeLabels }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [footerSlot, setFooterSlot] = useState<HTMLDivElement | null>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);

  const close = useCallback(() => {
    if (canGoBackInApp()) router.back();
    else router.push(routes.research(locale));
  }, [router, locale]);

  const go = useCallback(
    (delta: 1 | -1) => {
      const next = Math.min(STEPS - 1, Math.max(0, step + delta));
      if (next === step) return;
      setDir(delta);
      setStep(next);
    },
    [step],
  );

  // Each page starts at the top of the stage, and focus moves to its title so screen readers
  // announce it (not on first render).
  const mounted = useRef(false);
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0, behavior: "auto" });
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    titleRef.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [data-carousel], dialog")) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") {
        if (document.querySelector("dialog[open]")) return;
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    if ((e.target as HTMLElement).closest("[data-carousel], button, a")) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start || start.id !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  };

  const pages = [
    {
      id: "onboarding-welcome",
      title: t("1,4 млн отзывов"),
      titleLabel: t("1 451 072 отзыва"),
      desc: t("Изучили отзывы о 4 623 приложениях: что раздражает людей и чего им не хватает."),
    },
    { id: "onboarding-value", title: t("Разборы отзывов"), desc: t("В каждом разборе — выводы и отзывы, на которых они основаны.") },
    {
      id: "onboarding-library",
      title: t("Идеи приложений"),
      desc: t("Кому пригодится приложение, какую задачу оно решит и как им будут пользоваться."),
    },
    { id: "onboarding-updates", title: t("Новые выпуски"), desc: t("С обновлениями приложения регулярно добавляем новые темы, разборы и идеи.") },
  ];
  const isPlus = step === PLUS_STEP;
  const page = pages[Math.min(step, pages.length - 1)];
  const ideaPages: Array<WelcomeData["ideas"]> = [];
  for (let i = 0; i < data.ideas.length; i += 2) ideaPages.push(data.ideas.slice(i, i + 2));

  const visual = (() => {
    switch (step) {
      case 0:
        return (
          <div className="ia-wel-ill ia-wel-ill--reviews" aria-hidden="true">
            <span className="ia-wel-ill__blob" />
            <Img image={data.art.reviews} className="ia-wel-ill__art" sizes="340px" width={340} height={340} priority />
            {MINI_CARDS.map((c, i) => (
              <span
                key={i}
                className="ia-wel-mini"
                style={{ left: c.left, top: c.top, rotate: c.rotate, animationDelay: `${c.delay}ms, ${c.delay + 1300}ms` }}
              >
                <Stars n={4} />
                <span className="ia-wel-mini__line" />
                <span className="ia-wel-mini__line ia-wel-mini__line--short" />
              </span>
            ))}
          </div>
        );
      case 1:
        return (
          <Carousel
            label={t("Разборы отзывов")}
            intervalMs={7000}
            count={data.articles.length}
            reduced={reduced}
            labels={labels}
            render={(i) => {
              const a = data.articles[i];
              return (
                <div>
                  <div className="ia-wel-paper">
                    <div className="ia-wel-paper__top">
                      <div>
                        <span className="ia-wel-paper__label">{a.label}</span>
                        <p className="ia-wel-paper__title">{a.title}</p>
                      </div>
                      <Img image={a.image} className="ia-wel-paper__art" sizes="103px" width={103} height={80} />
                    </div>
                    <p className="ia-wel-paper__text">{a.excerpt}</p>
                  </div>
                  {a.quote ? (
                    <div className="ia-wel-quote">
                      <div className="ia-wel-quote__head">
                        <span>{t("Из отзыва пользователя")}</span>
                        <b role="img" aria-label={format(labels.rating, { n: a.quote.rating })}>
                          {a.quote.rating} ★
                        </b>
                      </div>
                      <p className="ia-wel-quote__text">«{a.quote.text}»</p>
                    </div>
                  ) : null}
                </div>
              );
            }}
          />
        );
      case 2:
        return (
          <Carousel
            label={t("Идеи приложений")}
            intervalMs={6000}
            count={ideaPages.length}
            reduced={reduced}
            labels={labels}
            render={(i) => (
              <div className="ia-wel-ideas">
                {ideaPages[i].map((idea) => (
                  <div key={idea.slug} className="ia-wel-idea">
                    <Img image={idea.image} sizes="(max-width: 440px) 50vw, 200px" width={300} height={200} />
                    <div className="ia-wel-idea__body">
                      <p className="ia-wel-idea__title">{idea.title}</p>
                      <p className="ia-wel-idea__text">{idea.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          />
        );
      default:
        return (
          <div className="ia-wel-ill ia-wel-ill--library" role="img" aria-label={t("Разборы и идеи: интерьер, привычки, личные финансы")}>
            <span className="ia-wel-ill__blob" aria-hidden="true" />
            <Img image={data.art.library} className="ia-wel-ill__art" sizes="310px" width={310} height={310} />
            {CHIPS.map((c) => (
              <span
                key={c.key}
                className="ia-wel-chip"
                aria-hidden="true"
                style={
                  {
                    left: c.left,
                    top: c.top,
                    rotate: c.rotate,
                    "--ia-wel-from": c.from,
                    animationDelay: `${c.delay}ms, ${c.delay + 1300}ms`,
                  } as CSSProperties
                }
              >
                {t(c.key)}
              </span>
            ))}
          </div>
        );
    }
  })();

  return (
    <div
      className="ia-wel"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        swipe.current = null;
      }}
    >
      <div className="ia-wel-nav">
        <button
          type="button"
          className="ia-wel-back"
          onClick={() => go(-1)}
          aria-label={t("Назад")}
          aria-hidden={step === 0 || undefined}
          tabIndex={step === 0 ? -1 : undefined}
          data-hidden={step === 0 ? "" : undefined}
          disabled={step === 0}
          data-testid="onboarding-back"
        >
          <ChevronLeftIcon size={17} strokeWidth={2.2} aria-hidden="true" />
        </button>
        <div className="ia-wel-dots" role="img" aria-label={t("Шаг %1$@ из %2$@", [step + 1, STEPS])}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className="ia-wel-dot" data-active={i === step ? "" : undefined} />
          ))}
        </div>
        <button type="button" className="ia-wel-close" onClick={close} data-testid="onboarding-skip">
          {t("Закрыть")}
        </button>
      </div>

      <div ref={stageRef} className="ia-wel-stage" data-plus={isPlus ? "" : undefined}>
        {isPlus ? (
          <div key={step} className="ia-wel-step" data-dir={dir === 0 ? undefined : String(dir)} data-testid="paywall-heading">
            <PlusOffer
              offer={data.offer}
              source="welcome"
              variant="welcome"
              onClose={close}
              footerTarget={footerSlot}
              titleRef={titleRef}
            />
          </div>
        ) : (
          <div key={step} className="ia-wel-step" data-dir={dir === 0 ? undefined : String(dir)} data-testid={page.id}>
            <div className="ia-wel-visual">{visual}</div>
            <div className="ia-wel-copy">
              <h1
                ref={titleRef}
                tabIndex={-1}
                className="ia-wel-title"
                data-first={step === 0 ? "" : undefined}
                aria-label={page.titleLabel}
              >
                {page.title}
              </h1>
              <p className="ia-wel-desc">{page.desc}</p>
            </div>
          </div>
        )}
      </div>

      <div className="ia-wel-footer">
        {!isPlus ? (
          <>
            <button type="button" className="ia-btn ia-btn--welcome" onClick={() => go(1)} data-testid="onboarding-continue">
              {t("Дальше")}
              <ChevronRightIcon size={13} strokeWidth={2.4} aria-hidden="true" />
            </button>
            {/* Reserved row: keeps the button at the same height as on the Plus page. */}
            <span className="ia-wel-secondary" aria-hidden="true">
              {t("Остаться с бесплатным разбором")}
            </span>
          </>
        ) : null}
        {/* Page 5: PlusOffer renders its disclosure, capsule and secondary row here. */}
        <div ref={setFooterSlot} className="ia-wel-footer__slot" />
      </div>
    </div>
  );
}
