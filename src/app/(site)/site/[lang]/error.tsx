"use client";

import { useEffect } from "react";
import { ErrorView } from "@/site/shell/StatusViews";

// Error boundary for every new-site page (not the root layout itself). The app's failure
// state: «Не удалось открыть материалы» + «Повторить» (re-fetches and re-renders the segment).
export default function SiteError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return <ErrorView onRetry={() => unstable_retry()} />;
}
