import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldHref } from "@/lib/oldHref";

// /catalog was retired — the site has three surfaces only: home, /ideas, /rating.
// Keep this stub so any old/external links land on the (old) homepage instead of 404.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  redirect(oldHref(await getLocale(), "/"));
}
