"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-reveal: fades/slides its children up the first time they enter the
// viewport (Mobbin-style). Uses IntersectionObserver, animates once.
export default function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      // Pre-reveal: extend the root's bottom 22% past the viewport so content
      // begins fading in just before it scrolls into view — never sits blank.
      { threshold: 0, rootMargin: "0px 0px 22% 0px" },
    );
    io.observe(el);
    // Safety net: if the observer never fires (very tall sections, edge cases),
    // reveal anyway so content can't stay invisible.
    const t = window.setTimeout(() => setShown(true), 1500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <div ref={ref} className={`${className} ${shown ? "reveal-in" : "reveal-init"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
