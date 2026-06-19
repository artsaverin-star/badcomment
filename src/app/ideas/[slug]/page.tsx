import { permanentRedirect, notFound } from "next/navigation";
import { getIdea } from "@/lib/ideas";

export const dynamic = "force-dynamic";

// Retired: the standalone idea detail page is gone — ideas now live in a modal on
// the category page. Permanently redirect to the category (keeps old links / SEO
// alive instead of 404ing).
export default async function IdeaRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const idea = getIdea(slug);
  if (!idea) notFound();
  permanentRedirect(`/segment/${idea.category}`);
}
