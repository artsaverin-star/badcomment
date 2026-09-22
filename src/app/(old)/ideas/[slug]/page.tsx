import { permanentRedirect, notFound } from "next/navigation";
import { getIdea } from "@/lib/ideas";
import { getLocale } from "@/lib/i18n.server";
import { getOldSiteMode } from "@/lib/oldSite.server";
import { oldHref, publicHref } from "@/lib/oldHref";

export const dynamic = "force-dynamic";

// Retired: the standalone idea detail page is gone — ideas now live in a modal on
// the category page. Permanently redirect to the category (keeps old links / SEO
// alive instead of 404ing).
//
// Site v2: inside the hidden old site (/<L>/old/ideas/<id>) the redirect stays there.
// Served in place (/<L>/ideas/<id> for ids the new site does not have), a permanent
// redirect must target the public, indexable category URL, never a noindexed /old one
// (browsers and crawlers cache 308s).
export default async function IdeaRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const idea = getIdea(slug);
  if (!idea) notFound();
  const locale = await getLocale();
  const path = `/segment/${idea.category}`;
  permanentRedirect((await getOldSiteMode()) === "old" ? oldHref(locale, path) : publicHref(locale, path));
}
