import { redirect } from "next/navigation";
import { getLocale } from "@/lib/i18n.server";
import { oldNavHref } from "@/lib/oldHref";
import { getOldSiteMode } from "@/lib/oldSite.server";

// v2 was the experiment; its design is now the canonical category page.
// Site v2: the proxy already 308s /<L>/segment/<launch topic>/v2 to the new topic page, so
// in place this stub only sees topics that keep their old page (→ that page, in place).
export const dynamic = "force-dynamic";

export default async function SegmentV2Redirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(oldNavHref(await getOldSiteMode(), await getLocale(), `/segment/${slug}`));
}
