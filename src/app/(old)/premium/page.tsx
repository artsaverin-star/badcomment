import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldNavHref } from "@/lib/oldHref";
import { getOldSiteMode } from "@/lib/oldSite.server";

export const dynamic = "force-dynamic";

// Premium is retired in favour of the token model — keep the old URL working.
export default async function PremiumPage() {
  redirect(oldNavHref(await getOldSiteMode(), await getLocale(), "/tokens"));
}
