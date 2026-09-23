"use client";

import { useEffect, useState } from "react";

const MOTION_EVENT = "inapp:motion-change";
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function motionIsPaused(root: HTMLElement, reduced: boolean) {
  return reduced || root.dataset.motionPaused === "true";
}

/** Adds motion after hydration; all content remains usable without JavaScript. */
export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lx");
    if (!root || typeof window.matchMedia !== "function") return;

    const reduced = window.matchMedia(REDUCED_MOTION);
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const revealNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const tiltNodes = Array.from(root.querySelectorAll<HTMLElement>("[data-tilt]"));
    let stopEffects = () => {};

    const synchronize = () => {
      stopEffects();
      stopEffects = () => {};
      const paused = motionIsPaused(root, reduced.matches);
      root.dataset.motion = paused ? "off" : "on";
      if (paused) return;

      const cleanups: Array<() => void> = [];
      stopEffects = () => {
        root.classList.remove("lx-motion");
        cleanups.forEach((cleanup) => cleanup());
      };

      try {
        if ("IntersectionObserver" in window) {
          const observer = new IntersectionObserver(
            (entries) => {
              for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
              }
            },
            { threshold: 0, rootMargin: "0px 0px -32px 0px" },
          );
          cleanups.push(() => observer.disconnect());

          for (const node of revealNodes) {
            // Never hide content that was already visible before hydration.
            if (node.getBoundingClientRect().top < window.innerHeight) {
              node.classList.add("is-visible");
            }
            if (!node.classList.contains("is-visible")) observer.observe(node);
          }

          const revealFocusedContent = (event: FocusEvent) => {
            if (!(event.target instanceof Element)) return;
            let node = event.target.closest<HTMLElement>("[data-reveal]");
            while (node && root.contains(node)) {
              node.classList.add("is-visible");
              observer.unobserve(node);
              node = node.parentElement?.closest<HTMLElement>("[data-reveal]") ?? null;
            }
          };
          root.addEventListener("focusin", revealFocusedContent);
          cleanups.push(() => root.removeEventListener("focusin", revealFocusedContent));
          root.classList.add("lx-motion");
        }

        if (finePointer.matches) {
          for (const node of tiltNodes) {
            let frame = 0;
            let x = 0;
            let y = 0;
            const reset = () => {
              cancelAnimationFrame(frame);
              frame = 0;
              node.style.removeProperty("--pointer-x");
              node.style.removeProperty("--pointer-y");
            };
            const move = (event: PointerEvent) => {
              if (event.pointerType !== "mouse") return;
              const bounds = node.getBoundingClientRect();
              if (!bounds.width || !bounds.height) return;
              x = Math.max(-3, Math.min(3, ((event.clientX - bounds.left) / bounds.width - 0.5) * 6));
              y = Math.max(-3, Math.min(3, ((event.clientY - bounds.top) / bounds.height - 0.5) * -6));
              if (frame) return;
              frame = requestAnimationFrame(() => {
                node.style.setProperty("--pointer-x", `${x.toFixed(2)}deg`);
                node.style.setProperty("--pointer-y", `${y.toFixed(2)}deg`);
                frame = 0;
              });
            };
            node.addEventListener("pointermove", move, { passive: true });
            node.addEventListener("pointerleave", reset);
            node.addEventListener("pointercancel", reset);
            cleanups.push(() => {
              node.removeEventListener("pointermove", move);
              node.removeEventListener("pointerleave", reset);
              node.removeEventListener("pointercancel", reset);
              reset();
            });
          }
        }
      } catch {
        // A failed enhancement must never leave the page hidden.
        stopEffects();
        root.dataset.motion = "off";
      }
    };

    synchronize();
    reduced.addEventListener("change", synchronize);
    finePointer.addEventListener("change", synchronize);
    window.addEventListener(MOTION_EVENT, synchronize);

    return () => {
      reduced.removeEventListener("change", synchronize);
      finePointer.removeEventListener("change", synchronize);
      window.removeEventListener(MOTION_EVENT, synchronize);
      stopEffects();
    };
  }, []);

  return null;
}

export function MotionToggle({ labels, className = "lx-motion-toggle" }: {
  labels: { pause: string; resume: string; reduced: string };
  className?: string;
}) {
  const [preferences, setPreferences] = useState({ paused: false, reduced: false });

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".lx");
    if (!root || typeof window.matchMedia !== "function") return;
    const reduced = window.matchMedia(REDUCED_MOTION);
    const synchronize = () => {
      setPreferences({
        paused: motionIsPaused(root, reduced.matches),
        reduced: reduced.matches,
      });
    };
    const frame = requestAnimationFrame(synchronize);
    reduced.addEventListener("change", synchronize);
    window.addEventListener(MOTION_EVENT, synchronize);
    return () => {
      cancelAnimationFrame(frame);
      reduced.removeEventListener("change", synchronize);
      window.removeEventListener(MOTION_EVENT, synchronize);
    };
  }, []);

  const toggleMotion = () => {
    const root = document.querySelector<HTMLElement>(".lx");
    if (!root || preferences.reduced) return;
    const paused = root.dataset.motionPaused !== "true";
    root.dataset.motionPaused = String(paused);
    root.dataset.motion = paused ? "off" : "on";
    setPreferences({ paused, reduced: false });
    window.dispatchEvent(new Event(MOTION_EVENT));
  };

  const label = preferences.paused ? labels.resume : labels.pause;

  return (
    <button
      type="button"
      className={className}
      onClick={toggleMotion}
      aria-pressed={preferences.paused}
      disabled={preferences.reduced}
      title={preferences.reduced ? labels.reduced : label}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
        {preferences.paused ? <path d="M4 2.5 11 7l-7 4.5z" /> : <path d="M3 2h3v10H3zm5 0h3v10H8z" />}
      </svg>
      <span>{label}</span>
    </button>
  );
}
