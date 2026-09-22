"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { parsePublicPath, routes } from "../routing";

// The footer's «inApp Plus» and «Публичная оферта» items. Client islands so they follow
// client-side navigation (the footer lives in the root layout, which is not re-rendered
// between pages):
//   • both hidden on the Apple-facing /offer and /contacts (DECISIONS "Legal pages": no buy
//     UI and no website prices there — the payment offer names the 990 ₽ price); the payment
//     offer also stays off the landing (owner, 2026-09-23: no web prices on the landing);
//   • on the landing «inApp Plus» jumps to its own Plus section (spec 08 S13), not to the paywall.

const HIDDEN = new Set(["offer", "contacts"]);

export function FooterPlusLink({ locale }: { locale: Locale }) {
  const { segments } = parsePublicPath(usePathname());
  const [first] = segments;
  if (first && HIDDEN.has(first)) return null;
  return (
    <li>
      {first === undefined ? (
        <a href="#plus">inApp Plus</a>
      ) : (
        <Link href={routes.plus(locale, { source: "footer" })}>inApp Plus</Link>
      )}
    </li>
  );
}

/** The website's payment offer (/<L>/offer/payment; DECISIONS "Legal pages": footers link it). */
export function FooterPaymentOfferLink({ locale, label }: { locale: Locale; label: string }) {
  const [first] = parsePublicPath(usePathname()).segments;
  if (first === undefined || HIDDEN.has(first)) return null;
  return (
    <li>
      <Link href={`${routes.offer(locale)}/payment`}>{label}</Link>
    </li>
  );
}
