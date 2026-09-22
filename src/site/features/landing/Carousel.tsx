"use client";

import { Children, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { format } from "@/site/i18n/strings";
import { ChevronLeftIcon, ChevronRightIcon } from "@/site/ui/icons";

// «Разборы отзывов» carousel (spec 08 S5, 03 §1.5/§1.8): native swipe paging (scroll-snap),
// autoplay every 7 s like the app, paused on hover, focus, pointer-down and hidden tabs, off
// under prefers-reduced-motion; arrows + dots + a pause control (web a11y additions).
// Like ClarityWelcomeCarousel.swift, the first slide is repeated at the end: the cycle wraps
// forward onto the copy and snaps back to the real first slide without rewinding across every
// slide, and the timer is re-armed on every page change (a swipe gets a full interval).
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
  const loop = count > 1;
  const trackRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const frame = useRef(0);
  const settle = useRef(0);
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [wake, setWake] = useState(0);
  // Server snapshot = reduced: the page ships paused and starts moving after hydration.
  const reduced = useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
  const autoplay = !reduced && !userPaused;
  const running = autoplay && !hover && !focused && !touching;

  /** Scroll to a slot (0…count, where `count` is the copy of slide 1). */
  const scrollToSlot = useCallback((slot: number, smooth: boolean) => {
    const track = trackRef.current;
    const el = track?.children[slot] as HTMLElement | undefined;
    if (!track) return;
    track.scrollTo({
      left: el ? el.offsetLeft : slot * track.clientWidth,
      behavior: smooth && !window.matchMedia(REDUCED).matches ? "smooth" : "auto",
    });
  }, []);

  const goTo = useCallback(
    (i: number) => {
      if (count === 0) return;
      if (loop && i >= count) {
        scrollToSlot(count, true); // onto the copy of slide 1; settles back to the real one
      } else if (loop && i < 0) {
        scrollToSlot(count, false); // from the copy, step back to the last slide
        requestAnimationFrame(() => scrollToSlot(count - 1, true));
      } else {
        scrollToSlot(Math.max(0, Math.min(count - 1, i)), true);
      }
    },
    [count, loop, scrollToSlot],
  );

  // One timeout per page: re-armed whenever the page changes or the pause state does.
  useEffect(() => {
    if (!running || !loop) return;
    const id = window.setTimeout(() => {
      if (document.hidden) setWake((n) => n + 1);
      else goTo(indexRef.current + 1);
    }, interval);
    return () => window.clearTimeout(id);
  }, [running, loop, interval, goTo, index, wake]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      window.clearTimeout(settle.current);
    },
    [],
  );

  const onScroll = () => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const track = trackRef.current;
      if (!track || !track.clientWidth) return;
      // The slot whose left edge is closest to the scroll position; the copy counts as slide 1.
      let k = 0;
      let best = Infinity;
      Array.from(track.children).forEach((el, i) => {
        const d = Math.abs((el as HTMLElement).offsetLeft - track.scrollLeft);
        if (d < best) {
          best = d;
          k = i;
        }
      });
      const real = loop && k >= count ? 0 : k;
      if (real !== indexRef.current) {
        indexRef.current = real;
        setIndex(real);
      }
    });
    // Once the scroll has settled on the copy, jump to the real first slide (same picture).
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const track = trackRef.current;
      const copy = track?.children[count] as HTMLElement | undefined;
      if (loop && track && copy && Math.abs(track.scrollLeft - copy.offsetLeft) < 2) scrollToSlot(0, false);
    }, 140);
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
        {loop ? (
          <div className="ld-carousel__slide" aria-hidden="true" inert>
            {slides[0]}
          </div>
        ) : null}
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
