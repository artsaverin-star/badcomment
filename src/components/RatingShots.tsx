"use client";

import { useEffect, useRef, useState } from "react";

// A horizontal strip of app screenshots that mounts its images only when the
// row nears the viewport (so a 100-app page does not load hundreds of images at
// once). Until then it reserves height with skeletons, then the shots fade and
// rise in with a small per-shot stagger. Phone shots are portrait, tablet shots
// are wider; object-contain keeps both uncropped at a fixed height.
export default function RatingShots({ shots, title }: { shots: string[]; title: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setShow(true); return; }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="mt-5 -mx-4 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      <div className="flex w-max gap-2.5">
        {shots.map((src, i) =>
          show ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt={`${title} ${i + 1}`}
              loading="lazy"
              decoding="async"
              className="rating-shot h-[290px] w-auto shrink-0 rounded-[16px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-muted)] object-contain"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ) : (
            <div
              key={i}
              className="h-[290px] w-[163px] shrink-0 rounded-[16px] bg-[var(--color-bg-muted)]"
            />
          ),
        )}
      </div>
    </div>
  );
}
