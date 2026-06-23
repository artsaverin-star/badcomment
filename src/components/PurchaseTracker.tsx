"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackPurchase } from "@/lib/track";

const NAMES: Record<string, string> = {
  deck: "Колода идей",
  category: "Разбор категории",
  lifetime: "Lifetime",
  friend: "Друг проекта",
  pack: "Энергия",
};

// On the YooKassa return page (/library?bought=…), fire the GA4/Metrica purchase
// event once, then strip the params so a refresh can't double-count.
export default function PurchaseTracker() {
  const params = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    const bought = params.get("bought");
    if (!bought) return;
    const value = Number(params.get("v") || 0);
    const txn = params.get("t") || "";
    const t = setTimeout(() => {
      trackPurchase(txn || bought, { id: bought, name: NAMES[bought] || bought, price: value });
      router.replace("/library");
    }, 0);
    return () => clearTimeout(t);
  }, [params, router]);
  return null;
}
