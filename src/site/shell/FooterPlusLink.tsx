"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "../i18n/locales";
import { parsePublicPath, routes } from "../routing";

// The footer's «inApp Plus» item. A client island so it follows client-side navigation (the
// footer lives in the root layout, which is not re-rendered between pages):
//   • hidden on the Apple-facing /offer and /contacts (DECISIONS "Legal pages": no buy UI);
//   • on the landing it jumps to its own Plus section (spec 08 S13), not to the paywall.

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
