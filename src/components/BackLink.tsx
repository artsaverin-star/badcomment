"use client";

import { useRouter } from "next/navigation";

// "Back" must return to where the user actually came from (e.g. the segment that
// listed this app), not to a fixed URL. A plain <Link href="/"> always dumped
// people on the segment index and dropped the ?seg context. Fall back to the
// given href only when there's no in-app history to pop (direct load / share).
export default function BackLink({
  fallback,
  className,
  children,
}: {
  fallback: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
    >
      {children}
    </button>
  );
}
