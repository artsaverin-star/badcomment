"use client";

import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { format } from "@/site/i18n/strings";
import { ChevronLeftIcon, ChevronRightIcon } from "@/site/ui/icons";

// «Разборы отзывов» carousel (spec 08 S5, 03 §1.5/§1.8): native swipe paging (scroll-snap),
// autoplay every 7 s like the app, paused on hover, focus, pointer-down and hidden tabs, off
// under prefers-reduced-motion; arrows + dots + a pause control (web a11y additions).
// Slides are server-rendered and passed in as children — this island only moves the track.

export type CarouselLabels = {
  region: string;
  prev: string;
  next: string;
  pause: string;
  play: string;
  /** "Пример {i} из {n}" */
  slide: string;
};

const REDUCED = "(prefers-reduced-motion: reduce)";

function subscribeReduced(onChange: () => void) {
  const mq = window.matchMedia(REDUCED);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function Carousel({
  labels,
  interval = 7000,
  children,
}: {
  labels: CarouselLabels;
  interval?: number;
  children: ReactNode;
}) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const frame = useRef(0);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  // Server snapshot = reduced: the page ships paused and starts moving after hydration.
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
  const autoplay = !reduced && !userPaused;
  const running = autoplay && !hover && !focused && !touching;

  const goTo = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track || count === 0) return;
      const k = ((i % count) + count) % count;
      const slide = track.children[k] as HTMLElement | undefined;
      track.scrollTo({
        left: slide ? slide.offsetLeft : k * track.clientWidth,
        behavior: window.matchMedia(REDUCED).matches ? "auto" : "smooth",
      });
    },
    [count],
  );

  useEffect(() => {
    if (!running || count < 2) return;
    const id = window.setInterval(() => {
      if (!document.hidden) goTo(indexRef.current + 1);
    }, interval);
    return () => window.clearInterval(id);
  }, [running, interval, count, goTo]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      // The slide whose left edge is closest to the scroll position.
      let k = 0;
      let best = Infinity;
      Array.from(track.children).forEach((el, i) => {
        const d = Math.abs((el as HTMLElement).offsetLeft - track.scrollLeft);
        if (d < best) {
          best = d;
          k = i;
        }
      });
      if (k !== indexRef.current) {
        indexRef.current = k;
        setIndex(k);
      }
    });
  };

  return (
    <div
      className="ld-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== "mouse") setTouching(true);
      }}
      onPointerUp={() => setTouching(false)}
      onPointerCancel={() => setTouching(false)}
    >
      <div ref={trackRef} className="ld-carousel__track" onScroll={onScroll} aria-live={running ? "off" : "polite"}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="ld-carousel__slide"
            role="group"
            aria-roledescription="slide"
            aria-label={format(labels.slide, { i: i + 1, n: count })}
          >
            {slide}
          </div>
        ))}
      </div>
      {count > 1 ? (
        <div className="ld-carousel__controls">
          <button type="button" className="ld-carousel__arrow" aria-label={labels.prev} onClick={() => goTo(index - 1)}>
            <ChevronLeftIcon size={20} aria-hidden="true" />
          </button>
          <div className="ld-carousel__dots">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                className="ld-carousel__dot"
                aria-label={format(labels.slide, { i: i + 1, n: count })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <button type="button" className="ld-carousel__arrow" aria-label={labels.next} onClick={() => goTo(index + 1)}>
            <ChevronRightIcon size={20} aria-hidden="true" />
          </button>
          {reduced ? null : (
            <button
              type="button"
              className="ld-carousel__toggle"
              onClick={() => setUserPaused((p) => !p)}
            >
              {autoplay ? labels.pause : labels.play}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
