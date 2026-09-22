import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldNavHref } from "@/lib/oldHref";
import { getOldSiteMode } from "@/lib/oldSite.server";

// /catalog was retired — the site has three surfaces only: home, /ideas, /rating.
// Keep this stub so any old/external links land on the homepage instead of 404: the public
// home (/<L>, the new site) when served in place, the archive home inside /<L>/old.
export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  redirect(oldNavHref(await getOldSiteMode(), await getLocale(), "/"));
}
