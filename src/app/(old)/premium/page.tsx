import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldHref } from "@/lib/oldHref";

export const dynamic = "force-dynamic";

// Premium is retired in favour of the token model — keep the old URL working.
export default async function PremiumPage() {
  redirect(oldHref(await getLocale(), "/tokens"));
}
