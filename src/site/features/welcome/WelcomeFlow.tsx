"use client";

import Link from "next/link";
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
import { routes } from "@/site/routing";
import { openPaywall } from "@/site/shell/actions";
import { canGoBackInApp } from "@/site/shell/navigation";
import { useViewer } from "@/site/shell/ViewerContext";
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from "@/site/ui/icons";
import "./welcome.css";

// The onboarding replay (spec 03 §1, spec 09 §2.6): 4 story pages + the Plus page 5, in the
// app's replay mode — «Закрыть» instead of «Пропустить», and every exit returns to where the
// reader came from (history back inside the site, else the research catalog). Navigation:
// «Дальше» / back circle, ← → keys, Esc, and a horizontal swipe outside the carousels.
// prefers-reduced-motion: no entrances, no ambient loops, no carousel autoplay.

export type WelcomeImage = { src: string; srcSet: string };

export type WelcomeData = {
  art: { reviews: WelcomeImage | null; library: WelcomeImage | null; research: WelcomeImage | null; product: WelcomeImage | null };
  articles: Array<{ key: string; label: string; title: string; excerpt: string; image: WelcomeImage | null; quote: { text: string; rating: number } | null }>;
  ideas: Array<{ slug: string; title: string; description: string; image: WelcomeImage | null }>;
};


const STEPS = 5;
const FREE_TOPIC = "interior-design";

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

function Img({ image, className, sizes, width, height, style }: { image: WelcomeImage | null; className?: string; sizes: string; width: number; height: number; style?: CSSProperties }) {
  if (!image) return null;
  // eslint-disable-next-line @next/next/no-img-element -- pre-encoded WebP widths (public/media)
  return <img className={className} src={image.src} srcSet={image.srcSet} sizes={sizes} width={width} height={height} alt="" decoding="async" style={style} />;
}

