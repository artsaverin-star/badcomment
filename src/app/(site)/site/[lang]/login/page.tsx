import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/site/i18n/locales";
import { isSafeReturnPath } from "@/site/routing";
import { Badge } from "@/site/ui/Badge";
import { Heading } from "@/site/ui/Heading";

// TODO(auth): PLACEHOLDER for the sign-in page (ARCHITECTURE §4, spec 06 §3.6): Telegram,
// Google (return_to), email magic link, in the app's «ты» voice. The same UI opens as a
// dialog anywhere via openSignIn() once the auth feature calls registerSignInHandler().

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function LoginPlaceholder({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ return_to?: string; reason?: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const { return_to, reason } = await searchParams;
  const returnTo = isSafeReturnPath(return_to) ? return_to : `/${lang}`;

  return (
    <div className="ia-page ia-page--welcome flex flex-col gap-6 pt-12">
      <Heading title="inApp" />
      <Badge tone="neutral">
        TODO · sign-in placeholder · return_to={returnTo}
        {reason ? ` · reason=${reason}` : ""}
      </Badge>
    </div>
  );
}
