import { permanentRedirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

// The builder's home now lives right on the site root — this old section URL
// forwards there for good (bookmarks, old links, search results).
export default async function BuildRedirect() {
  const locale = await getLocale();
  permanentRedirect(locale !== "en" ? "/ru" : "/en");
}