/** Paged scroller with autoplay (spec 03 §1.5): pauses on hover, focus, pointer and hidden tab. */
function Carousel({
  label,
  intervalMs,
  count,
  reduced,
  render,
}: {
  label: string;
  intervalMs: number;
  count: number;
  reduced: boolean;
  render: (index: number, active: boolean) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const paused = useRef(false);

  // Track the visible slide from the scroll position (swipe, keys, autoplay alike).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
        setIndex(Math.min(count - 1, Math.max(0, i)));
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, [count]);

  useEffect(() => {
    if (reduced || count < 2) return;
    const el = ref.current;
    if (!el) return;
    const timer = window.setInterval(() => {
      if (paused.current || document.hidden) return;
      const next = (Math.round(el.scrollLeft / Math.max(1, el.clientWidth)) + 1) % count;
      el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [reduced, count, intervalMs]);

  const onPause = () => {
    paused.current = true;
  };
  const onResume = () => {
    paused.current = false;
  };

  return (
    <div
      ref={ref}
      className="ia-wel-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      data-carousel=""
      onPointerEnter={onPause}
      onPointerLeave={onResume}
      onPointerDown={onPause}
      onFocus={onPause}
      onBlur={onResume}
    >
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="ia-wel-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} / ${count}`}
          data-active={i === index ? "" : undefined}
        >
          {render(i, i === index)}
        </div>
      ))}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="ia-wel-mini__stars">
      {Array.from({ length: n }, (_, i) => (
        <StarIcon key={i} size={7} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

const MINI_CARDS: Array<{ left: string; top: string; rotate: string; delay: number }> = [
  { left: "15%", top: "18%", rotate: "-13deg", delay: 290 },
  { left: "48%", top: "9%", rotate: "4deg", delay: 420 },
  { left: "87%", top: "35%", rotate: "12deg", delay: 550 },
];

const CHIPS: Array<{ key: string; left: string; top: string; rotate: string; delay: number }> = [
  { key: "Интерьер", left: "19%", top: "15%", rotate: "-8deg", delay: 290 },
  { key: "Привычки", left: "82%", top: "43%", rotate: "5deg", delay: 450 },
  { key: "Личные финансы", left: "29%", top: "85%", rotate: "-4deg", delay: 610 },
];

export function WelcomeFlow({ data }: { data: WelcomeData }) {
  const t = useT();
  const locale = useLocale();
  const viewer = useViewer();
  const router = useRouter();
  const reduced = usePrefersReducedMotion();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<1 | -1 | 0>(0);
  const titleRef = useRef<HTMLHeadingElement>(null);
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

  // Move focus to the new page's title so screen readers announce it (not on first render).
  const mounted = useRef(false);
  useEffect(() => {
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

  const unlocked = viewer.plus;
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
    {
      id: "paywall-heading",
      title: unlocked ? t("Доступ открыт") : t("Полный доступ"),
      desc: t("Все разборы и идеи, новые выпуски и экспорт материалов."),
    },
  ];
  const page = pages[step];
  const ideaPages: Array<WelcomeData["ideas"]> = [];
  for (let i = 0; i < data.ideas.length; i += 2) ideaPages.push(data.ideas.slice(i, i + 2));

  const visual = (() => {
    switch (step) {
      case 0:
        return (
          <div className="ia-wel-ill ia-wel-ill--reviews" aria-hidden="true">
            <span className="ia-wel-ill__blob" />
            <div className={reduced ? undefined : "ia-wel-float"} style={{ position: "absolute", inset: 0 }}>
              <Img image={data.art.reviews} className="ia-wel-ill__art" sizes="340px" width={340} height={340} />
              {MINI_CARDS.map((c, i) => (
                <span key={i} className="ia-wel-mini" style={{ left: c.left, top: c.top, rotate: c.rotate, animationDelay: `${c.delay}ms` }}>
                  <Stars n={4} />
                  <span className="ia-wel-mini__line" />
                  <span className="ia-wel-mini__line ia-wel-mini__line--short" />
                </span>
              ))}
            </div>
          </div>
        );
      case 1:
        return (
          <Carousel
            label={t("Разборы отзывов")}
            intervalMs={7000}
            count={data.articles.length}
            reduced={reduced}
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
                        <b>{a.quote.rating} ★</b>
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
            render={(i) => (
              <div className={`ia-wel-ideas${ideaPages[i].length === 1 ? " ia-wel-ideas--single" : ""}`}>
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
      case 3:
        return (
          <div className="ia-wel-ill ia-wel-ill--library" role="img" aria-label={t("Разборы и идеи: интерьер, привычки, личные финансы")}>
            <span className="ia-wel-ill__blob" aria-hidden="true" />
            <div className={reduced ? undefined : "ia-wel-float"} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
              <Img image={data.art.library} className="ia-wel-ill__art" sizes="310px" width={310} height={310} />
              {CHIPS.map((c) => (
                <span key={c.key} className="ia-wel-chip" style={{ left: c.left, top: c.top, rotate: c.rotate, animationDelay: `${c.delay}ms` }}>
                  {t(c.key)}
                </span>
              ))}
            </div>
          </div>
        );
      default:
        return (
          <div className="ia-wel-plusart" aria-hidden="true">
            <Img image={data.art.research} className="ia-wel-plusart__left" sizes="160px" width={160} height={160} />
            <Img image={data.art.product} className="ia-wel-plusart__right" sizes="150px" width={150} height={150} />
            <Img image={data.art.library} className="ia-wel-plusart__center" sizes="290px" width={290} height={290} />
          </div>
        );
    }
  })();

  const isLast = step === STEPS - 1;

  return (
    <div className="ia-wel" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => {
        swipe.current = null;
      }}>
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

      <div className="ia-wel-stage">
        <div key={step} className="ia-wel-step" data-dir={dir === 0 ? undefined : String(dir)} data-testid={page.id}>
          <div className="ia-wel-visual">{visual}</div>
          <div className="ia-wel-copy">
            <h1 ref={titleRef} tabIndex={-1} className="ia-wel-title" data-first={step === 0 ? "" : undefined} aria-label={page.titleLabel}>
              {page.title}
            </h1>
            <p className="ia-wel-desc">{page.desc}</p>
          </div>
        </div>
      </div>

      <div className="ia-wel-footer">
        {!isLast ? (
          <>
            <button type="button" className="ia-btn ia-btn--welcome" onClick={() => go(1)} data-testid="onboarding-continue">
              {t("Дальше")}
              <ChevronRightIcon size={15} strokeWidth={2.6} aria-hidden="true" />
            </button>
            {/* Reserved row: keeps the button at the same height as on the Plus page. */}
            <span className="ia-wel-secondary" aria-hidden="true">
              {t("Остаться с бесплатным разбором")}
            </span>
          </>
        ) : unlocked ? (
          <>
            <Link href={routes.research(locale)} className="ia-btn ia-btn--welcome">
              {t("Открыть библиотеку")}
            </Link>
            <button type="button" className="ia-wel-secondary" onClick={close}>
              {t("Закрыть")}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ia-btn ia-btn--welcome" onClick={() => openPaywall({ source: "welcome" })} data-testid="paywall-cta">
              {t("Открыть Plus")}
            </button>
            <Link href={routes.topic(locale, FREE_TOPIC)} className="ia-wel-secondary" data-testid="paywall-free">
              {t("Остаться с бесплатным разбором")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
