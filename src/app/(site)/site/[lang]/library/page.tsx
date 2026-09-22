import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { Badge } from "@/site/ui/Badge";
import { Heading } from "@/site/ui/Heading";

// TODO(plus): PLACEHOLDER for the payment-return page (YooKassa return URL
// /library?checkout=<uuid>, spec 06 §4.2): poll /api/pay/status, confirm Plus, fire the
// purchase event only after server confirmation (scripts/test-monetization.ts rules).

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function LibraryPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { checkout } = await searchParams;

  return (
    <div className="ia-page ia-page--library flex flex-col gap-6">
      <Heading title="inApp Plus" />
      <Badge tone="neutral">TODO · payment return placeholder{checkout ? ` · checkout=${checkout}` : ""}</Badge>
    </div>
  );
}
