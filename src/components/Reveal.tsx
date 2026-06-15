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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${className} ${shown ? "reveal-in" : "reveal-init"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
