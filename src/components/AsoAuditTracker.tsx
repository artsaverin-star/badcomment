"use client";

import { useEffect } from "react";
import { trackAsoAuditView } from "@/lib/track";

export default function AsoAuditTracker({ appId, niche, full, sample }: { appId: string; niche: string | null; full: boolean; sample: boolean }) {
  useEffect(() => {
    trackAsoAuditView(appId, niche, full, sample);
  }, [appId, niche, full, sample]);
  return null;
}
