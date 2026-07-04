import { NextResponse } from "next/server";
import { getAccess } from "@/lib/access";
import { ownsDeck } from "@/lib/unlocks";
import { getIdea } from "@/lib/ideas";
import { ideaContentEn } from "@/lib/regenCards";

export const dynamic = "force-dynamic";

// The paid body of an idea (gap, pitch, features, monetization, quotes),
// fetched by the deck modal on open. The homepage ships owners bare previews —
// embedding the full depth of 400+ ideas made the page weigh megabytes — so
// this endpoint returns one idea's depth after re-checking access server-side.
export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const idea = getIdea(slug);
  if (!idea) return NextResponse.json({ error: "not found" }, { status: 404 });

  const access = await getAccess();
  const allowed =
    access.unlimited ||
    access.has("idea", slug) ||
    access.has("category", idea.category) ||
    access.has("chapter", idea.category) ||
    (access.user ? await ownsDeck(access.user.id) : false);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const locale = new URL(req.url).searchParams.get("l") === "en" ? ("en" as const) : ("ru" as const);
  const en = locale === "en" ? ideaContentEn(slug, locale) : null;

  return NextResponse.json({
    gap: en?.gap ?? idea.gap,
    pitch: en?.pitch ?? idea.idea?.pitch,
    features: en?.features ?? idea.idea?.features,
    antiFeatures: en?.antiFeatures ?? idea.idea?.antiFeatures,
    monetization: en?.monetization ?? idea.idea?.monetization,
    reviewGrid: idea.reviewGrid.map((q) => ({ ...q, quote: locale === "ru" && q.quoteRu ? q.quoteRu : q.quote })),
  });
}
