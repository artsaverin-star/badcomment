"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Bottom-floating control bar, rendered into <body> through a portal. Any
// ancestor with a transform or filter (route transitions, card animations)
// turns position:fixed into "glued to the page bottom" — the portal takes the
// bar out of that subtree for good, so it always pins to the viewport.
export default function FloatingBar({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  if (!ready) return null;
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+28px)] z-40 flex justify-center px-4">
      {children}
    </div>,
    document.body,
  );
}
